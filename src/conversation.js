/* @flow */

import { List, Record, Set, is } from 'immutable'
import { catMaybes }             from './maybe'
import { collapseEdits
       , collapseLikes
       , getMessage
       , insertJoins
       , published
       , syntheticId
       , title
       } from './derivedActivity'
import { aside, collapseAsides } from './derive/aside'
import { mailtoUri } from './activity'
import { midUri
       , midPartUri
       , parseMidUri
       , resolveUri
       }               from './models/message'
import * as Act        from './activity'
import { displayName } from './models/address'

import type { Moment }          from 'moment'
import type { DerivedActivity } from './derivedActivity'
import type { Activity, Zack }  from './activity'
import type { Address }         from './models/address'
import type { Message }         from './models/message'
import type { Thread }          from './models/thread'

export {
  allNames,
  asideToConversation,
  flatAsides,
  flatParticipants,
  lastActive,
  participants,
  threadToConversation,
}

export type Conversation = Record & {
  id:            string,
  activities:    List<DerivedActivity>,
  allActivities: List<DerivedActivity>,
  subject?:      string,
}

var ConversationRecord = Record({
  id:            null,
  activities:    null,
  allActivities: null,
  subject:       null,
})

function asideToConversation(activity: DerivedActivity): Conversation {
  if (activity.verb !== 'aside') {
    throw 'Cannot convert non-aside activity to conversation'
  }
  return new ConversationRecord({
    id: syntheticId(),
    activities: activity.aside,
    allActivities: activity.allActivities,
    subject: 'private aside',
  })
}

function lastActive(conv: Conversation): Moment {
  return conv.activities.map(published).sort().first()
  // TODO: How well does sorting Moment values work?
}

function allNames(conv: Conversation): string[] {
  return flatParticipants(conv).map(displayName)
}

function threadToConversation(thread: Thread): Conversation {
  const [{ messageId }, _] = thread.first()
  const activities = collapseAsides(thread)
  const conv = new ConversationRecord({
    id:            messageId,
    activities:    derive(activities),
    allActivities: activities,
    subject:       title(activities.first()) || '[no subject]',
  })
  return flatAsides(conv)
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

function participants(conv: Conversation): { to: Address[], from: Address[], cc: Address[] } {
  var acts = conv.allActivities || List()
  return Act.participants(catMaybes(acts.map(getMessage)))
}

function flatParticipants(conv: Conversation): Address[] {
  var acts = conv.allActivities || List()
  return Act.flatParticipants(catMaybes(acts.map(getMessage)))
}

type FlatActivity = {
  activity:     DerivedActivity,
  conversation: Conversation,
  asideId:      AsideId,
}

type AsideId = Set<String>

function flatAsides(conv: Conversation): Conversation {
  var activities = conv.activities.flatMap(flatHelper.bind(null, Set(), conv)).sortBy(act => (
    published(act.activity)
  ))
  // Combine adjacent activities with same asideId into groups
  .reduce((groups, act) => {
    var group = groups.last() || null
    var lastAsideId = group ? group.first().asideId : null
    if (group && is(lastAsideId, act.asideId)) {
      return groups.butLast().push(group.push(act))
    }
    else {
      return groups.push(List.of(act))
    }
  }, List())
  .flatMap(group => {
    var asideId = group.first().asideId
    if (asideId.size === 0) {
      return group.map(a => a.activity)
    }
    else {
      var conv = group.first().conversation
      return List.of(aside(group.map(a => a.activity), conv.allActivities))
    }
  })
  return conv.set('activities', activities)
}

function flatHelper(asideId: AsideId, conversation: Conversation, activity: DerivedActivity): List<FlatActivity> {
  if (activity.verb === 'aside') {
    var conv = asideToConversation(activity)
    var id = Set(flatParticipants(conv).map(addr => addr.address))
    return activity.aside.flatMap(flatHelper.bind(null, id, conv))
  }
  else {
    return List.of({ asideId, activity, conversation })
  }
}
