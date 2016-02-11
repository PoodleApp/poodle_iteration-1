/* @flow */

import { List, Set }                   from 'immutable'
import { flatParticipants }            from '../activity'
import { ActivityRecord, syntheticId } from '../derivedActivity'
import { unwrapMessage }               from './unwrapMessage'

import type { Map }                from 'immutable'
import type { Address }            from '../models/address'
import type { Message, MessageId } from '../models/message'
import type { Thread }             from '../models/thread'
import type { Activity }           from '../activity'
import type { DerivedActivity }    from '../derivedActivity'

export {
  aside,
  collapseAsides,
}

function collapseAsides(thread: Thread, activityMap: Map<MessageId, List<Activity>>): List<DerivedActivity> {
  return thread.flatMap(flatten.bind(null, Set(), activityMap))
}

function flatten(
  ppl:               Set<string>,
  activityMap:       Map<string, List<Activity>>,
  [message, thread]: [Message, Thread]
): List<DerivedActivity> {
  var to   = Set(flatParticipants(List.of(message)).map(addr => addr.address))
  var ppl_ = ppl.union(to)
  var removed = ppl.subtract(to)

  var activities = unwrapMessage(message, activityMap)
  var replies = removed.size > 0 ?
    thread.flatMap(flatten.bind(null, to,            activityMap)) :
    thread.flatMap(flatten.bind(null, ppl.union(to), activityMap))
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
