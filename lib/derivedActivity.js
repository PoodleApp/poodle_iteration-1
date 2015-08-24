/* @flow */

import { List, Map, Record, Stack } from 'immutable'
import * as Act                     from './activity'
import * as N                       from './notmuch'

import type { Moment }                              from 'moment'
import type { Activity, ActivityObject, URI, Zack } from './activity'
import type { Address, Message }                    from './notmuch'

export type DerivedActivity = Record & {
  id:        string,
  activity:  ?Activity,  // original, unmutated activity
  actor:     ?Address,
  aside:     ?List<DerivedActivity>,
  likes:     Map<URI, ActivityObject>,
  message:   ?Message,   // message containing original activity, for context
  revisions: Stack<DerivedActivity>,
  verb:      ?DerivedVerb,
  allActivities: ?List<DerivedActivity>,
}

var ActivityRecord = Record({
  actor:     undefined,
  activity:  undefined,
  id:        undefined,
  message:   undefined,
  likes:     Map(),
  revisions: Stack(),
  verb:      null,
  aside:     null,
  allActivities: null,
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
      return p ? ppl.set(p.uri, p) : ppl
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

var _syntheticId = 0
function syntheticId(): URI {
  return `synthetic:${_syntheticId++}`
}

// Assumes context is ordered
function insertJoins(
  context:  List<DerivedActivity>,
  activity: DerivedActivity,
  idx:      number
): List<DerivedActivity> {
  var prev  = context.takeUntil(a => activityId(a) === activityId(activity))
  var ppl   = Act.flatParticipants(prev)
  var added = Act.flatParticipants(List.of(zack(activity))).filter(p => (
    !ppl.some(p_ => p.address === p_.address)
  ))
  if (added.length <= 0 || prev.size <= 0) {
    return List.of(activity)
  }
  else if (added.every(p => {
    var a = actor(activity)
    return a && (Act.mailtoUri(p.address) === a.uri)
  })) {
    return List.of(activity)
  }
  var addedActs = added.map(p => (
    activity
    .set('actor', { uri: Act.mailtoUri(p.address), objectType: 'person', displayName: N.displayName(p) })
    .set('verb', 'join')
    .set('id', syntheticId())
  ))
  return List(addedActs).push(activity)
}

function sameActor(x: DerivedActivity, y: DerivedActivity): boolean {
  // TODO: more robust URI comparisons
  var ax = actor(x)
  var ay = actor(y)
  return !!ax && !!ay && (ax.uri === ay.uri)
}

function conflict(activity: DerivedActivity): DerivedActivity {
  return activity.set('verb', 'conflict')
}

function activityId(activity: DerivedActivity): URI {
  return activity.id
}

function actor(activity: DerivedActivity): ?ActivityObject {
  if (activity.actor) { return activity.actor }
  var z = zack(activity)
  if (z) { return Act.actor(z) }
}

function likes({ likes }: DerivedActivity): Map<URI, ActivityObject> {
  return likes || Map()
}

function likeCount(activity: DerivedActivity): number {
  return likes(activity).size
}

function getActivity(activity: DerivedActivity): ?Activity {
  var z = zack(activity)
  return z ? z[0] : undefined
}

function latestRevision(activity: DerivedActivity): DerivedActivity {
  return activity.revisions.first() || activity
}

function getMessage(activity: DerivedActivity): ?Message {
  var z = zack(activity)
  return z ? z[1] : undefined
}

function object(activity: DerivedActivity): ?ActivityObject {
  var act = getActivity(activity)
  return act ? act.object : undefined
}

function objectContent(activity: DerivedActivity): { contentType: string, content: Buffer }[] {
  var act = getActivity(activity)
  var obj = act ? act.object : undefined
  var msg = getMessage(activity)
  if (obj && msg && obj.objectType === 'activity' && obj.inline) {
    return Act.objectContent([obj.inline, msg])
  }
  else {
    var z = zack(activity)
    return z ? Act.objectContent(z) : []
  }
}

function objectType(activity: DerivedActivity): ?string {
  var act = getActivity(activity)
  if (act && act.object) {
    return act.object.objectType
  }
}

function published(activity: DerivedActivity): Moment {
  // This one gets the original, rather than revised, zack
  var { activity: act, message: msg } = activity
  if (act && msg) {
    return Act.published([act, msg])
  } else {
    return published(activity.aside.first())
  }
}

function lastEdited(activity: DerivedActivity): Moment {
  var z = zack(activity)
  return z ? Act.published(z) : published(activity)
}

function edited(activity: DerivedActivity): boolean {
  return activity.revisions.size > 0
}

function target(activity: DerivedActivity): ?ActivityObject {
  var act = getActivity(activity)
  return act ? act.target : undefined
}

function targetUri(activity: DerivedActivity): ?URI {
  var t = target(activity)
  var uri = t ? t.uri : undefined
  var msg = getMessage(activity)
  if (!msg) {
    throw 'Cannot resolve URI in synthtic activity'
  }
  if (uri) {
    return Act.resolveUri(msg, uri)
  }
}

function title(activity: DerivedActivity): ?string {
  var z = zack(activity)
  return z ? Act.title(z) : undefined
}

function verb(activity: DerivedActivity): DerivedVerb {
  // Assume that we always have one of these
  if (activity.verb) {
    return activity.verb
  }
  else {
    var act = getActivity(activity)
    if (!act) { throw 'Cannot get verb: activity has neither derived verb nor raw activity.' }
    return act.verb
  }
}

function rawVerb(activity: DerivedActivity): ?Act.Verb {
  var act = getActivity(activity)
  return act ? act.verb : undefined
}

function zack(activity: DerivedActivity): ?Zack {
  var rev = activity.revisions.first()
  if (!rev) {
    var { activity: act, message: msg } = activity
    if (act && msg) {
      return [act, msg]
    }
  }
  else {
    var obj = object(rev)
    var inline = !!obj && obj.inline
    var msg = getMessage(rev)
    if (!obj || !obj.inline) { throw "No amended activity in 'edit' activity" }
    if (msg) {
      return [obj.inline, msg]
    }
  }
}

export {
  ActivityRecord,
  activityId,
  actor,
  collapseEdits,
  collapseLikes,
  edited,
  insertJoins,
  lastEdited,
  latestRevision,
  likes,
  likeCount,
  getMessage,
  object,
  objectContent,
  objectType,
  published,
  rawVerb,
  syntheticId,
  target,
  title,
  verb,
}
