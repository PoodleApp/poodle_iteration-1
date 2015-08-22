/* @flow */

import * as Sunshine                       from 'sunshine/react'
import React                               from 'react'
import { compose, get, lookup }            from 'lens'
import * as Act                            from '../../../lib/derivedActivity'
import * as State                          from '../state'
import * as CS                             from '../../../lib/composer/state'
import * as Ev                             from '../event'
import { ComposeView }                     from '../../../lib/components/compose'
import Settings                            from '../../../lib/components/Settings'
import { Conversations, ConversationView } from '../../../lib/components/conversation'
import { AppBar
       , AppCanvas
       , Dialog
       , FlatButton
       , IconButton
       , IconMenu
       , LeftNav
       , RefreshIndicator
       , Snackbar
       , Styles
       , TextField
       } from 'material-ui'
import MenuItem      from 'material-ui/lib/menus/menu-item'
import ContentCreate from 'material-ui/lib/svg-icons/content/create'

import type { DerivedActivity } from '../../../lib/derivedActivity'
import type { Conversation } from '../../../lib/conversation'
import type { AppState }     from '../state'

var { Spacing } = Styles

var styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
    whiteSpace: 'pre-wrap',
  }
}

type AppComponentState = {
  view:         State.View,
  loading:      boolean,
  conversation: ?Conversation,
  editing:      ?DerivedActivity,
  error:        ?Object,
  notification: ?string,
  showLink:     ?DerivedActivity,
  username:     ?string,
  useremail:    ?string,
}

export class App extends Sunshine.Component<{},{},AppComponentState> {
  getState(state: AppState): AppComponentState {
    return {
      view:         get(State.view, state),
      loading:      get(State.isLoading, state),
      conversation: State.currentConversation(state),
      editing:      get(compose(State.composerState, CS.editing), state),
      error:        get(State.genericError, state),
      notification: get(State.notification, state),
      showLink:     get(State.showLink, state),
      username:     lookup(State.username, state),
      useremail:    lookup(State.useremail, state),
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
        // maxWidth: (Spacing.desktopKeylineIncrement * 14) + 'px',
        minHeight: '800px',
      }
    }
  }

  render(): React.Element {
    var { view, conversation, editing, loading, username, useremail } = this.state
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
      content = <ConversationView
                  conversation={conversation}
                  editing={editing}
                  username={username}
                  useremail={useremail}
                  loading={loading}
                  />
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
        {this.state.loading ?
          <RefreshIndicator size={40} left={400} top={100} status="loading" /> : ''
        }
        {this.state.showLink ? this.showLink(this.state.showLink) : '' }
      </AppCanvas>
    )
  }

  showError(error: Object): React.Element {
    var actions = [
      { text: 'Ok', onTouchTap: this.dismissError.bind(this), ref: 'ok' }
    ]
    return (
      <Dialog
        title='Excuse me,'
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

  showLink(activity: DerivedActivity): React.Element {
    var actions = [
      { text: 'Ok', onTouchTap: () => this.emit(new Ev.ShowLink(null)), ref: 'ok' }
    ]
    var uri = Act.activityId(activity)
    var title = Act.title(activity)
    return (
      <Dialog
        title='Link to activity'
        actions={actions}
        actionFocus='ok'
        openImmediately={true}
        >
        <div style={styles.body}>
          <p>Use URI below to link to this activity.</p>
          <TextField defaultValue={uri} fullWidth={true} />
          <p>To insert a link in another message, copy & paste the snippet below.</p>
          <TextField defaultValue={`[${title}](${uri})`} fullWidth={true} />
        </div>
      </Dialog>
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

