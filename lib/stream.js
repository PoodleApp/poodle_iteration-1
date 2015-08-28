/* @flow */

import { List } from 'immutable'
import * as Act from './derivedActivity'

import type { DerivedActivity }     from './derivedActivity'
import type { Conversation }        from './conversation'
import type { ActivityObject, URI } from './activity'

export {
  activityStream,
}

type Presentation = [DerivedActivity, Conversation]

function activityStream(user: ?URI, convs: List<Conversation>): List<Presentation> {
  var activities = convs.flatMap(conversationActivities.bind(null, user))
  .sortBy(([act, _]) => Act.published(act))
  .reverse()
  return rollup(user, activities)
}

function conversationActivities(user: ?URI, conv: Conversation): List<Presentation> {
  return conv.allActivities
  .flatMap(promoteAsides)
  .filter(act => true)       // TODO: cut off activities past certain age
  .filter(nonNotification.bind(null, user))
  .map(act => [act, conv])
}

// Like flatAsides, but lifts activities into top-level conversation instead of
// producing flattened aside activities.
function promoteAsides(act: DerivedActivity): List<DerivedActivity> {
  if (Act.verb(act) === 'aside') {
    return act.aside.flatMap(promoteAsides)
  }
  else {
    return List.of(act)
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

function rollup(user: ?URI, activities: List<Presentation>): List<Presentation> {
  return activities.reduce((groups: List<[List<ActivityObject>, Presentation]>, pres) => {
    var [act, conv] = pres
    var verb = Act.verb(act)
    var actor = Act.actor(act)
    var [actors, pres_] = groups.size > 0 ? groups.last() : [List(), pres]
    // if (conv === pres[1] && verb === Act.verb(pres[0])) {
    //   return groups.pop().push([
    //     actorNames.push(displayName(user, actor)),
    //     pres_
    //   ])
    // }
    // else {
      return groups.push([
        List.of(actor),
        pres,
      ])
    // }
  }, List())
  .map(([actors, [act, conv]]) => ([
    act.set('actor', { objectType: 'collection', inline: actors }),
    conv,
  ]))
}

