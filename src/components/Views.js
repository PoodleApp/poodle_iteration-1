/* @flow */

import * as Sunshine                       from 'sunshine-framework/react'
import React                               from 'react'
import { compose, get, lookup }            from 'safety-lens'
import { match, $ }                        from '../util/adt'
import { parseMidUri }                     from 'arfe/models/message'
import * as Act                            from 'arfe/derivedActivity'
import * as State                          from '../state'
import * as ViewState                      from '../state/ViewState.js'
import * as CS                             from '../composer/state'
import * as Ev                             from '../event'
import * as ViewEvent                      from '../event/viewEvent'
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

import type { DerivedActivity } from 'arfe/derivedActivity'
import type { Conversation }    from 'arfe/conversation'
import type { AppState }        from '../state'

const { Spacing } = Styles

const styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
    whiteSpace: 'pre-wrap',
  }
}

type AppComponentState = {
  view:         ViewState.View,
  loading:      boolean,
  leftNavOpen:  boolean,
  editing:      ?DerivedActivity,
  error:        ?string,
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
      leftNavOpen:  get(State.leftNavOpen, state),
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
    const { view, editing, loading, leftNavOpen, username, useremail } = this.state
    const backButton = <IconButton onTouchTap={() => this.emit(new ViewEvent.PopView)}><ArrowBack /></IconButton>

    const { content, iconLeft, title } = match(
      $(ViewState.RootView, ({ searchQuery, conversations }) => ({
        content:  <Conversations />,
        iconLeft: undefined,
        title:    'Activity Stream',
      })),
      $(ViewState.ConversationView, ({ id, uri, conversation }) => {
        if (!useremail) { throw "email address is required" }  // TODO
        return {
          content: <ConversationView
                    conversation={conversation}
                    editing={editing}
                    username={username || '<no name>'}
                    useremail={useremail}
                    loading={loading}
                    />,
          iconLeft: backButton,
          title: conversation ? conversation.subject : '...',
        }
      }),
      $(ViewState.ComposeView, () => ({
        content: <ComposeView />,
        iconLeft: backButton,
        title: 'New Activity',
      })),
      $(ViewState.SettingsView, () => ({
        content: <Settings />,
        iconLeft: backButton,
        title: 'Settings',
      })),
      $(ViewState.AddAccountView, () => ({
        content: <AddAccount />,
        iconLeft: backButton,
        title: 'Set up an account',
      }))
    )(view)

    const styles = this.getStyles()
    const { muiTheme } = (this.context:any)

    const menuOptions = !!this.state.useremail ? [
      { route: '#/',            text: 'Activity Stream' },
      { route: '#/settings',    text: 'Settings' },
    ] : [
      { route: '#/',            text: 'Activity Stream' },
      { route: '#/add_account', text: 'Set up account' },
    ];
    const menuItems = menuOptions.map(({ route, text }) => (
      <MenuItem key={route} onTouchTap={() => this.onNavChange(route)}>{text}</MenuItem>
    ))

    return (
      <AppCanvas>
        <AppBar
          title={title}
          iconElementLeft={iconLeft}
          onLeftIconButtonTouchTap={() => this.leftNavToggle()}
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
          open={leftNavOpen}
          docked={false}
          onRequestChange={(s) => this.leftNavToggle(s)}
          >
          {menuItems}
        </LeftNav>
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

  showError(error: string): React.Element {
    const actions = [
      <FlatButton label='Ok' primary={true} onTouchTap={this.dismissError.bind(this)} />
    ]
    return (
      <Dialog
        title='Excuse me,'
        actions={actions}
        open={!!error}
        >
        <p style={styles.body}>{error}</p>
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
    const actions = [
      { text: 'Ok', onTouchTap: () => this.emit(new Ev.ShowLink(null)), ref: 'ok' }
    ]
    const uri = Act.activityId(activity)
    const title = Act.title(activity)
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

  onCompose(event: Event, item: Object) {
    const activityType = item.props.value
    window.location = `#/compose/${activityType}`
  }

  onNavChange(route: string) {
    this.emit(new Ev.LeftNavToggle(false))
    window.location = route
  }

  dismissError() {
    this.emit(new Ev.DismissError())
  }

  leftNavToggle(open: ?boolean = null) {
    this.emit(new Ev.LeftNavToggle(open))
  }

}

App.contextTypes = {
  _sunshineApp: React.PropTypes.instanceOf(Sunshine.Session),
  muiTheme:     React.PropTypes.object,
}

function interceptMidUris(event: Event) {
  const href = (event.target:any).href
  const parsed = href && parseMidUri(href)
  if (parsed) {
    event.preventDefault()
    window.location = `#/activities/${encodeURIComponent(href)}`
  }
}
