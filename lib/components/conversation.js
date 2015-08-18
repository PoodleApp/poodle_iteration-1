/* @flow */

import * as Sunshine    from 'sunshine/react'
import React            from 'react'
import { get, lookup }  from 'lens'
import { activityId }   from '../activity'
import { allNames }     from '../conversation'
import * as State       from '../../client/lib/state'
import * as Ev          from '../../client/lib/event'
import { ActivityView } from '../../client/lib/components/activities'
import { ComposeReply } from './compose'
import { Avatar
       , Card
       , CardHeader
       , FlatButton
       , Paper
       , TextField
       , Toolbar
       , ToolbarGroup
       , ToolbarTitle
       } from 'material-ui'

import type { List }          from 'immutable'
import type { Activity, URI } from '../activity'
import type { Conversation }  from '../conversation'

type ConversationMeta = {
  id: string,
  subject: string,
  participants: string[],
  lastActive: string,
}

type ConversationsState = {
  conversations: List<ConversationMeta>,
  loading: boolean,
}

export class Conversations extends Sunshine.Component<{},{},ConversationsState> {
  getState(state: State.AppState): ConversationsState {
    return {
      conversations: get(State.conversations, state).map(conv => ({
        id:           conv.id,
        subject:      conv.subject,
        participants: allNames(conv),
        lastActive:   State.lastActive(conv),
      })),
      loading: get(State.isLoading, state),
    }
  }

  render(): React.Element {
    var conversations = this.state.conversations.map(conv => (
      <ConversationHeader conv={conv} key={conv.id} />
    ))
    return (
      <div>
        <Toolbar>
          <ToolbarGroup key={0} float='left'>
            <form onSubmit={this.onSearch.bind(this)}>
              <label>
              <ToolbarTitle text='Enter notmuch query'/>
              <TextField
                hintText='date:1week..'
                defaultValue='date:1week..'
                ref='query'
                />
              </label>
              &nbsp;
              <FlatButton label='Search' disabled={this.state.loading} onTouchTap={this.onSearch.bind(this)} />
            </form>
          </ToolbarGroup>
        </Toolbar>
        <section>{conversations}</section>
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
    var partStr = participants.join(', ')
    return (
      <div>
        <br/>
        <a href={`#/conversations/${id}`}>
        <Card>
          <CardHeader
            title={subject}
            subtitle={partStr}
            avatar={<Avatar>{partStr[0]}</Avatar>}
            />
        </Card>
        </a>
      </div>
    )
  }
}

export class ConversationView extends Sunshine.Component<{},{ conversation: ?Conversation },{}> {
  render(): React.Element {
    var conversation = this.props.conversation
    if (!conversation) {
      return <p>not found</p>
    }

    var { subject } = conversation
    var activities = conversation.activities.map(act => (
      <ActivityView activity={act} {...this.props} key={activityId(act)} />
    ))

    return (
      <div>
        <br/>
        {activities}
        <ComposeReply inReplyTo={conversation} />
      </div>
    )
  }
}
