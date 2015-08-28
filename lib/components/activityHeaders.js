/* @flow */

import * as Sunshine   from 'sunshine/react'
import React           from 'react'
import * as Act        from '../derivedActivity'
import * as C          from '../conversation'
import { displayName } from '../notmuch'
import { actorAvatar } from './avatar'
import { ListItem
       } from 'material-ui'

import type { DerivedActivity } from '../derivedActivity'
import type { Conversation }    from '../conversation'

export type HeaderProps = {
  activity: DerivedActivity,
  conversation: Conversation,
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
    var { activity, conversation } = this.props
    var actor = Act.actor(activity)
    var names = actor ? actor.displayName : '[error: no actor]'
    var verbed  = displayVerb(activity)
    return (
      <ListItem
        leftAvatar={actorAvatar(actor)}
        primaryText={`${names} ${verbed} ${conversation.subject}`}
        secondaryText={<p>{Act.published(activity).fromNow()}</p>}
        onTouchTap={() => window.location = `#/conversations/${conversation.id}`}
        />
    )
  }
}

class DefaultHeader extends Sunshine.Component<{},HeaderProps,{}> {
  render(): React.Element {
    var { activity, conversation } = this.props
    var ppl     = C.flatParticipants(conversation)
    var partStr = ppl.map(displayName).join(', ')
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

function displayVerb(activity: DerivedActivity): string {
  var v = Act.verb(activity)
  if (v === 'reply') {
    return 'commented on'
  }
  else if (v === 'edit') {
    return 'edited'
  }
  else if (v === 'like') {
    return 'likes'
  }
  else {
    return v+'ed'
  }
}
