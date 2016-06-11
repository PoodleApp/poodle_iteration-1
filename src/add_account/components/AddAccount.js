/* @flow */

import React                    from 'react'
import { connect }              from 'react-redux'
import { go }                   from 'react-router-redux'
import { compose, get, lookup } from 'safety-lens'
import * as A                   from '../actions'
import { FlatButton
       , Paper
       , TextField
       } from 'material-ui'

import type { State }  from '../../reducers'
import type { Action } from '../actions'

type AddAccountProps = {
  dispatch:  (_: Action) => void,
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

export function AddAccount(props: AddAccountProps): React.Element {
  if (!props.useremail) {
    return <GetEmail {...props} />
  }
  else {
    return <AllDone {...props} />
  }
}

class GetEmail extends React.Component<void,AddAccountProps,void> {
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
    const { dispatch } = this.props
    const email = this.refs.email.getValue()
    dispatch(A.newAccount(email))
  }
}

class AllDone extends React.Component<void,AddAccountProps,void> {
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
    this.props.dispatch(go('/'))
  }
}

function mapStateToProps({ config }: State): $Shape<AddAccountProps> {
  const { username, useremail } = config
  return {
    loading:   false,  // TODO
    username,
    useremail,
  }
}

export default connect(mapStateToProps)(AddAccount)
