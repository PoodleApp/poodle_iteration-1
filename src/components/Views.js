/* @flow */

import * as Sunshine                       from 'sunshine-framework/react'
import React                               from 'react'
import { compose, get, lookup }            from 'safety-lens'
import { parseMidUri }                     from '../models/message'
import * as Act                            from '../derivedActivity'
import * as State                          from '../state'
import * as CS                             from '../composer/state'
import * as Ev                             from '../event'
import { ComposeView }                     from './compose'
import Settings                            from './Settings'
import { Conversations, ConversationView } from './conversation'
import AddAccount                          from '../add_account/components/AddAccount'
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
import ArrowBack     from 'material-ui/lib/svg-icons/navigation/arrow-back'

import type { DerivedActivity } from '../derivedActivity'
import type { Conversation }    from '../conversation'
import type { AppState }        from '../state'

var { Spacing } = Styles

var styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
    whiteSpace: 'pre-wrap',
  }
}

type AppComponentState = {
  view:         ?State.View,
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
      view:         lookup(State.view, state),
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
        paddingBottom: '25em',
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
    var iconLeft = <IconButton onTouchTap={() => window.history.back()}><ArrowBack /></IconButton>
    var title = 'Activity Stream'

    if (view === 'root') {
      content  = <Conversations/>
      selected = 0
      iconLeft = undefined
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
    else if (view === 'add_account') {
      content = <AddAccount />
      title = 'Set up new account'
    }

    var styles = this.getStyles()
    var { muiTheme } = (this.context:any)

    var menuItems = !!this.state.useremail ?
      [
        { route: '#/',            text: 'Activity Stream' },
        { route: '#/settings',    text: 'Settings' },
      ] :
      [
        { route: '#/',            text: 'Activity Stream' },
        { route: '#/add_account', text: 'Set up account' },
      ];

    return (
      <AppCanvas>
        <AppBar
          title={title}
          iconElementLeft={iconLeft}
          onLeftIconButtonTouchTap={() => this.refs.leftNav.toggle()}
          iconElementRight={
            <IconMenu
              iconButtonElement={
                <IconButton>
                  <ContentCreate color={muiTheme.appBar.textColor} />
                </IconButton>
              }
              onItemTouchTap={this.onCompose.bind(this)}
              >
              <MenuItem value='note'     primaryText='Discussion' />
              <MenuItem value='document' primaryText='Document' />
            </IconMenu>
          }
          />
        <LeftNav
          ref='leftNav'
          docked={false}
          onChange={this.navChange.bind(this)}
          selectedIndex={selected} menuItems={menuItems} />
        <div style={styles.root} onClick={interceptMidUris} className={loading ? 'wait' : ''}>
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

function interceptMidUris(event: Event) {
  var href = (event.target:any).href
  var parsed = href && parseMidUri(href)
  if (parsed) {
    event.preventDefault()
    window.location = `#/activities/${encodeURIComponent(href)}`
  }
}
