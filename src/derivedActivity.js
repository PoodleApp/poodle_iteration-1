/* @flow */

import * as m                        from 'mori'
import { set }                       from 'safety-lens'
import { prop }                      from 'safety-lens/es2015'
import { catMaybes, maybeToSeqable } from './util/maybe'
import { constructor }               from './util/record'
import { resolveUri }                from './models/message'
import * as Act                      from './activity'
import * as A                        from './models/address'

import type { List, Map, Seq, Seqable, Vector }     from 'mori'
import type { Moment }                              from 'moment'
import type { Activity, ActivityObject, URI, Zack } from './activity'
import type { Address }                             from './models/address'
import type { Message }                             from './models/message'
import type { Constructor }                         from './util/record'

export type DerivedActivity = {
  id:        string,
  activity?: Activity,  // original, unmutated activity
  actor?:    ActivityObject,
  aside?:    Seqable<DerivedActivity>,
  likes:     Map<URI, ActivityObject>,
  message?:  Message,   // message containing original activity, for context
  revisions: List<DerivedActivity>,
  verb?:     DerivedVerb,
  allActivities?: Seqable<DerivedActivity>,
  attachments: List<{ contentType: string, content: Buffer, uri: URI }>,
}

const newDerivedActivity: Constructor<{ id: string },DerivedActivity> = constructor({
  likes:       m.hashMap(),
  revisions:   m.list(),
  attachments: m.list(),
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
): Vector<DerivedActivity> {
  if (verb(activity) === 'like') {
    return m.vector()  // likes are not directly visible
  }

  const thisId = activityId(activity)
  const likes = m.reduce((ppl, otherAct) => {
    if (verb(otherAct) === 'like' && targetUri(otherAct) === thisId) {
      const p = actor(otherAct)
      return p ? m.assoc(ppl, p.uri, p) : ppl
    }
    else {
      return ppl
    }
  }
  , m.hashMap(), context)

  return m.vector(
    set(prop('likes'), likes, activity)
  )
}

function collapseEdits(
  context: Seqable<DerivedActivity>,
  activity: DerivedActivity
): Vector<DerivedActivity> {
  if (verb(activity) === 'edit') {
    return m.vector()
  }

  const thisId = activityId(activity)
  const [revisions, conflicts] = m.reduce(([rs, cs], otherAct) => {
    const uri = targetUri(otherAct)
    if (verb(otherAct) === 'edit' && uri && canEdit(activity, otherAct)) {
      const idx = m.first(
        m.keepIndexed((i, act) => activityId(act) === uri ? i : undefined, rs)
      )
      if (idx === 0) {
        return [m.conj(rs, otherAct), cs]
      }
      else if (idx >= 1) {
        return [rs, m.conj(cs, conflict(otherAct))]
      }
      else {
        return [rs, cs]
      }
    }
    return [rs, cs]
  }
  , [m.list(activity), m.vector()], context)
  // `conj` puts items on the front of a list, and at the end of a vector.

  return m.conj(conflicts, (
    set(prop('revisions'), m.filter(r => r !== activity, revisions), activity)
  ))
}

let _syntheticId = 0
function syntheticId(): URI {
  return `synthetic:${_syntheticId++}`
}

// Assumes context is ordered
function insertJoins(
  context:  Seqable<DerivedActivity>,
  activity: DerivedActivity
): Vector<DerivedActivity> {
  const prev  = m.takeWhile(a => activityId(a) !== activityId(activity), context)
  const ppl   = Act.flatParticipants(catMaybes(m.map(getMessage, prev)))
  const added = m.filter(p => (
    !m.some(p_ => p.address === p_.address, ppl)
  )
  , Act.flatParticipants(maybeToSeqable(getMessage(activity))))

  if (m.isEmpty(added) || m.isEmpty(prev)) {
    return m.vector(activity)
  }
  else if (m.every(p => {
    const a = actor(activity)
    return !!a && (Act.mailtoUri(p.address) === a.uri)
  }, added)) {
    return m.vector(activity)
  }

  const addedActs = m.map(p => (
    set(prop('actor'), { uri: Act.mailtoUri(p.address), objectType: 'person', displayName: A.displayName(p) },
    set(prop('verb'), 'join',
    set(prop('id'), syntheticId(),
    activity)))
  ), added)
  return m.conj(m.into(m.vector(), addedActs), activity)
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
  return likes
}

function likeCount(activity: DerivedActivity): number {
  return m.count(likes(activity))
}

function getActivity(activity: DerivedActivity): ?Activity {
  var z = zack(activity)
  return z ? z[0] : undefined
}

function latestRevision(activity: DerivedActivity): DerivedActivity {
  return m.first(activity.revisions) || activity
}

function getMessage(activity: DerivedActivity): ?Message {
  var z = zack(activity)
  return z ? z[1] : undefined
}

function object(activity: DerivedActivity): ?ActivityObject {
  var act = getActivity(activity)
  return act ? act.object : undefined
}

function objectContent(activity: DerivedActivity): Seq<{ contentType: string, content: Buffer, uri: URI }> {
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
  return m.filter(a => a.uri === uri, activity.attachments)
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
    const first = m.first(activity.aside)
    if (!first) { throw "no first activity in aside" } // TODO
    return published(first)
  }
}

function lastEdited(activity: DerivedActivity): Moment {
  var z = zack(activity)
  return z ? Act.published(z) : published(activity)
}

function edited(activity: DerivedActivity): boolean {
  return !m.isEmpty(activity.revisions)
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
  const rev = m.first(activity.revisions)
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
