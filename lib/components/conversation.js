/* @flow */

import * as Sunshine    from 'sunshine/react'
import React            from 'react'
import { get, lookup }  from 'lens'
import { activityId }   from '../derivedActivity'
import { allNames, flatAsides, flatParticipants, lastActive } from '../conversation'
import { displayName }  from '../notmuch'
import * as State       from '../../client/lib/state'
import * as Ev          from '../../client/lib/event'
import { ActivityView } from '../../client/lib/components/activities'
import { ComposeReply } from './compose'
import { addressAvatar } from './avatar'
import { Card
       , CardHeader
       , RaisedButton
       , List as ListWidget
       , ListDivider
       , ListItem
       , Paper
       , Styles
       , TextField
       , Toolbar
       , ToolbarGroup
       , ToolbarTitle
       } from 'material-ui'

import type { List }          from 'immutable'
import type { Address }       from '../notmuch'
import type { Activity, URI } from '../activity'
import type { Conversation }  from '../conversation'

type ConversationMeta = {
  id: string,
  subject: string,
  participants: Address[],
  lastActive: string,
}

type ConversationsState = {
  conversations: List<ConversationMeta>,
  loading: boolean,
}

var { Colors, Spacing } = Styles

export class Conversations extends Sunshine.Component<{},{},ConversationsState> {
  getState(state: State.AppState): ConversationsState {
    return {
      conversations: get(State.conversations, state).map(conv => ({
        id:           conv.id,
        subject:      conv.subject,
        participants: flatParticipants(conv),
        lastActive:   lastActive(conv),
      })),
      loading: get(State.isLoading, state),
    }
  }

  render(): React.Element {
    var conversations = this.state.conversations.map((conv, i) => (
      <div key={conv.id}>
        <ConversationHeader conv={conv} />
        {i < this.state.conversations.size - 1 ?
          <ListDivider inset={true} /> : ''}
      </div>
    ))
    return (
      <div>
        <Toolbar>
          <ToolbarGroup key={0} float='left'>
            <form onSubmit={this.onSearch.bind(this)}>
              <label>
              <ToolbarTitle text='Enter notmuch query'/>
              <TextField
                hintText='date:2days..'
                defaultValue='date:2days..'
                ref='query'
                />
              </label>
              &nbsp;
              <RaisedButton label='Search' disabled={this.state.loading} onTouchTap={this.onSearch.bind(this)} />
            </form>
          </ToolbarGroup>
        </Toolbar>
        <ListWidget>{conversations}</ListWidget>
      </div>
    )
  }

  onSearch(event: Event) {
    event.preventDefault()
    this.emit(new Ev.QueryConversations(this.refs.query.getValue()))
  }
}

class ConversationHeader extends Sunshine.Component<{},{ conv: ConversationMeta },{}> {
  render(): React.Element {
    var { id, subject, participants, lastActive } = this.props.conv
    var partStr = participants.map(p => displayName(p)).join(', ')
    var first = participants[0]
    return (
      <ListItem
        leftAvatar={addressAvatar(first)}
        primaryText={subject}
        secondaryText={<p>{partStr}</p>}
        onTouchTap={() => window.location = `#/conversations/${id}`}
        />
    )
  }
}

export class ConversationView extends Sunshine.Component<{},{ conversation: ?Conversation },{}> {
  getStyles(): Object {
    var participantListWidth = Spacing.desktopKeylineIncrement * 4 + 'px'
    var { palette } = this.context.muiTheme
    var styles = {
      body: {
        padding: '16px',
        paddingTop: 0,
        whiteSpace: 'pre-wrap',
      },
      mainSection: {
        marginRight: participantListWidth,
      },
      participantList: {
        position: 'absolute',
        top: '88px',
        right: 0,
        width: participantListWidth,
        borderLeft: 'solid 1px '+ palette.borderColor,
      },
    }
    return styles
  }

  render(): React.Element {
    var conversation = this.props.conversation
    if (!conversation) {
      return <p>not found</p>
    }

    var styles = this.getStyles()
    var { subject } = conversation

    var activities = conversation.activities.map(act => (
      <ActivityView activity={act} {...this.props} key={activityId(act)} />
    ))

    var people = flatParticipants(conversation).map(addr => {
      var disp = displayName(addr)
      return (
        <ListItem
          leftAvatar={addressAvatar(addr)}
          primaryText={disp}
          secondaryText={addr.address}
          disabled={true}
          key={addr.address}
          />
      )
    })

    return (
      <div>
        <div style={styles.mainSection}>
          <br/>
          {activities}
          <ComposeReply inReplyTo={conversation} />
        </div>
        <div style={styles.participantList}>
          <ListWidget subheader='Who can see this discussion'>
            {people}
          </ListWidget>
        </div>
      </div>
    )
  }
}

ConversationView.contextTypes = {
  _sunshineApp: React.PropTypes.instanceOf(Sunshine.App).isRequired,
  muiTheme: React.PropTypes.object.isRequired,
}
