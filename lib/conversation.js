/* @flow */

import { chain, map, pipe, reverse, uniq, uniqBy } from 'ramda'
import { derive }                                  from './derivedActivity'
import { activityId
       , mailtoUri
       , midUri
       , midPartUri
       , parseMidUri
       , resolveUri
       , title
       } from './activity'
import { displayName
       , parseList
       , queryThreads
       } from './notmuch'

import type { DerivedZack }    from './derivedActivity'
import type { Activity, Zack } from './activity'
import type { Address
            , MailingList
            , Message
            , Thread
            , ThreadId
            } from './notmuch'

export {
  allNames,
  flatParticipants,
  participants,
  queryConversations,
}

export type Conversation = {
  id:            ThreadId,
  list:          ?MailingList,
  activities:    DerivedZack[],
  allActivities: Zack[],
  subject?:      string,
}

function participants(conv: Conversation): { to: Address[], from: Address[], cc: Address[] } {
  var { to, from, cc } = conv.allActivities.reduce((ls, [activity, message]) => ({
    to:   ls.to.concat(message.to),
    from: ls.from.concat(message.from),
    cc:   ls.cc.concat(message.cc || []),
  }), { to: [], from: [], cc: [] })
  return {
    to:   uniqBy(addr => addr.address, to),
    from: uniqBy(addr => addr.address, from),
    cc:   uniqBy(addr => addr.address, cc)
  }
}

function flatParticipants(conv: Conversation): Address[] {
  var { from, to, cc } = participants(conv)
  return uniqBy(
    addr => addr.address,
    reverse(from).concat(reverse(to)).concat(reverse(cc))
  )
}

function allNames(conv: Conversation): string[] {
  return flatParticipants(conv).map(displayName)
}

function queryConversations(q: string): Promise<Conversation[]> {
  return queryThreads(q).then(ts => ts.map(threadToConversation))
}

function threadToConversation({ id, messages }: Thread): Conversation {
  var activities: Zack[] = chain(asActivities, messages)
  return {
    id,
    list:          messages.map(parseList).filter(l => !!l)[0],
    activities:    derive(activities),
    allActivities: activities,
    subject:       title(activities[0]),
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

