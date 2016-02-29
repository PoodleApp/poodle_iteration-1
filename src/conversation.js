/* @flow */

import { List, Map, Set, is } from 'immutable'
import * as m                 from 'mori'
import { set }                from 'safety-lens'
import { prop }               from 'safety-lens/es2015'
import { catMaybes }          from './util/maybe'
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
import * as Act      from './activity'
import { midUri
       , midPartUri
       , parseMidUri
       , resolveUri
       }               from './models/message'
import { displayName } from './models/address'
import { foldrThread } from './models/thread'
import { constructor } from './util/record'

import type { Seq, Seqable }       from 'mori'
import type { Moment }             from 'moment'
import type { DerivedActivity }    from './derivedActivity'
import type { Activity, Zack }     from './activity'
import type { Address }            from './models/address'
import type { Message, MessageId } from './models/message'
import type { Thread }             from './models/thread'
import type { Constructor }        from './util/record'

export {
  allNames,
  asideToConversation,
  flatAsides,
  flatParticipants,
  lastActive,
  participants,
  threadToConversation,
}

export type Conversation = {
  id:            string,
  activities:    Seqable<DerivedActivity>,
  allActivities: Seqable<DerivedActivity>,
  subject:       ?string,
}

const newConversation: Constructor<*,Conversation> = constructor({
  activities:    m.list(),
  allActivities: m.list(),
})

function asideToConversation(activity: DerivedActivity): Conversation {
  if (activity.verb !== 'aside') {
    throw 'Cannot convert non-aside activity to conversation'
  }
  return newConversation({
    id: syntheticId(),
    activities: activity.aside || m.list(),
    allActivities: activity.allActivities || m.list(),
    subject: 'private aside',
  })
}

function lastActive(conv: Conversation): Moment {
  return m.first(m.sort(m.map(published, conv.activities)))
  // TODO: How well does sorting Moment values work?
}

function allNames(conv: Conversation): Seq<string> {
  return m.map(displayName, flatParticipants(conv))
}

function threadToConversation(thread: Thread): Promise<Conversation> {
  return getActivities(thread).then(activityMap => {
    const first = thread.first()
    if (!first) { throw "thread may not be empty" }
    const [{ messageId }, _] = first
    const activities = collapseAsides(thread, activityMap)
    const firstActivity = activities.first()
    if (!firstActivity) { throw "no activities found in thread" }
    const conv = newConversation({
      id:            messageId,
      activities:    derive(activities),
      allActivities: activities,
      subject:       title(firstActivity) || '[no subject]',
    })
    return flatAsides(conv)
  })
}

function getActivities(thread: Thread): Promise<Map<MessageId, List<Activity>>> {
  const activityPromises: List<Promise<[MessageId, List<Activity>]>> = foldrThread((as, msg) => (
    as.push(
      Act.getActivities(msg).then(acts => [msg.messageId, acts])
    )
  ), List(), thread)
  return Promise.all(activityPromises.toArray()).then(
    pairs => pairs.reduce((map, [id, acts]) => map.set(id, acts), Map())
  )
}

function derive(activities: Seq<DerivedActivity>): Seq<DerivedActivity> {
  const context = m.sortBy(published, activities)
  const withJoins = m.mapcat(insertJoins.bind(null, context), activities)
  const collapsed = m.pipeline(
    withJoins,
    acts => m.mapcat(collapseLikes.bind(null, context), acts),
    acts => m.mapcat(collapseEdits.bind(null, context), acts)
  )
  return m.map(act => {
    const aside = act.aside
    if (aside) {
      return set(prop('aside'), derive(aside), act)
    }
    else {
      return act
    }
  }
  , collapsed)
}

function participants(conv: Conversation): { to:   Seq<Address>
                                           , from: Seq<Address>
                                           , cc:   Seq<Address>
                                           } {
  const acts = conv.allActivities || List()
  return Act.participants(catMaybes(acts.map(getMessage)))
}

function flatParticipants(conv: Conversation): Seq<Address> {
  const acts = conv.allActivities || List()
  return Act.flatParticipants(catMaybes(acts.map(getMessage)))
}

type FlatActivity = {
  activity:     DerivedActivity,
  conversation: Conversation,
  asideId:      AsideId,
}

type AsideId = Set<string>

function flatAsides(conv: Conversation): Conversation {
  const activities = conv.activities.flatMap(flatHelper.bind(null, Set(), conv)).sortBy(act => (
    published(act.activity)
  ))
  // Combine adjacent activities with same asideId into groups
  .reduce((groups, act) => {
    const group = groups.last()
    const lastAsideId = group ? group.first().asideId : null
    if (group && is(lastAsideId, act.asideId)) {
      return groups.butLast().push(group.push(act))
    }
    else {
      return groups.push(List.of(act))
    }
  }, List())
  .flatMap(group => {
    const asideId = group.first().asideId
    if (asideId.size === 0) {
      return group.map(a => a.activity)
    }
    else {
      const conv = group.first().conversation
      return List.of(aside(group.map(a => a.activity), conv.allActivities))
    }
  })
  return set(prop('activities'), activities, conv)
}

function flatHelper(asideId: AsideId, conversation: Conversation, activity: DerivedActivity): List<FlatActivity> {
  const { aside, verb } = activity
  if (verb === 'aside' && aside) {
    const conv = asideToConversation(activity)
    const id = Set(flatParticipants(conv).map(addr => addr.address))
    return aside.flatMap(flatHelper.bind(null, id, conv))
  }
  else {
    return List.of({ asideId, activity, conversation })
  }
}
