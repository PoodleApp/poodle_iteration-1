/* @flow */

import * as m                              from 'mori'
import { flatParticipants }                from '../activity'
import { newDerivedActivity, syntheticId } from '../derivedActivity'
import { unwrapMessage }                   from './unwrapMessage'

import type { List, Map, Seq, Seqable, Set } from 'mori'
import type { Address }                      from '../models/address'
import type { Message, MessageId }           from '../models/message'
import type { Thread }                       from '../models/thread'
import type { Activity }                     from '../activity'
import type { DerivedActivity }              from '../derivedActivity'

export {
  aside,
  collapseAsides,
}

function collapseAsides(thread: Thread, activityMap: Map<MessageId, Seqable<Activity>>): Seq<DerivedActivity> {
  return m.mapcat(flatten.bind(null, m.set(), activityMap), thread)
}

function flatten(
  ppl:               Set<string>,
  activityMap:       Map<MessageId, Seqable<Activity>>,
  [message, thread]: [Message, Thread]
): Seq<DerivedActivity> {
  const to   = Set(flatParticipants(List.of(message)).map(addr => addr.address))
  const ppl_ = ppl.union(to)
  const removed = ppl.subtract(to)

  const activities = unwrapMessage(message, activityMap)
  const replies = removed.size > 0 ?
    thread.flatMap(flatten.bind(null, to,            activityMap)) :
    thread.flatMap(flatten.bind(null, ppl.union(to), activityMap))
  const withReplies = activities.concat(replies)

  if (removed.size > 0) {
    return List.of(aside(withReplies, withReplies))
  }
  else {
    return withReplies
  }
}

function aside(activities: List<DerivedActivity>, allActivities: List<DerivedActivity>): DerivedActivity {
  return newDerivedActivity({
    id:    syntheticId(),
    aside: activities,
    allActivities,
    verb:  'aside',
  })
}
