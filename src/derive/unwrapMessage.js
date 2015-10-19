/* @flow */

import { List }                                        from 'immutable'
import { mailtoUri }                                   from '../activity'
import { midUri, midPartUri, parseMidUri, resolveUri } from '../models/message'
import { ActivityRecord }                              from '../derivedActivity'
import { displayName }                                 from '../models/address'

import type { Message }         from '../models/message'
import type { Zack }            from '../activity'
import type { DerivedActivity } from '../derivedActivity'

export {
  unwrapMessage,
}

function unwrapMessage(message: Message): List<DerivedActivity> {
  const activities = List(message.activities)
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
  var from = message.from[0]
  var author = {
    objectType: 'person',
    displayName: displayName(from),
    id: mailtoUri(from.address),
  }
  if (message.text || message.html) {
    var activity = {
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
  var activity = {
    title: message.subject,
    verb: 'unknown',
  }
  return new ActivityRecord({
    id: midUri(message),
    activity,
    message,
  })
}
