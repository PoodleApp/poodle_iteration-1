/* @flow */

import * as Sunshine    from 'sunshine/react'
import React            from 'react'
import { get, lookup }  from 'lens'
import * as Ev          from '../../client/lib/event'
import * as State       from '../../client/lib/state'
import { ConfigRecord } from '../config'
import { FlatButton
       , Paper
       , TextField
       } from 'material-ui'

type SettingsState = {
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

export default class Settings extends Sunshine.Component<{},{},SettingsState> {
  getState(state: State.AppState): SettingsState {
    return {
      loading:   get(State.isLoading, state),
      username:  lookup(State.username, state),
      useremail: lookup(State.useremail, state),
    }
  }

  render(): React.Element {
    var { loading, username, useremail } = this.state
    return (
      <Paper>
        <form style={styles.body} onSubmit={this.saveSettings.bind(this)}>
          <label>
            Your name:&nbsp;
            <TextField
              hintText='Turanga Leela'
              defaultValue={username}
              name='name'
              ref='name'
              />
          </label>
          <br/>
          <label>
            Your email address:&nbsp;
            <TextField
              hintText='leela@planetexpress.biz'
              defaultValue={useremail}
              name='email'
              ref='email'
              />
          </label>
          <br/>
          <FlatButton
            label='Save changes'
            disabled={loading}
            onTouchTap={this.saveSettings.bind(this)}
            />
        </form>
      </Paper>
    )
  }

  saveSettings(event: Event) {
    event.preventDefault()
    var name  = this.refs.name.getValue()
    var email = this.refs.email.getValue()
    var config = new ConfigRecord({
      name, email
    })
    this.emit(new Ev.SaveConfig(config))
  }
}
