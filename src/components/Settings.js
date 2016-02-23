/* @flow */

import * as Sunshine    from 'sunshine-framework/react'
import React            from 'react'
import { compose, get, lookup }  from 'safety-lens'
import { field }        from 'safety-lens/immutable'
import { List }         from 'immutable'
import * as Ev          from '../event'
import * as State       from '../state'
import { newAccount, newConfig } from '../config'
import { FlatButton
       , Paper
       , TextField
       } from 'material-ui'

type SettingsState = {
  loading:     boolean,
  likeMessage: ?string,
  username:    ?string,
  useremail:   ?string,
}

const styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
    whiteSpace: 'pre-wrap',
  }
}

export default class Settings extends Sunshine.Component<{},{},SettingsState> {
  getState(state: State.AppState): SettingsState {
    return {
      loading:     get(State.isLoading, state),
      likeMessage: lookup(State.likeMessage, state),
      username:    lookup(State.username, state),
      useremail:   lookup(State.useremail, state),
    }
  }

  render(): React.Element {
    const { loading, likeMessage, username, useremail } = this.state
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
          <label>
            Fallback message for likes:&nbsp;
            <TextField
              hintText='+1'
              defaultValue={likeMessage}
              name='likeMessage'
              ref='likeMessage'
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
    const name  = this.refs.name.getValue()
    const email = this.refs.email.getValue()
    const likeMessage = this.refs.likeMessage.getValue()
    const config = newConfig({
      likeMessage,
      accounts: List.of(newAccount({
        displayName: name,
        email,
      }))
    })
    this.emit(new Ev.SaveConfig(config))
  }
}
