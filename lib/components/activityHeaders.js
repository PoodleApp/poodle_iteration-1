/* @flow */

import * as Sunshine   from 'sunshine/react'
import React           from 'react'
import { List }        from 'immutable'
import { uniq }        from 'ramda'
import * as Act        from '../derivedActivity'
import * as C          from '../conversation'
import * as N          from '../notmuch'
import { actorAvatar, addressAvatar } from './avatar'
import { ListItem
       } from 'material-ui'

import type { DerivedActivity }     from '../derivedActivity'
import type { Conversation }        from '../conversation'
import type { ActivityObject, URI } from '../activity'

export type HeaderProps = {
  activity: DerivedActivity,
  conversation: Conversation,
  user: ?URI,
}

export class ActivityHeader extends Sunshine.Component<{},HeaderProps,{}> {
  render(): React.Element {
    return (
      <VerbHeader {...this.props} />
    )
  }
}

class VerbHeader extends Sunshine.Component<{},HeaderProps,{}> {
  render(): React.Element {
    var { activity, conversation, user } = this.props
    var actors  = getActors(activity)
    var names   = joinNames(user, actors)
    var verbed  = displayVerb(activity, actors)
    var ppl     = C.flatParticipants(conversation)
    var partStr = ppl.map(N.displayName).join(', ')
    return (
      <ListItem
        leftAvatar={actorAvatar(actors.first())}
        primaryText={`${names} ${verbed} "${conversation.subject}"`}
        secondaryText={<p>{partStr}</p>}
        onTouchTap={() => window.location = `#/conversations/${conversation.id}`}
        />
    )
  }
}

class DefaultHeader extends Sunshine.Component<{},HeaderProps,{}> {
  render(): React.Element {
    var { activity, conversation } = this.props
    var ppl     = C.flatParticipants(conversation)
    var partStr = ppl.map(N.displayName).join(', ')
    var first   = ppl[0]
    return (
      <ListItem
        leftAvatar={addressAvatar(first)}
        primaryText={conversation.subject}
        secondaryText={<p>{partStr}</p>}
        onTouchTap={() => window.location = `#/conversations/${conversation.id}`}
        />
    )
  }
}

function getActors(activity: DerivedActivity): List<ActivityObject> {
  var actor = Act.actor(activity)
  if (actor && actor.objectType === 'person') {
    return List.of(actor)
  }
  else if (actor && actor.objectType === 'collection') {
    return actor.inline
  }
  else {
    return List()
  }
}

function joinNames(user: ?URI, actors: List<ActivityObject>): string {
  var ns = List(uniq(actors.map((a, i) => displayName(user, a, i)).toArray()))
  if (ns.size > 2) {
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

function displayVerb(activity: DerivedActivity, actors: List<ActivityObject>): string {
  var v = Act.verb(activity)
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
