/* @flow */

import moment from 'moment'
import { flatParts
       , textParts
       , htmlParts
       } from './notmuch'

import type { Moment } from 'moment'
import type { Attachment
            , Email
            , Message
            , MessageId
            } from './notmuch'

export {
  activityId,
  mailtoUri,
  midUri,
  midPartUri,
  objectContent,
  parseMidUri,
  published,
  resolveUri,
  title,
}

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

export type Zack = [Activity, Message]

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

  return flatParts(msg).filter(part => part['content-id'] === partId).map(part => ({
    content:     new Buffer(typeof part.content === 'string' ? part.content : '', 'utf8'),
    contentType: part['content-type'],
  }))
}
