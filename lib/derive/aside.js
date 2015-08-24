/* @flow */

import { List }                        from 'immutable'
import { flatParticipants }            from '../activity'
import { ActivityRecord, syntheticId } from '../derivedActivity'
import { unwrapMessage }               from './unwrapMessage'

import type { Address, Message, Thread } from '../notmuch'
import type { DerivedActivity }          from '../derivedActivity'

export {
  collapseAsides,
}

function collapseAsides(thread: Thread): List<DerivedActivity> {
  return List(thread).flatMap(flatten.bind(null, List()))
}

function flatten(
  ppl:               List<Address>,
  [message, thread]: [Message, Thread]
): List<DerivedActivity> {
  var ppl_ = ppl.concat(flatParticipants(List.of(message)))
  var removed = subtract(ppl_, ppl)

  var activities = unwrapMessage(message)
  var replies = List(thread).flatMap(flatten.bind(null, ppl_))

  if (removed.size > 0) {
    return aside(activities.concat(replies))
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

function subtract(from: List<Address>, subtracted: List<Address>): List<Address> {
  return from.filter(x => !subtracted.find(y => x.address === y.address))
}
