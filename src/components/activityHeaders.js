/* @flow */

import * as Sunshine   from 'sunshine-framework/react'
import React           from 'react'
import { List }        from 'immutable'
import { uniqBy }      from '../util/immutable'
import * as Act        from '../derivedActivity'
import * as C          from '../conversation'
import * as A          from '../models/address'
import { actorAvatar, addressAvatar } from './avatar'
import { Avatar
       , ListItem
       } from 'material-ui'

import type { DerivedActivity }     from '../derivedActivity'
import type { Conversation }        from '../conversation'
import type { ActivityObject, URI } from '../activity'

export type HeaderProps = {
  activities: List<DerivedActivity>,
  conversation: Conversation,
  user: ?URI,
}

export class ActivityHeader extends Sunshine.Component<{},HeaderProps,{}> {
  render(): React.Element {
    var { conversation, user } = this.props
    var activities  = getActivities(user, this.props.activities)
    var verb        = primeVerb(activities)
    var activities_ = activities.filter(act => Act.verb(act) === verb)

    if (primeVerb === 'conflict') {
      return <ConflictHeader {...this.props} activities={activities_} />
    }

    var actors  = getActors(user, activities_)
    var names   = joinNames(user, actors)
    var verbed  = displayVerb(verb, actors)
    var ppl     = C.flatParticipants(conversation)
    var partStr = ppl.map(A.displayName).join(', ')

    return (
      <ListItem
        leftAvatar={actorAvatar(actors.first())}
        primaryText={`${names} ${verbed} "${conversation.subject}"`}
        secondaryText={<p>{partStr} — {Act.published(activities_.last()).fromNow()}</p>}
        onTouchTap={() => window.location = `#/conversations/${conversation.id}`}
        />
    )
  }
}

class ConflictHeader extends Sunshine.Component<{},HeaderProps,{}> {
  render(): React.Element {
    var { activities, conversation } = this.props
    var act = activities.last()
    return (
      <ListItem
        leftAvatar={<Avatar>!</Avatar>}
        primaryText={`Your edit to "${conversation.subject}" failed due to a conflict with another edit`}
        secondaryText={<p>{Act.published(act).fromNow()}</p>}
        onTouchTap={() => window.location = `#/conversations/${conversation.id}`}
        />
    )
  }
}

function primeVerb(activities: List<DerivedActivity>): string {
  var verb = ['conflict', 'post', 'reply', 'edit', 'like'].find(v => (
    activities.some(act => Act.verb(act) === v)
  ))
  return verb || Act.verb(activities.first())
}

function getActivities(user: ?URI, activities: List<DerivedActivity>): List<DerivedActivity> {
  var othersActivities = activities.filter(act => {
    var p = Act.actor(act)
    return !p || !user || (p.uri !== user)
  })
  return othersActivities.size > 0 ? othersActivities : activities
}

function getActors(user: ?URI, activities: List<DerivedActivity>): List<ActivityObject> {
  var actors = activities.map(act => Act.actor(act)).filter(p => !!p)
  return uniqBy(a => a.uri, actors)
}

function joinNames(user: ?URI, actors: List<ActivityObject>): string {
  var ns = actors.map((a, i) => displayName(user, a, i))
  if (ns.size === 2) {
    return ns.join(' and ')
  }
  else if (ns.size > 2) {
    return `${ns.pop().join(', ')}, and ${ns.last()}`
  }
  else {
    return ns.join(', ')
  }
}

function displayName(user: ?URI, actor: ?ActivityObject, idx: number): string {
  if (!actor) {
    return '[unknown person]'
  }
  else if (actor.uri === user) {
    return (idx === 0) ? 'You' : 'you'
  }
  else {
    return actor.displayName || '[unknown person]'
  }
}

function displayVerb(v: string, actors: List<ActivityObject>): string {
  if (v === 'reply') {
    return 'commented on'
  }
  else if (v === 'edit') {
    return 'edited'
  }
  else if (v === 'like') {
    return actors.size > 1 ? 'like' : 'likes'
  }
  else {
    return v+'ed'
  }
}
