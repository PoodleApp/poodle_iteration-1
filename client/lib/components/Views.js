/* @flow */

import * as Sunshine   from 'sunshine/react'
import React           from 'react'
import { get, lookup } from 'lens'
import repa            from 'repa'
import * as State      from '../state'
import * as Ev         from '../event'
import { AppBar
       , Avatar
       , Card
       , CardHeader
       , FlatButton
       , LeftNav
       , Paper
       , RefreshIndicator
       , TextField
       , Toolbar
       , ToolbarGroup
       , ToolbarTitle
       } from 'material-ui'

import type { List } from 'immutable'
import type { Conversation, Message, Attachment } from '../../../lib/notmuch'
import type { URI } from '../../../lib/activity'
import type { AppState } from '../state'

type AppComponentState = {
  view: State.View,
  params: Object,
  focus: ?Focus,
}

type Focus = { conv: Conversation, msg: ?Message, part: ?Attachment }

export class App extends Sunshine.Component<{},{},AppComponentState> {
  getState(state: AppState): AppComponentState {
    var params = get(State.routeParams, state)
    return {
      view: get(State.view, state),
      params,
      focus: params.uri ? State.lookupUri(params.uri, state) : null,
    }
  }

  render(): React.Element {
    var { view, focus } = this.state
    var content, selected
    var title = 'Activity Stream'

    if (view === 'root') {
      content  = <Conversations/>
      selected = 0
    }
    else if (view === 'conversation') {
      content = <ConversationView focus={focus} />
      if (focus) { title = focus.conv.subject }
    }

    return (
      <div>
        <AppBar title={title} onLeftIconButtonTouchTap={() => this.refs.leftNav.toggle()} />
        {content}
        <LeftNav
          ref="leftNav"
          docked={false}
          onChange={this.navChange.bind(this)}
          selectedIndex={selected} menuItems={[
            { route: '#/',         text: 'Activity Stream' },
            { route: '#/settings', text: 'Settings', disabled: true },
          ]} />
      </div>
    )
  }

  componentDidMount() {
    super.componentDidMount()
    this.refs.leftNav.close()
  }

  navChange(event: Event, selectedIndex: number, menuItem: { route: string }) {
    window.location = menuItem.route
  }

}

type ConversationMeta = {
  uri: URI,
  subject: string,
  participants: string[],
  lastActive: string,
}

type ConversationsState = {
  conversations: List<ConversationMeta>,
  loading: boolean,
}

export class Conversations extends Sunshine.Component<{},{},ConversationsState> {
  getState(state: AppState): ConversationsState {
    return {
      conversations: get(State.conversations, state).map(conv => ({
        uri:          `mid:${conv.id}`,
        subject:      conv.subject,
        participants: State.participants(conv),
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
        {this.state.loading ?
          <RefreshIndicator size={40} left={30} top={30} status="loading" /> : ''
        }
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
    var { subject, participants, lastActive, uri } = this.props.conv
    return (
      <div>
        <br/>
        <a href={`#/conversations/${uri}`}>
        <Card>
          <CardHeader
            title={subject}
            subtitle={participants.join(', ')}
            avatar={<Avatar>N</Avatar>}
            />
        </Card>
        </a>
      </div>
    )
  }
}

class ConversationView extends Sunshine.Component<{},{ focus: ?Focus },{}> {
  render(): React.Element {
    var focus = this.props.focus
    if (!focus) {
      return <p>not found</p>
    }

    var { conv } = focus
    var { subject } = conv
    var activities = conv.messages.map(msg => (
      <ActivityView activity={msg} key={msg.id} />
    ))

    return (
      <div>
        <br/>
        {activities}
      </div>
    )
  }
}

class ActivityView extends Sunshine.Component<{},{ activity: Message },{}> {
  render(): React.Element {
    var { date_relative, from, html, text } = this.props.activity
    var fromStr = from[0].name || from[0].address
    var body    = text ? repa(text) : html
    return (
      <Paper>
        <CardHeader
          title={fromStr}
          subtitle={date_relative}
          avatar={<Avatar>{fromStr[0]}</Avatar>}
          />
        <pre style={{padding:'16px'}}>{body}</pre>
      </Paper>
    )
  }
}
