/* @flow */

import * as Sunshine    from 'sunshine-framework/react'
import React            from 'react'
import { compose, get, lookup }  from 'safety-lens'
import * as State       from '../../state'
import * as AS          from '../state'
import * as AE          from '../event'
import { FlatButton
       , Paper
       , TextField
       } from 'material-ui'

type AddAccountState = {
  loading:   boolean,
  username:  ?string,
  useremail: ?string,
}

var styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
    whiteSpace: 'pre-wrap',
  }
}

export default class AddAccount extends Sunshine.Component<{},{},AddAccountState> {
  getState(state: State.AppState): AddAccountState {
    return {
      loading:   get(State.isLoading, state),
      username:  lookup(State.username, state),
      useremail: lookup(State.useremail, state),
    }
  }

  render(): React.Element {
    if (!this.state.useremail) {
      return <GetEmail loading={this.state.loading} />
    }
    else {
      return <AllDone {...this.state} />
    }
  }
}

class GetEmail extends Sunshine.Component<{},{ loading: boolean },{}> {
  render(): React.Element {
    return (
      <Paper>
        <form style={styles.body} onSubmit={this.onEmail.bind(this)}>
          <label>
            Enter your email address:&nbsp;
            <TextField
              hintText='hubert@planetexpress.com'
              name='email'
              ref='email'
              />
          </label>
          <FlatButton
            label='Continue'
            disabled={this.props.loading}
            onTouchTap={this.onEmail.bind(this)}
            />
        </form>
      </Paper>
    )
  }

  onEmail(event: Event) {
    event.preventDefault()
    var email = this.refs.email.getValue()
    this.emit(new AE.NewAccount(email))
  }
}

class AllDone extends Sunshine.Component<{},AddAccountState,{}> {
  render(): React.Element {
    var { loading, username, useremail } = this.props
    return (
      <Paper>
        <div style={styles.body}>
          <p>All done!</p>
          <p>Your account is: {username} &lt;{useremail}&gt;</p>
          <p>
            <FlatButton
              label='Continue to activity stream'
              disabled={loading}
              onTouchTap={this.onContinue.bind(this)}
              />
          </p>
        </div>
      </Paper>
    )
  }

  onContinue() {
    window.location = '#/'
  }
}
