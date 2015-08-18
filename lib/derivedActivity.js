/* @flow */

import { List, Record, Map }        from 'immutable'
import { chain, map, pipe, uniqBy } from 'ramda'
import * as Act                     from './activity'

import type { Moment }                              from 'moment'
import type { Activity, ActivityObject, URI, Zack } from './activity'
import type { Message }                             from './notmuch'

export type DerivedActivity = Record & {
  activity: Activity,  // original, unmutated activity
  message:  Message,   // message containing original activity, for context
  likes:    Map<URI, ActivityObject>,
  verb:     ?DerivedVerb
}

var ActivityRecord = Record({
  activity: null,
  message:  null,
  likes:    Map(),
  verb:     null,
})

// Some derived activities are synthetic, and use verbs that are not available
// to real activities.
export type DerivedVerb = 'post' | 'reply' | 'share' | 'edit' | 'like' | 'unknown' |  'delete' | 'join' | 'aside'

// function derive(activities: Zack[]): DerivedZack[] {
//   return activities.reduce(deriveAct(activities), [])
// }

function collapseLikes(
  context: List<DerivedActivity>,
  activity: DerivedActivity
): List<DerivedActivity> {
  if (verb(activity) === 'like') {
    return List()  // likes are not directly visible
  }

  var thisId = activityId(activity)
  var likes  = context.reduce((ppl, otherAct) => {
    var targ = target(otherAct)
    var uri  = targ ? targ.uri : null
    if (verb(otherAct) === 'like' && uri) {
      uri = Act.resolveUri(message(otherAct), uri)
      if (uri === thisId) {
        var p = actor(otherAct)
        return ppl.set(p.uri, p)
      }
    }
    return ppl
  }, Map())

  return List.of(
    activity.set('likes', likes)
  )
}

function deriveAct([act, msg]: Zack): DerivedActivity {
  return new ActivityRecord({
    activity: act,
    message: msg,
  })
}

function derive(activities: List<Zack>): DerivedActivity[] {
  var ds = activities.map(deriveAct)
  return ds
    .flatMap(collapseLikes.bind(null, ds))
}

function activityId({ activity, message }: DerivedActivity): URI {
  return Act.activityId([activity, message])
}

function actor({ activity, message }: DerivedActivity): ActivityObject {
  return Act.actor([activity, message])
}

function likes({ likes }: DerivedActivity): Map<URI, ActivityObject> {
  return likes || Map()
}

function likeCount(activity: DerivedActivity): number {
  return likes(activity).size
}

function message(activity: DerivedActivity): Message {
  return activity.message
}

function object({ activity }: DerivedActivity): ?ActivityObject {
  return activity.object
}

function objectContent(activity: DerivedActivity): { contentType: string, content: Buffer }[] {
  return Act.objectContent([activity.activity, activity.message])
}

function objectType({ activity }: DerivedActivity): ?DerivedVerb {
  if (activity.object) {
    return activity.object.objectType
  }
}

function published(activity: DerivedActivity): Moment {
  return Act.published(activity)
}

function target({ activity }: DerivedActivity): ?ActivityObject {
  return activity.target
}

function verb(activity: DerivedActivity): DerivedVerb {
  return activity.verb || activity.activity.verb
}

export {
  activityId,
  actor,
  derive,
  likes,
  likeCount,
  message,
  object,
  objectContent,
  objectType,
  published,
  target,
  verb,
}
