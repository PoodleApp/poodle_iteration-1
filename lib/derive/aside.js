/* @flow */

import { List, Set }                   from 'immutable'
import { flatParticipants }            from '../activity'
import { ActivityRecord, syntheticId } from '../derivedActivity'
import { unwrapMessage }               from './unwrapMessage'

import type { Address, Message, Thread } from '../notmuch'
import type { DerivedActivity }          from '../derivedActivity'

export {
  collapseAsides,
}

function collapseAsides(thread: Thread): List<DerivedActivity> {
  return List(thread).flatMap(flatten.bind(null, Set()))
}

function flatten(
  ppl:               Set<string>,
  [message, thread]: [Message, Thread]
): List<DerivedActivity> {
  var to   = Set(flatParticipants(List.of(message)).map(addr => addr.address))
  var ppl_ = ppl.union(to)
  var removed = ppl.subtract(to)

  var activities = unwrapMessage(message)
  var replies = List(thread).flatMap(flatten.bind(null, ppl_))

  if (removed.size > 0) {
    return List.of(aside(activities.concat(replies)))
  }
  else {
    return activities.concat(replies)
  }
}

function aside(activities: List<DerivedActivity>): DerivedActivity {
  return new ActivityRecord({
    id:    syntheticId(),
    aside: activities,
    verb:  'aside',
  })
}
