/* @flow */

import { List, Set }                   from 'immutable'
import { flatParticipants }            from '../activity'
import { ActivityRecord, syntheticId } from '../derivedActivity'
import { unwrapMessage }               from './unwrapMessage'

import type { Address }         from '../models/address'
import type { Message }         from '../models/message'
import type { Thread }          from '../models/thread'
import type { DerivedActivity } from '../derivedActivity'

export {
  aside,
  collapseAsides,
}

function collapseAsides(thread: Thread): List<DerivedActivity> {
  return thread.flatMap(flatten.bind(null, Set()))
}

function flatten(
  ppl:               Set<string>,
  [message, thread]: [Message, Thread]
): List<DerivedActivity> {
  var to   = Set(flatParticipants(List.of(message)).map(addr => addr.address))
  var ppl_ = ppl.union(to)
  var removed = ppl.subtract(to)

  var activities = unwrapMessage(message)
  var replies = removed.size > 0 ?
    thread.flatMap(flatten.bind(null, to)) :
    thread.flatMap(flatten.bind(null, ppl.union(to)))
  var withReplies = activities.concat(replies)

  if (removed.size > 0) {
    return List.of(aside(withReplies, withReplies))
  }
  else {
    return withReplies
  }
}

function aside(activities: List<DerivedActivity>, allActivities: List<DerivedActivity>): DerivedActivity {
  return new ActivityRecord({
    id:    syntheticId(),
    aside: activities,
    allActivities,
    verb:  'aside',
  })
}
