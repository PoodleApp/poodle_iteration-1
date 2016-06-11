/* @flow */

import React                               from 'react'
import { connect }                         from 'react-redux'
import { go, goBack }                      from 'react-router-redux'
import { compose, get, lookup }            from 'safety-lens'
import { match, $ }                        from '../util/adt'
import { parseMidUri }                     from 'arfe/models/message'
import * as Act                            from 'arfe/derivedActivity'
import * as A                              from '../actions'
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
       , MenuItem
       , RefreshIndicator
       , Snackbar
       , Styles
       , TextField
       } from 'material-ui'
import ContentCreate from 'material-ui/svg-icons/content/create'
import ArrowBack     from 'material-ui/svg-icons/navigation/arrow-back'

import type { DerivedActivity } from 'arfe/derivedActivity'
import type { Conversation }    from 'arfe/conversation'
import type { Action }          from '../actions'
import type { State }           from '../reducers'

const { Spacing } = Styles

const styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
    whiteSpace: 'pre-wrap',
  }
}

type AppProps = {
  children:     React.Element[],
  dispatch:     (_: Action) => void,
  loading:      boolean,
  leftNavOpen:  boolean,
  editing:      ?DerivedActivity,
  error:        ?Error,
  notification: ?string,
  showLink:     ?DerivedActivity,
  username:     ?string,
  useremail:    ?string,
}

export class App extends React.Component<void,AppProps,void> {

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
    const {
      children,
      dispatch,
      editing,
      error,
      loading,
      leftNavOpen,
      notification,
      showLink,
      username,
      useremail,
    } = this.props
    const backButton = <IconButton onTouchTap={() => dispatch(goBack())}><ArrowBack /></IconButton>
    const title = 'Poodle'  // TODO
    const iconLeft = undefined  // TODO

    const styles = this.getStyles()
    // const { muiTheme } = (this.context:any)

    const menuOptions = !!useremail ? [
      { route: '/',            text: 'Activity Stream' },
      { route: '/settings',    text: 'Settings' },
    ] : [
      { route: '/',            text: 'Activity Stream' },
      { route: '/add_account', text: 'Set up account' },
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
                  <ContentCreate />
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
        <div style={styles.root}
             onClick={interceptMidUris.bind(null, dispatch)}
             className={loading ? 'wait' : ''}
             >
          <div style={styles.content}>
            {children}
          </div>
        </div>
        {error ? this.showError(error) : ''}
        {notification ? this.showNotification(notification) : ''}
        {loading ?
          <RefreshIndicator size={40} left={400} top={100} status="loading" /> : ''
        }
        {showLink ? this.showLink(showLink) : '' }
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
        onDismiss={() => this.props.dispatch(A.dismissNotify)}
        />
    )
  }

  showLink(activity: DerivedActivity): React.Element {
    const { dispatch } = this.props
    const actions = [
      { text: 'Ok', onTouchTap: () => dispatch(A.showLink(null)), ref: 'ok' }
    ]
    const uri = Act.getId(activity)
    const title = Act.getTitle(activity)
    const titleText = title ? title.get() : '[no title]'
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
          <TextField defaultValue={`[${titleText}](${uri})`} fullWidth={true} />
        </div>
      </Dialog>
    )
  }

  onCompose(event: Event, item: Object) {
    const activityType = item.props.value
    window.location = `#/compose/${activityType}`
  }

  onNavChange(route: string) {
    const { dispatch } = this.props
    dispatch(A.leftNavToggle(false))
    dispatch(go(route))
  }

  dismissError() {
    this.props.dispatch(A.dismissError)
  }

  leftNavToggle(open: ?boolean = null) {
    this.props.dispatch(A.leftNavToggle(open))
  }

}

function interceptMidUris(dispatch: (_: Action) => void, event: Event) {
  const href = (event.target:any).href
  const parsed = href && parseMidUri(href)
  if (parsed) {
    event.preventDefault()
    dispatch(go(`/activities/${encodeURIComponent(href)}`))
  }
}

function mapStateToProps({ config, chrome }: State): $Shape<AppProps> {
  const { username, useremail } = config
  const {
    error,
    leftNavOpen,
    notification,
    showLink,
  } = chrome
  return {
    loading:      false,  // TODO
    leftNavOpen,
    editing:      null,  // TODO
    error,
    notification,
    showLink,
    username,
    useremail,
  }
  // return {
  //   loading:      get(State.isLoading, state),
  //   leftNavOpen:  get(State.leftNavOpen, state),
  //   editing:      get(compose(State.composerState, CS.editing), state),
  //   error:        get(State.genericError, state),
  //   notification: get(State.notification, state),
  //   showLink:     get(State.showLink, state),
  //   username:     lookup(State.username, state),
  //   useremail:    lookup(State.useremail, state),
  // }
}

export default connect(mapStateToProps)(App)
