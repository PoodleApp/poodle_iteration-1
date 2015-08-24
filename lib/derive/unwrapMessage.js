/* @flow */

import { List }                          from 'immutable'
import { mailtoUri, midUri, midPartUri } from '../activity'
import { ActivityRecord }                from '../derivedActivity'
import { displayName }                   from '../notmuch'

import type { Message }         from '../notmuch'
import type { Zack }            from '../activity'
import type { DerivedActivity } from '../derivedActivity'

export {
  unwrapMessage,
}

function unwrapMessage(message: Message): List<DerivedActivity> {
  var activities: DerivedActivity[] = (message.attachments || []).filter(a => (
    a.contentType === 'application/activity+json'
  ))
  .map(attachment => new ActivityRecord({
    id: midPartUri(attachment, message),
    activity: JSON.parse(attachment.content.toString('utf8')),
    message,
  }))
  if (activities.length > 0) {
    return List(activities)
  }
  else {
    var note = asNote(message)
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
      verb: 'post',
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
