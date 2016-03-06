/* @flow */

import * as m      from 'mori'
import * as Act    from './derivedActivity'
import { butLast } from './util/mori'

import type { Seq, Seqable, Vector } from 'mori'
import type { DerivedActivity }      from './derivedActivity'
import type { Conversation }         from './conversation'
import type { ActivityObject, URI }  from './activity'

export {
  activityStream,
}

type Presentation = [DerivedActivity, Conversation]

function activityStream(user: ?URI, convs: Seqable<Conversation>): Vector<[Vector<DerivedActivity>, Conversation]> {
  const activities = m.reverse(
                     m.sortBy(([act, _]) => Act.published(act),
                     m.mapcat(conversationActivities.bind(null, user),
                     convs)))
  return rollup(user, activities)
}

function conversationActivities(user: ?URI, conv: Conversation): Seq<Presentation> {
  return m.map(act => [act, conv],
         m.filter(nonNotification.bind(null, user),
         m.filter(act => true,  // TODO: cut off activities past certain age
         m.mapcat(promoteAsides,
         conv.allActivities))))
}

// Like flatAsides, but lifts activities into top-level conversation instead of
// producing flattened aside activities.
function promoteAsides(act: DerivedActivity): Seq<DerivedActivity> {
  if (Act.verb(act) === 'aside' && act.aside) {
    return m.mapcat(promoteAsides, act.aside)
  }
  else {
    return m.seq([])
  }
}

function nonNotification(user: ?URI, act: DerivedActivity): boolean {
  var verb = Act.verb(act)
  if (verb === 'join') {
    return false
  }
  else if (verb === 'conflict') {
    var actor = Act.actor(act)
    return !!actor && (actor.uri === user)
  }
  else if (verb === 'like') {
    var actor = Act.actor(act)
    return !!actor && (actor.uri !== user)
  }
  // else if (verb === 'edit') {
  //   var actor = Act.actor(act)
  //   return !!actor && (actor.uri !== user)
  // }
  else {
    return true
  }
}

function rollup(user: ?URI, activities: Seqable<Presentation>): Vector<[Vector<DerivedActivity>, Conversation]> {
  return m.reduce((as, [act, conv]) => {
    const last = m.last(as)
    if (last) {
      const [acts, conv_] = last
      if (conv === conv_) {
        return m.conj(butLast(as), [m.conj(acts, act), conv])
      }
    }
    return m.conj(as, [m.vector(act), conv])
  }, m.vector(), activities)
}
