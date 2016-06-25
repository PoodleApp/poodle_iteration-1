/* @flow */

import type { Conversation }    from 'arfe/conversation'
import type { DerivedActivity } from 'arfe/derivedActivity'

export type Action =
  | { type: 'like', activity: DerivedActivity, conversation: Conversation }

function like(activity: DerivedActivity, conversation: Conversation): Action {
  return {
    type: 'like',
    activity,
    conversation,
  }
}

export {
  like,
}
