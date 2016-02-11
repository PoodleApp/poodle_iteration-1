/* @flow */

import { List }      from 'immutable'
import { mailtoUri } from '../activity'
import {
  midUri,
  midPartUri,
  parseMidUri,
  resolveUri,
} from '../models/message'
import { ActivityRecord } from '../derivedActivity'
import { displayName }    from '../models/address'

import type { Map }                from 'immutable'
import type { Message, MessageId } from '../models/message'
import type { Activity, Zack }     from '../activity'
import type { DerivedActivity }    from '../derivedActivity'

export {
  unwrapMessage,
}

function unwrapMessage(message: Message, activityMap: Map<MessageId, List<Activity>>): List<DerivedActivity> {
  const activities = activityMap.get(message.messageId, List())
  .map(activity => new ActivityRecord({
    id: activity.id,
    activity,
    message,
  }))
  if (!activities.isEmpty()) {
    return activities
  }
  else {
    const note = asNote(message)
    return List(note ? [note] : [unknownActivity(message)])
  }
}

// TODO: Should the synthetic note and unknown activities be derived activities?
function asNote(message: Message): ?DerivedActivity {
  const from = message.from[0]
  const author = {
    objectType: 'person',
    displayName: displayName(from),
    id: mailtoUri(from.address),
  }
  if (message.text || message.html) {
    const activity = {
      title: message.subject,
      verb: (message.inReplyTo && message.inReplyTo.length > 0) ? 'reply' : 'post',
      object: {
        objectType: 'note',
        author,
        uri: midUri(message),
      }
    }
    return new ActivityRecord({
      id: midUri(message),
      activity,
      message,
    })
  }
}

function unknownActivity(message: Message): DerivedActivity {
  const activity = {
    title: message.subject,
    verb: 'unknown',
  }
  return new ActivityRecord({
    id: midUri(message),
    activity,
    message,
  })
}
