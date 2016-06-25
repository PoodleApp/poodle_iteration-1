/* @flow */

import React                     from 'react'
import { connect }               from 'react-redux'
import { compose, get, lookup }  from 'safety-lens'
import { List }                  from 'immutable'
import { newAccount, newConfig } from '../config'
import { FlatButton
       , Paper
       , TextField
       } from 'material-ui'

import type { State } from '../reducers'

type SettingsProps = {
  dispatch:    (action: Object) => void,
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

export class Settings extends React.Component<void,SettingsProps,void> {

  render(): React.Element {
    const { loading, likeMessage, username, useremail } = this.props
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
    const { dispatch } = this.props
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
    dispatch()
    this.emit(new Ev.SaveConfig(config))
  }
}

function mapStateToProps(state: State): $Shape<SettingsProps> {
  return {
    loading:     false,            // TODO
    likeMessage: '+1',             // TODO
    username:    'jesse',          // TODO
    useremail:   'jesse@sitr.us',  // TODO
  }
  // return {
  //   loading:     get(State.isLoading, state),
  //   likeMessage: lookup(State.likeMessage, state),
  //   username:    lookup(State.username, state),
  //   useremail:   lookup(State.useremail, state),
  // }
}

export default connect(mapStateToProps)(Settings)
