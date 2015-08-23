/* @flow */

import { List, Map, Record, Stack } from 'immutable'
import * as Act                     from './activity'
import * as N                       from './notmuch'

import type { Moment }                              from 'moment'
import type { Activity, ActivityObject, URI, Zack } from './activity'
import type { Address, Message }                    from './notmuch'

export type DerivedActivity = Record & {
  actor:     ?Address,
  activity:  Activity,  // original, unmutated activity
  id:        ?string,
  message:   Message,   // message containing original activity, for context
  likes:     Map<URI, ActivityObject>,
  revisions: Stack<DerivedActivity>,
  verb:      ?DerivedVerb
}

var ActivityRecord = Record({
  actor:     undefined,
  activity:  undefined,
  id:        undefined,
  message:   undefined,
  likes:     Map(),
  revisions: Stack(),
  verb:      null,
})

// Some derived activities are synthetic, and use verbs that are not available
// to real activities.
export type DerivedVerb = 'post' | 'reply' | 'share' | 'edit' | 'like' | 'unknown' |  'delete' | 'join' | 'aside' | 'conflict'

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
    if (verb(otherAct) === 'like' && targetUri(otherAct) === thisId) {
      var p = actor(otherAct)
      return ppl.set(p.uri, p)
    }
    return ppl
  }, Map())

  return List.of(
    activity.set('likes', likes)
  )
}

function collapseEdits(
  context: List<DerivedActivity>,
  activity: DerivedActivity
): List<DerivedActivity> {
  if (verb(activity) === 'edit') {
    return List()
  }

  var thisId = activityId(activity)
  var [revisions, conflicts] = context.reduce((accum, other) => {
    var [rs, cs] = accum
    var uri      = targetUri(other)
    if (verb(other) === 'edit' && uri && sameActor(activity, other)) {
      var i = rs.findIndex(a => activityId(a) === uri)
      if (i === 0) {
        return [rs.unshift(other), cs]
      }
      else if (i >= 1) {
        return [rs, cs.push(conflict(other))]
      }
    }
    return accum
  }, [Stack.of(activity), List()])

  return conflicts.unshift(
    activity.set('revisions', revisions.filter(r => r !== activity))
  )
}

var syntheticId = 0

// Assumes context is ordered
function insertJoins(
  context:  List<Zack>,
  activity: DerivedActivity,
  idx:      number
): List<DerivedActivity> {
  var prev  = context.takeUntil(a => Act.activityId(a) === activityId(activity))
  var ppl   = Act.flatParticipants(prev)
  var added = Act.flatParticipants(List.of(zack(activity))).filter(p => (
    !ppl.some(p_ => p.address === p_.address)
  ))
  if (added.length <= 0 || prev.size <= 0) {
    return List.of(activity)
  }
  else if (added.every(p => (
    Act.mailtoUri(p.address) === actor(activity).uri
  ))) {
    return List.of(activity)
  }
  var addedActs = added.map(p => (
    activity
    .set('actor', { uri: Act.mailtoUri(p.address), objectType: 'person', displayName: N.displayName(p) })
    .set('verb', 'join')
    .set('id', `synthetic:${syntheticId++}`)
  ))
  return List(addedActs).push(activity)
}

function sameActor(x: DerivedActivity, y: DerivedActivity): boolean {
  // TODO: more robust URI comparisons
  return actor(x).uri === actor(y).uri
}

function conflict(activity: DerivedActivity): DerivedActivity {
  return activity.set('verb', 'conflict')
}

function deriveAct([act, msg]: Zack): DerivedActivity {
  return new ActivityRecord({
    activity: act,
    message:  msg,
  })
}

function derive(activities: List<Zack>): DerivedActivity[] {
  var ds = activities.map(deriveAct)
  var collapsed = ds
    .flatMap(collapseLikes.bind(null, ds))
    .flatMap(collapseEdits.bind(null, ds))
    .sortBy(published)
  return collapsed
    .flatMap(insertJoins.bind(null, activities))
}

function activityId(activity: DerivedActivity): URI {
  return activity.id || Act.activityId([activity.activity, activity.message])
}

function actor(activity: DerivedActivity): ActivityObject {
  return activity.actor || Act.actor(zack(activity))
}

function likes({ likes }: DerivedActivity): Map<URI, ActivityObject> {
  return likes || Map()
}

function likeCount(activity: DerivedActivity): number {
  return likes(activity).size
}

function getActivity(activity: DerivedActivity): Activity {
  return zack(activity)[0]
}

function latestRevision(activity: DerivedActivity): DerivedActivity {
  return activity.revisions.first() || activity
}

function message(activity: DerivedActivity): Message {
  return zack(activity)[1]
}

function object(activity: DerivedActivity): ?ActivityObject {
  return getActivity(activity).object
}

function objectContent(activity: DerivedActivity): { contentType: string, content: Buffer }[] {
  var act = getActivity(activity)
  var obj = act.object
  if (obj && obj.objectType === 'activity' && obj.inline) {
    return Act.objectContent([obj.inline, message(activity)])
  }
  else {
    return Act.objectContent(zack(activity))
  }
}

function objectType(activity: DerivedActivity): ?string {
  var act = getActivity(activity)
  if (act.object) {
    return act.object.objectType
  }
}

function published({ activity, message }: DerivedActivity): Moment {
  // This one gets the original, rather than revised, zack
  return Act.published([activity, message])
}

function lastEdited(activity: DerivedActivity): Moment {
  return Act.published(zack(activity))
}

function edited(activity: DerivedActivity): boolean {
  return activity.revisions.size > 0
}

function target(activity: DerivedActivity): ?ActivityObject {
  return getActivity(activity).target
}

function targetUri(activity: DerivedActivity): ?URI {
  var t = target(activity)
  var uri = t ? t.uri : undefined
  if (uri) {
    return Act.resolveUri(message(activity), uri)
  }
}

function title(activity: DerivedActivity): string {
  return Act.title(zack(activity))
}

function verb(activity: DerivedActivity): DerivedVerb {
  return activity.verb || getActivity(activity).verb
}

function rawVerb(activity: DerivedActivity): Act.Verb {
  return getActivity(activity).verb
}

function zack(activity: DerivedActivity): Zack {
  var rev = activity.revisions.first()
  if (!rev) {
    return [activity.activity, activity.message]
  }
  else {
    var obj = object(rev)
    if (!obj || !obj.inline) { throw "No amended activity in 'edit' activity" }
    return [obj.inline, message(rev)]
  }
}

export {
  activityId,
  actor,
  derive,
  edited,
  lastEdited,
  latestRevision,
  likes,
  likeCount,
  message,
  object,
  objectContent,
  objectType,
  published,
  rawVerb,
  target,
  title,
  verb,
}
