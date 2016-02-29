/* @flow */

import * as m                       from 'mori'
import { List, Map, Record, }       from 'immutable'
import { set }                      from 'safety-lens'
import { prop }                     from 'safety-lens/es2015'
import { catMaybes, maybeToList }   from './util/maybe'
import { constructor }              from './util/record'
import { resolveUri }               from './models/message'
import * as Act                     from './activity'
import * as A                       from './models/address'

import type { Seq, Seqable, Stack }                 from 'mori'
import type { Moment }                              from 'moment'
import type { Activity, ActivityObject, URI, Zack } from './activity'
import type { Address }                             from './models/address'
import type { Message }                             from './models/message'
import type { Constructor }                         from './util/record'

export type DerivedActivity = {
  id:        string,
  activity?: Activity,  // original, unmutated activity
  actor?:    ActivityObject,
  aside?:    List<DerivedActivity>,
  likes:     Map<URI, ActivityObject>,
  message?:  Message,   // message containing original activity, for context
  revisions: Stack<DerivedActivity>,
  verb?:     DerivedVerb,
  allActivities?: Seqable<DerivedActivity>,
  attachments: List<{ contentType: string, content: Buffer, uri: URI }>,
}

const newDerivedActivity: Constructor<{ id: string },DerivedActivity> = constructor({
  likes:     Map(),
  revisions: Stack(),
  attachments: List(),
})

// Some derived activities are synthetic, and use verbs that are not available
// to real activities.
export type DerivedVerb = 'post' | 'reply' | 'share' | 'edit' | 'like' | 'unknown' |  'delete' | 'join' | 'aside' | 'conflict'

// function derive(activities: Zack[]): DerivedZack[] {
//   return activities.reduce(deriveAct(activities), [])
// }

function collapseLikes(
  context: Seqable<DerivedActivity>,
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
    set(prop('likes'), likes, activity)
  )
}

function collapseEdits(
  context: Seqable<DerivedActivity>,
  activity: DerivedActivity
): List<DerivedActivity> {
  if (verb(activity) === 'edit') {
    return List()
  }

  var thisId = activityId(activity)
  var [revisions, conflicts] = context.reduce((accum, other) => {
    var [rs, cs] = accum
    var uri      = targetUri(other)
    if (verb(other) === 'edit' && uri && canEdit(activity, other)) {
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
    set(prop('revisions'), revisions.filter(r => r !== activity), activity)
  )
}

var _syntheticId = 0
function syntheticId(): URI {
  return `synthetic:${_syntheticId++}`
}

// Assumes context is ordered
function insertJoins(
  context:  Seqable<DerivedActivity>,
  activity: DerivedActivity,
  idx:      number
): List<DerivedActivity> {
  var prev  = context.takeUntil(a => activityId(a) === activityId(activity))
  var ppl   = Act.flatParticipants(catMaybes(prev.map(getMessage)))

  var added = Act.flatParticipants(maybeToList(getMessage(activity))).filter(p => (
    !ppl.some(p_ => p.address === p_.address)
  ))
  if (added.isEmpty() || prev.isEmpty()) {
    return List.of(activity)
  }
  else if (added.every(p => {
    const a = actor(activity)
    return !!a && (Act.mailtoUri(p.address) === a.uri)
  })) {
    return List.of(activity)
  }
  var addedActs = added.map(p => (
    set(prop('actor'), { uri: Act.mailtoUri(p.address), objectType: 'person', displayName: A.displayName(p) },
    set(prop('verb'), 'join',
    set(prop('id'), syntheticId(),
    activity)))
  ))
  return List(addedActs).push(activity)
}

function canEdit(x: DerivedActivity, y: DerivedActivity): boolean {
  return objectType(x) === 'document' || sameActor(x, y)
}

function sameActor(x: DerivedActivity, y: DerivedActivity): boolean {
  // TODO: more robust URI comparisons
  var ax = actor(x)
  var ay = actor(y)
  return !!ax && !!ay && (ax.uri === ay.uri)
}

function conflict(activity: DerivedActivity): DerivedActivity {
  return set(prop('verb'), 'conflict', activity)
}

function activityId(activity: DerivedActivity): URI {
  return activity.id
}

function actor(activity: DerivedActivity): ?ActivityObject {
  if (activity.actor) { return activity.actor }
  var z = zack(activity)
  if (z) { return Act.actor(z) }
}

function isSynthetic(activity: DerivedActivity): boolean {
  return !zack(activity)
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

function objectContent(activity: DerivedActivity): List<{ contentType: string, content: Buffer, uri: URI }> {
  const act = getActivity(activity)
  const obj = act ? act.object : undefined
  const msg = getMessage(activity)

  // TODO
  // if (obj && msg && obj.objectType === 'activity' && obj.inline) {
  //   return Act.objectContent([obj.inline, msg])
  // }
  // else {
  //   var z = zack(activity)
  //   return z ? Act.objectContent(z) : []
  // }

  const z = zack(activity)
  const uri = z ? Act.objectContent(z) : null
  return activity.attachments.filter(a => a.uri === uri)
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
  } else if (activity.aside) {
    const first = activity.aside.first()
    if (!first) { throw "no first activity in aside" } // TODO
    return published(first)
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
  if (uri) {
    var msg = getMessage(activity)
    if (!msg) {
      throw 'Cannot resolve URI in synthtic activity'
    }
    return resolveUri(msg, uri)
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
  activityId,
  actor,
  collapseEdits,
  collapseLikes,
  edited,
  insertJoins,
  isSynthetic,
  lastEdited,
  latestRevision,
  likes,
  likeCount,
  getMessage,
  newDerivedActivity,
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
