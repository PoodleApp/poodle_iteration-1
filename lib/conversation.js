/* @flow */

import { List }              from 'immutable'
import { derive, published } from './derivedActivity'
import { mailtoUri
       , midUri
       , midPartUri
       , parseMidUri
       , resolveUri
       , title
       } from './activity'
import * as Act from './activity'
import { displayName
       , parseList
       , queryThreads
       } from './notmuch'

import type { Moment }          from 'moment'
import type { DerivedActivity } from './derivedActivity'
import type { Activity, Zack }  from './activity'
import type { Address
            , MailingList
            , Message
            , Thread
            , ThreadId
            } from './notmuch'

export {
  allNames,
  flatParticipants,
  lastActive,
  participants,
  queryConversations,
}

export type Conversation = {
  id:            ThreadId,
  list:          ?MailingList,
  activities:    List<DerivedActivity>,
  allActivities: List<Zack>,
  subject?:      string,
}

function lastActive(conv: Conversation): Moment {
  return conv.activities.map(published).sort().first()
  // TODO: How well does sorting Moment values work?
}

function allNames(conv: Conversation): string[] {
  return flatParticipants(conv).map(displayName)
}

function queryConversations(q: string): Promise<List<Conversation>> {
  return queryThreads(q).then(ts => List(ts.map(threadToConversation)))
}

function threadToConversation({ id, messages }: Thread): Conversation {
  var activities: List<Zack> = List(messages).flatMap(asActivities)
  return {
    id,
    list:          messages.map(parseList).filter(l => !!l)[0],
    activities:    derive(activities),
    allActivities: activities,
    subject:       title(activities.first()),
  }
}

function asActivities(message: Message): List<Zack> {
  var activities: Zack[] = (message.attachments || []).filter(a => (
    a.contentType === 'application/activity+json'
  ))
  .map(attachment => {
    var activity = JSON.parse(attachment.content.toString('utf8'))
    // TODO: set ID when deriving to avoid mutating original activity
    activity.id = activity.id || midPartUri(attachment, message)
    return [activity, message]
  })
  if (activities.length > 0) {
    return List(activities)
  }
  else {
    var note = asNote(message)
    return List(note ? [note] : [unknownActivity(message)])
  }
}

// TODO: Should the synthetic note and unknown activities be derived activities?
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

function participants(conv: Conversation) {
  return Act.participants(conv.allActivities)
}

function flatParticipants(conv: Conversation) {
  return Act.flatParticipants(conv.allActivities)
}
