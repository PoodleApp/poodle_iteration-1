/* @flow */

import * as m        from 'mori'
import { mailtoUri } from '../activity'
import {
  midUri,
  midPartUri,
  parseMidUri,
  resolveUri,
} from '../models/message'
import { newDerivedActivity } from '../derivedActivity'
import { displayName }    from '../models/address'

import type { Map, Seq, Seqable }  from 'mori'
import type { Message, MessageId } from '../models/message'
import type { Activity, Zack }     from '../activity'
import type { DerivedActivity }    from '../derivedActivity'

export {
  unwrapMessage,
}

function unwrapMessage(message: Message, activityMap: Map<MessageId, Seqable<Activity>>): Seq<DerivedActivity> {
  const as = m.get(activityMap, message.messageId, m.list())
  const activities = m.map(activity => newDerivedActivity({
    id: activity.id,
    activity,
    message,
  }), as)
  if (!m.isEmpty(activities)) {
    return activities
  }
  else {
    const note = asNote(message)
    return m.list(note ? note : unknownActivity(message))
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
    return newDerivedActivity({
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
  return newDerivedActivity({
    id: midUri(message),
    activity,
    message,
  })
}
