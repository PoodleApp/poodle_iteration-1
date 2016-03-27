/* @flow */

import * as Sunshine                  from 'sunshine-framework/react'
import React                          from 'react'
import * as m                         from 'mori'
import { join, uniqBy }               from '../util/mori'
import { catMaybes }                  from '../util/maybe'
import * as Act                       from 'arfe/derivedActivity'
import * as C                         from 'arfe/conversation'
import * as A                         from 'arfe/models/address'
import * as ViewEvent                 from '../event/viewEvent'
import { actorAvatar, addressAvatar } from './avatar'
import { Avatar
       , ListItem
       } from 'material-ui'

import type { Seq, Seqable, Vector } from 'mori'
import type { DerivedActivity }      from 'arfe/derivedActivity'
import type { Conversation }         from 'arfe/conversation'
import type { ActivityObject, URI }  from 'arfe/activity'

export type HeaderProps = {
  activities: Seqable<DerivedActivity>,
  conversation: Conversation,
  user: ?URI,
}

export class ActivityHeader extends Sunshine.Component<{},HeaderProps,{}> {
  render(): React.Element {
    const { conversation, user } = this.props
    const activities  = getActivities(user, this.props.activities)
    const verb        = primeVerb(activities)
    const activities_ = m.filter(act => Act.verb(act) === verb, activities)

    if (primeVerb === 'conflict') {
      return <ConflictHeader {...this.props} activities={activities_} />
    }

    const actors  = getActors(user, activities_)
    const names   = joinNames(user, actors)
    const verbed  = displayVerb(verb, actors)
    const ppl     = C.flatParticipants(conversation)
    const partStr = join(', ', m.map(A.displayName, ppl))
    const last    = m.last(activities_)

    if (!last) { throw "no last activity" }

    return (
      <ListItem
        leftAvatar={actorAvatar(m.first(actors))}
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
    const act = m.last(activities)
    const published = act ? Act.published(act).fromNow() : ''
    return (
      <ListItem
        leftAvatar={<Avatar>!</Avatar>}
        primaryText={`Your edit to "${conversation.subject}" failed due to a conflict with another edit`}
        secondaryText={<p>{published}</p>}
        onTouchTap={() => this.onSelect(conversation)}
        />
    )
  }

  onSelect(conversation: Conversation) {
    this.emit(new ViewEvent.ViewConversation(conversation.id))
  }
}

function primeVerb(activities: Seqable<DerivedActivity>): string {
  const verb = ['conflict', 'post', 'reply', 'edit', 'like'].find(v => (
    m.some(act => Act.verb(act) === v, activities)
  ))
  const first = m.first(activities)
  if (!first) { throw "no activities" }
  return verb || Act.verb(first)
}

function getActivities(user: ?URI, activities: Seqable<DerivedActivity>): Seqable<DerivedActivity> {
  const othersActivities = m.filter(act => {
    const p = Act.actor(act)
    return !p || !user || (p.uri !== user)
  }, activities)
  return !m.isEmpty(othersActivities) ? othersActivities : activities
}

function getActors(user: ?URI, activities: Seqable<DerivedActivity>): Seq<ActivityObject> {
  const actors = catMaybes(m.map(Act.actor, activities))
  return uniqBy(a => a.uri, actors)
}

function joinNames(user: ?URI, actors: Seqable<ActivityObject>): string {
  const ns = m.mapIndexed((idx, a) => displayName(user, a, idx), actors)
  const count = m.count(ns)
  if (count === 2) {
    return join(' and ', ns)
  }
  else if (count > 2) {
    return `${join(', ', m.take(count - 1, ns))}, and ${m.last(ns)}`
  }
  else {
    return join(', ', ns)
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

function displayVerb(v: string, actors: Seqable<ActivityObject>): string {
  if (v === 'reply') {
    return 'commented on'
  }
  else if (v === 'edit') {
    return 'edited'
  }
  else if (v === 'like') {
    return m.count(actors) > 1 ? 'like' : 'likes'
  }
  else {
    return v+'ed'
  }
}
