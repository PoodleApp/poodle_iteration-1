/* @flow */

import * as Sunshine                 from 'sunshine/react'
import React                         from 'react'
import { get, lookup }               from 'lens'
import { activityId }                from '../../../lib/activity'
import * as State                    from '../state'
import * as Ev                       from '../event'
import { ActivityView }              from './activities'
import { ComposeReply, ComposeView } from '../../../lib/components/compose'
import Settings                      from '../../../lib/components/Settings'
import { AppBar
       , AppCanvas
       , Avatar
       , Card
       , CardHeader
       , Dialog
       , FlatButton
       , IconButton
       , IconMenu
       , LeftNav
       , Paper
       , RefreshIndicator
       , Snackbar
       , Styles
       , TextField
       , Toolbar
       , ToolbarGroup
       , ToolbarTitle
       } from 'material-ui'
import MenuItem      from 'material-ui/lib/menus/menu-item'
import ContentCreate from 'material-ui/lib/svg-icons/content/create'

import type { List } from 'immutable'
import type { Activity, Conversation, URI } from '../../../lib/activity'
import type { AppState } from '../state'

var { Spacing } = Styles

var styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
    whiteSpace: 'pre-wrap',
  }
}

type AppComponentState = {
  view: State.View,
  conversation: ?Conversation,
  error: ?Object,
  notification: ?string,
}

export class App extends Sunshine.Component<{},{},AppComponentState> {
  getState(state: AppState): AppComponentState {
    return {
      view: get(State.view, state),
      conversation: State.currentConversation(state),
      error: get(State.genericError, state),
      notification: get(State.notification, state),
    }
  }

  getStyles(): Object {
    return {
      root: {
        paddingTop: Spacing.desktopKeylineIncrement + 'px',
        position: 'relative',
      },
      content: {
        boxSizing: 'border-box',
        padding: Spacing.desktopGutter + 'px',
        maxWidth: (Spacing.desktopKeylineIncrement * 14) + 'px',
        minHeight: '800px',
      }
    }
  }

  render(): React.Element {
    var { view, conversation } = this.state
    var content, selected
    var title = 'Activity Stream'

    if (view === 'root') {
      content  = <Conversations/>
      selected = 0
    }
    else if (view === 'compose') {
      content = <ComposeView />
      title = 'New Activity'
    }
    else if (view === 'conversation') {
      content = <ConversationView conversation={conversation} />
      if (conversation) { title = conversation.subject }
    }
    else if (view === 'settings') {
      content = <Settings />
      title = 'Settings'
    }

    var styles = this.getStyles()
    var { muiTheme } = (this.context:any)

    return (
      <AppCanvas>
        <AppBar
          title={title}
          onLeftIconButtonTouchTap={() => this.refs.leftNav.toggle()}
          iconElementRight={
            <IconMenu
              iconButtonElement={
                <IconButton>
                  <ContentCreate color={muiTheme.component.appBar.textColor} />
                </IconButton>
              }
              onItemTouchTap={this.onCompose.bind(this)}
              >
              <MenuItem value='note' primaryText='Note' />
            </IconMenu>
          }
          />
        <LeftNav
          ref='leftNav'
          docked={false}
          onChange={this.navChange.bind(this)}
          selectedIndex={selected} menuItems={[
            { route: '#/',         text: 'Activity Stream' },
            { route: '#/settings', text: 'Settings' },
          ]} />
        <div style={styles.root}>
          <div style={styles.content}>
            {content}
          </div>
        </div>
        {this.state.error ? this.showError(this.state.error) : ''}
        {this.state.notification ? this.showNotification(this.state.notification) : ''}
      </AppCanvas>
    )
  }

  showError(error: Object): React.Element {
    var actions = [
      { text: 'Ok', onTouchTap: this.dismissError.bind(this), ref: 'ok' }
    ]
    return (
      <Dialog
        title='An error occurred'
        actions={actions}
        actionFocus='ok'
        openImmediately={true}
        >
        <p style={styles.body}>{String(error)}</p>
      </Dialog>
    )
  }

  showNotification(message: string): React.Element {
    return (
      <Snackbar
        message={message}
        openOnMount={true}
        onDismiss={() => this.emit(new Ev.DismissNotify())}
        />
    )
  }

  componentDidMount() {
    super.componentDidMount()
    this.refs.leftNav.close()
  }

  navChange(event: Event, selectedIndex: number, menuItem: { route: string }) {
    window.location = menuItem.route
  }

  onCompose(event: Event, item: Object) {
    var activityType = item.props.value
    window.location = `#/compose/${activityType}`
  }

  dismissError() {
    this.emit(new Ev.DismissError())
  }

}

App.contextTypes = {
  _sunshineApp: React.PropTypes.instanceOf(Sunshine.App),
  muiTheme:     React.PropTypes.object,
}

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
  getState(state: AppState): ConversationsState {
    return {
      conversations: get(State.conversations, state).map(conv => ({
        id:           conv.id,
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
          <RefreshIndicator size={40} left={400} top={100} status="loading" /> : ''
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

class ConversationView extends Sunshine.Component<{},{ conversation: ?Conversation },{}> {
  render(): React.Element {
    var conversation = this.props.conversation
    if (!conversation) {
      return <p>not found</p>
    }

    var { subject } = conversation
    var activities = conversation.activities.map(act => (
      <ActivityView activity={act} key={activityId(act)} />
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
