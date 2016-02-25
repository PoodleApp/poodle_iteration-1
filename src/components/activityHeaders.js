/* @flow */

import * as Sunshine   from 'sunshine-framework/react'
import React           from 'react'
import { List }        from 'immutable'
import { uniqBy }      from '../util/immutable'
import * as Act        from '../derivedActivity'
import * as C          from '../conversation'
import * as A          from '../models/address'
import * as ViewEvent  from '../event/viewEvent'
import { actorAvatar, addressAvatar } from './avatar'
import { Avatar
       , ListItem
       } from 'material-ui'

import type { IndexedIterable, IndexedSeq } from 'immutable'
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
    const { conversation, user } = this.props
    const activities  = getActivities(user, this.props.activities)
    const verb        = primeVerb(activities)
    const activities_ = activities.filter(act => Act.verb(act) === verb)

    if (primeVerb === 'conflict') {
      return <ConflictHeader {...this.props} activities={activities_} />
    }

    const actors  = getActors(user, activities_)
    const names   = joinNames(user, actors)
    const verbed  = displayVerb(verb, actors)
    const ppl     = C.flatParticipants(conversation)
    const partStr = ppl.map(A.displayName).join(', ')
    const last    = activities_.last()

    if (!last) { throw "no last activity" }

    return (
      <ListItem
        leftAvatar={actorAvatar(actors.first())}
        primaryText={`${names} ${verbed} "${conversation.subject}"`}
        secondaryText={<p>{partStr} — {Act.published(last).fromNow()}</p>}
        onTouchTap={() => this.onSelect(conversation)}
        />
    )
  }

  onSelect(conversation: Conversation) {
    this.emit(new ViewEvent.ViewConversation(conversation.id))
  }
}

class ConflictHeader extends Sunshine.Component<{},HeaderProps,{}> {
  render(): React.Element {
    const { activities, conversation } = this.props
    const act = activities.last()
    return (
      <ListItem
        leftAvatar={<Avatar>!</Avatar>}
        primaryText={`Your edit to "${conversation.subject}" failed due to a conflict with another edit`}
        secondaryText={<p>{Act.published(act).fromNow()}</p>}
        onTouchTap={() => this.onSelect(conversation)}
        />
    )
  }

  onSelect(conversation: Conversation) {
    this.emit(new ViewEvent.ViewConversation(conversation.id))
  }
}

function primeVerb(activities: List<DerivedActivity>): string {
  const verb = ['conflict', 'post', 'reply', 'edit', 'like'].find(v => (
    activities.some(act => Act.verb(act) === v)
  ))
  const first = activities.first()
  if (!first) { throw "no activities" }
  return verb || Act.verb(first)
}

function getActivities(user: ?URI, activities: List<DerivedActivity>): List<DerivedActivity> {
  const othersActivities = activities.filter(act => {
    const p = Act.actor(act)
    return !p || !user || (p.uri !== user)
  })
  return othersActivities.size > 0 ? othersActivities : activities
}

function getActors(user: ?URI, activities: IndexedIterable<DerivedActivity>): IndexedSeq<ActivityObject> {
  const actors = activities.map(act => Act.actor(act)).filter(p => !!p)
  return uniqBy(a => a.uri, actors)
}

function joinNames(user: ?URI, actors: IndexedIterable<ActivityObject>): string {
  const ns = actors.map((a, i) => displayName(user, a, i))
  if (ns.count() === 2) {
    return ns.join(' and ')
  }
  else if (ns.count() > 2) {
    return `${ns.butLast().join(', ')}, and ${ns.last()}`
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

function displayVerb(v: string, actors: IndexedIterable<ActivityObject>): string {
  if (v === 'reply') {
    return 'commented on'
  }
  else if (v === 'edit') {
    return 'edited'
  }
  else if (v === 'like') {
    return actors.count() > 1 ? 'like' : 'likes'
  }
  else {
    return v+'ed'
  }
}
