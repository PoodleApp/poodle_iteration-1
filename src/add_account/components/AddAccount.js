/* @flow */

import * as Sunshine    from 'sunshine-framework/react'
import React            from 'react'
import { compose, get, lookup }  from 'safety-lens'
import { field }        from 'safety-lens/immutable'
import * as State       from '../../state'
import * as AS          from '../state'
import * as AE          from '../event'
import { FlatButton
       , Paper
       , TextField
       } from 'material-ui'

type AddAccountState = {
  email: ?string,
  loading: boolean;
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
      email:   get(compose(State.addAccountState, AS.email), state),
      loading: get(State.isLoading, state),
    }
  }

  render(): React.Element {
    if (!this.state.email) {
      return <GetEmail loading={this.state.loading} />
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

