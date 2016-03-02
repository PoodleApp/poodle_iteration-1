/* @flow */

import * as m        from 'mori'
import { set }       from 'safety-lens'
import { prop }      from 'safety-lens/es2015'
import { catMaybes } from './util/maybe'
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
import { pair }        from './util/mori'

import type { List, Map, Pair, Seq, Seqable, Vector } from 'mori'
import type { Moment }                                from 'moment'
import type { DerivedActivity }                       from './derivedActivity'
import type { Activity, Zack }                        from './activity'
import type { Address }                               from './models/address'
import type { Message, MessageId }                    from './models/message'
import type { Thread }                                from './models/thread'
import type { Constructor }                           from './util/record'

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
    const [{ messageId }, _] = m.first(thread)
    const activities = collapseAsides(thread, activityMap)
    const firstActivity = m.first(activities)
    const conv = newConversation({
      id:            messageId,
      activities:    derive(activities),
      allActivities: activities,
      subject:       title(firstActivity) || '[no subject]',
    })
    return flatAsides(conv)
  })
}

function getActivities(thread: Thread): Promise<Map<MessageId, Seqable<Activity>>> {
  const activityPromises: List<Promise<Pair<MessageId, Seqable<Activity>>>> =
    foldrThread((as, msg) => (
      m.conj(as, Act.getActivities(msg).then(acts => pair(msg.messageId, acts)))
    ), m.list(), thread)
  return Promise.all(m.intoArray(activityPromises)).then(
    pairs => m.into(m.hashMap(), pairs)
  )
}

function derive(activities: Seq<DerivedActivity>): Seq<DerivedActivity> {
  const context = m.sortBy(published, activities)
  const withJoins = m.mapcat(act => insertJoins(context, act), activities)
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
  const acts = conv.allActivities || m.list()
  return Act.participants(catMaybes(m.map(getMessage, acts)))
}

function flatParticipants(conv: Conversation): Seq<Address> {
  const acts = conv.allActivities || m.list()
  return Act.flatParticipants(catMaybes(m.map(getMessage, acts)))
}

type FlatActivity = {
  activity:     DerivedActivity,
  conversation: Conversation,
  asideId:      AsideId,
}

type AsideId = Set<string>
const emptyId: AsideId = m.set()

function flatAsides(conv: Conversation): Conversation {
  const flatActivities: Seq<FlatActivity> = m.sortBy(
    act => published(act.activity),
    m.mapcat(act => flatHelper(emptyId, conv, act))
  )

  // Combine adjacent activities with same asideId into groups
  const activityGroups: Vector<Vector<FlatActivity>> = m.reduce((groups, act) => {
    const group = m.last(groups)
    const lastAsideId = group ? m.first(group).asideId : null
    if (group && m.equals(lastAsideId, act.asideId)) {
      const updatedGroup = m.conj(group, act)
      return m.assoc(groups, m.count(groups) - 1, updatedGroup)
    }
    else {
      return m.conj(groups, m.vector(act))
    }
  }, m.vector(), flatActivities)

  const activities = m.mapcat(group => {
    const asideId = m.first(group).asideId
    if (asideId.size === 0) {
      return group.map(a => a.activity)
    }
    else {
      const conv = m.first(group).conversation
      return aside(m.map(a => a.activity, group), conv.allActivities)
    }
  }, activityGroups)

  return set(prop('activities'), activities, conv)
}

function flatHelper(asideId: AsideId, conversation: Conversation, activity: DerivedActivity): Seq<FlatActivity> {
  const { aside, verb } = activity
  if (verb === 'aside' && aside) {
    const conv = asideToConversation(activity)
    const id = m.into(m.set(), m.map(addr => addr.address, flatParticipants(conv)))
    return aside.flatMap(flatHelper.bind(null, id, conv))
  }
  else {
    return m.seq([{ asideId, activity, conversation }])
  }
}
