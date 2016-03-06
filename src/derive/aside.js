/* @flow */

import * as m                              from 'mori'
import { flatParticipants }                from '../activity'
import { newDerivedActivity, syntheticId } from '../derivedActivity'
import { unwrapMessage }                   from './unwrapMessage'
import { subtract }                        from '../util/mori'

import type { Map, Seq, Seqable, Set } from 'mori'
import type { Address }                from '../models/address'
import type { Message, MessageId }     from '../models/message'
import type { Thread }                 from '../models/thread'
import type { Activity }               from '../activity'
import type { DerivedActivity }        from '../derivedActivity'

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
  const to   = m.set(m.map(addr => addr.address, flatParticipants(m.list(message))))
  const ppl_ = m.union(ppl, to)
  const removed = subtract(ppl, to)

  const activities = unwrapMessage(message, activityMap)
  const replies = !m.isEmpty(removed) ?
    m.mapcat(flatten.bind(null, to,               activityMap), thread) :
    m.mapcat(flatten.bind(null, m.union(ppl, to), activityMap), thread)
  const withReplies = m.concat(activities, replies)

  if (!m.isEmpty(removed)) {
    return m.seq([aside(withReplies, withReplies)])
  }
  else {
    return withReplies
  }
}

function aside(activities: Seqable<DerivedActivity>, allActivities: Seqable<DerivedActivity>): DerivedActivity {
  return newDerivedActivity({
    id:    syntheticId(),
    aside: activities,
    allActivities,
    verb:  'aside',
  })
}
