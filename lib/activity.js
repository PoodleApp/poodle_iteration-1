/* @flow */

import moment                  from 'moment'
import { chain, uniq, uniqBy } from 'ramda'
import { displayName
       , parseList
       , queryThreads
       , textParts
       , htmlParts
       } from './notmuch'

import type { Moment } from 'moment'
import type { Address
            , Attachment
            , Email
            , MailingList
            , Message
            , MessageId
            , Thread
            , ThreadId
            } from './notmuch'

export type URI = string
type IRI = string  // RFC3987
type ISO8601 = string  // datetime string

export type Activity = {
  id: URI,
  // actor?:      ActivityObject,
  // published?:  ISO8601,
  // content?:   string,
  // generator?: ActivityObject,
  // icon?:      MediaLink,
  object?:    ActivityObject,
  // provider?:  ActivityObject,
  target?:    ActivityObject,
  title?:     string,
  updated?:   ISO8601,
  // url?:       IRI,  // link to HTML representation
  verb:      Verb,
}

export type ActivityObject = {
  // attachments?:          ContentObject[],
  author?:               ActivityObject,
  content?:              string,
  displayName?:          string,
  // downstreamDuplicates?: IRI[],
  image?:                MediaLink,
  objectType?:           string,
  published?:            ISO8601,
  summary?:              string,
  // updated?:              ISO8601,
  // upstreamDuplicates?:   IRI[],
  uri?:                  URI,
}

export type Verb = 'post' | 'reply' | 'share' | 'edit' | 'like' | 'unknown'

export type MediaLink = {
  url:       IRI,
  duration?: number,
  height?:   number,
  width?:    number,
}

// export type Collection = {
//   totalItems?: number,
//   items?:      ActivityObject[],
//   url?:        IRI,  // link to JSON document containing full listing of objects in collection
// }

// export type ActivityStream = {
//   totalItems?: number,
//   items:       Activity[],
//   url?:        IRI,  // link to JSON document containing full listing of objects in collection
// }

export type Conversation = {
  id:         ThreadId,
  list:       ?MailingList,
  activities: Zack[],
  subject?:   string,
}

export type Zack = [Activity, Message]

export {
  activityId,
  asActivities,
  mailtoUri,
  messages,
  midUri,
  objectContent,
  parseMidUri,
  participants,
  published,
  queryConversations,
  resolveUri,
}


function queryConversations(q: string): Promise<Conversation[]> {
  return queryThreads(q).then(ts => ts.map(threadToConversation))
}

function threadToConversation({ id, messages }: Thread): Conversation {
  var activities: Zack[] = chain(asActivities, messages)
  return {
    id,
    list: messages.map(parseList).filter(l => !!l)[0],
    activities,
    subject: title(activities[0]),
  }
}

function asActivities(message: Message): Zack[] {
  var activities: Zack[] = (message.attachments || []).filter(a => (
    a.contentType === 'application/activity+json'
  ))
  .map(attachment => {
    var activity = JSON.parse(attachment.content.toString('utf8'))
    activity.id = activity.id || midPartUri(attachment, message)
    return [activity, message]
  })
  if (activities.length > 0) {
    return activities
  }
  else {
    var note = asNote(message)
    return note ? [note] : [unknownActivity(message)]
  }
}

function asNote(msg: Message): ?Zack {
  var from = msg.from[0]
  var author = {
    objectType: 'person',
    displayName: displayName(from),
    id: mailtoUri(from.address),
  }
  // var part = contentPart(msg)
  if (msg.text || msg.html) {
    var activity = {
      id: midUri(msg),
      title: msg.subject,
      verb: 'post',
      object: {
        objectType: 'note',
        author,
        uri: midUri(msg),
      }
    }
    return [activity, msg]
  }
}

function unknownActivity(msg: Message): Zack {
  var activity = {
    id: midUri(msg),
    title: msg.subject,
    verb: 'unknown',
  }
  return [activity, msg]
}

function midUri(message: Message): URI {
  return `mid:${message.messageId}`
}

function midPartUri(part: Attachment, message: Message): URI {
  return `${midUri(message)}/${part.contentId}`
}

var midExp = /(mid:|cid:)([^/]+)(?:\/(.+))?$/

function parseMidUri(uri: URI): ?{ scheme: string, messageId: ?MessageId, partId: ?string } {
  var matches = uri.match(midExp)
  if (matches) {
    var scheme    = matches[1]
    var messageId = scheme === 'mid:' ? matches[2] : undefined
    var partId    = scheme === 'cid:' ? matches[2] : matches[3]
    return { scheme, messageId, partId }
  }
}

function resolveUri(msg: Message, uri: URI): URI {
  var parsed = parseMidUri(uri)
  if (parsed && parsed.scheme === 'cid:' && parsed.partId) {
    return `mid:${msg.messageId}/${parsed.partId}`
  }
  else {
    return uri
  }
}

function mailtoUri(email: Email): URI {
  // TODO: Should we normalize? Maybe lowercase?
  return `mailto:${email}`
}

function published([_, msg]: Zack): Moment {
  return moment(msg.date || msg.receivedDate)
}

function messages(conv: Conversation): Message[] {
  return uniq(conv.activities.map(([_, msg]) => msg))
}

function title([act, msg]: Zack): string {
  return act.title || msg.subject
}

function activityId([act, msg]: Zack): URI {
  return resolveUri(msg, act.id)
}

function objectContent([act, msg]: Zack): { contentType: string, content: Buffer }[] {
  var { object } = act
  if (!object) { return [] }
  var { uri } = object
  if (!uri) { return [] }

  var parsed = parseMidUri(resolveUri(msg, uri))  // TODO: handle schemes other than mid:
  if (!parsed) { return [] }

  var { partId } = parsed
  if (!partId) {  // URI refers to entire message
    return [
      { contentType: 'text/plain', content: msg.text },
      { contentType: 'text/html',  content: msg.html }
    ]
    .filter(c => !!c.content)
    .map(({ contentType, content }) => ({ contentType, content: new Buffer((content:any)) }))
  }

  return (msg.attachments || []).filter(a => a.contentId === partId).map(a => ({
    content:     a.content,
    contentType: a.contentType,
  }))
}

function participants(conv: Conversation): { to: Address[], from: Address[], cc: Address[] } {
  var { to, from, cc } = conv.activities.reduce((ls, [activity, message]) => ({
    to: ls.to.concat(message.to),
    from: ls.from.concat(message.from),
    cc: ls.cc.concat(message.cc || []),
  }), { to: [], from: [], cc: [] })
  return {
    to:   uniqBy(addr => addr.address, to),
    from: uniqBy(addr => addr.address, from),
    cc:   uniqBy(addr => addr.address, cc)
  }
}
