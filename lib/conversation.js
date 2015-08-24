/* @flow */

import { List }      from 'immutable'
import { catMaybes } from './maybe'
import { collapseEdits
       , collapseLikes
       , getMessage
       , insertJoins
       , published
       , title
       } from './derivedActivity'
import { collapseAsides } from './derive/aside'
import { mailtoUri
       , midUri
       , midPartUri
       , parseMidUri
       , resolveUri
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
  activities:    List<DerivedActivity>,
  allActivities: List<DerivedActivity>,
  subject?:      string,
}

function lastActive(conv: Conversation): Moment {
  return conv.activities.map(published).sort().first()
  // TODO: How well does sorting Moment values work?
}

function allNames(conv: Conversation): string[] {
  return flatParticipants(conv).map(displayName)
}

function queryConversations(cmd: string, q: string): Promise<List<Conversation>> {
  return queryThreads(cmd, q).then(ts => List(ts.map(threadToConversation)))
}

function threadToConversation({ id, thread }: { id: ThreadId, thread: Thread }): Conversation {
  var activities = collapseAsides(thread)
  return {
    id,
    activities:    derive(activities),
    allActivities: activities,
    subject:       title(activities.first()) || '[no subject]',
  }
}

function derive(activities: List<DerivedActivity>): List<DerivedActivity> {
  var context = activities.sortBy(published)
  var withJoins = activities
    .flatMap(insertJoins.bind(null, context))
  var collapsed = withJoins
    .flatMap(collapseLikes.bind(null, context))
    .flatMap(collapseEdits.bind(null, context))
  return collapsed.map(act => {
    if (act.aside) {
      return act.set('aside', derive(act.aside))
    }
    else {
      return act
    }
  })
}

function participants(conv: Conversation | DerivedActivity): { to: Address[], from: Address[], cc: Address[] } {
  var acts = conv.allActivities || List()
  return Act.participants(catMaybes(acts.map(getMessage)))
}

function flatParticipants(conv: Conversation | DerivedActivity): Address[] {
  var acts = conv.allActivities || List()
  return Act.flatParticipants(catMaybes(acts.map(getMessage)))
}
