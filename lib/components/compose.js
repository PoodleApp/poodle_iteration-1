/* @flow */

import * as Sunshine       from 'sunshine/react'
import React               from 'react'
import { get, lookup }     from 'lens'
import { parseAddressList} from 'email-addresses'
import * as State          from '../../client/lib/state'
import * as Ev             from '../../client/lib/event'
import * as Act            from '../activityTypes'
import { FlatButton
       , Paper
       , TextField
       } from 'material-ui'

import type { Draft } from '../compose'

type ComposeState = {
  activityType: ?string,
  loading:      boolean,
  username:     ?string,
  useremail:    ?string,
}

var styles = {
  body: {
    padding: '16px',
  }
}

export class ComposeView extends Sunshine.Component<{},{},ComposeState> {
  getState(state: State.AppState): ComposeState {
    return {
      loading:      get(State.isLoading, state),
      activityType: lookup(State.routeParam('activityType'), state),
      username:     lookup(State.username, state),
      useremail:    lookup(State.useremail, state),
    }
  }

  render(): React.Element {
    var { activityType } = this.state
    if (activityType === 'note') {
      return <ComposeNote {...this.state} />
    }

    return (
      <Paper>
        <br/>
        <p style={styles.body}>
          <em>Unknown activity type: {String(activityType)}</em>
        </p>
      </Paper>
    )
  }
}

class ComposeNote extends Sunshine.Component<{},ComposeState,{}> {
  render(): React.Element {
    var { username, useremail, loading } = this.props
    return (
      <Paper>
        <form style={styles.body} onSubmit={this.onSend.bind(this)}>
          <label>
            From:&nbsp;
            <TextField
              defaultValue={`${username} <${useremail}>`}
              fullWidth={true}
              disabled={true}
              />
          </label>
          <br/>
          <label>
            To:&nbsp;
            <TextField
              hintText='Turanga Leela <leela@planetexpress.biz>, Philip J. Fry <fry@planetexpress.biz>'
              multiLine={true}
              fullWidth={true}
              name='to'
              ref='to'
              />
          </label>
          <br/>
          <label>
            Subject:&nbsp;
            <TextField
              hintText='Still waiting for package'
              fullWidth={true}
              name='subject'
              ref='subject'
              />
          </label>
          <br/>
          <label>
            Message:&nbsp;
            <TextField
              multiLine={true}
              fullWidth={true}
              name='body'
              ref='body'
              />
          </label>
          <br/>
          <FlatButton
            label='Send'
            disabled={loading}
            onTouchTap={this.onSend.bind(this)}
            />
        </form>
      </Paper>
    )
  }

  // TODO: validate required inputs
  onSend(event: Event) {
    event.preventDefault()
    var { username, useremail } = this.props

    var to      = this.refs.to.getValue()
    var subject = this.refs.subject.getValue()
    var body    = this.refs.body.getValue()

    var author = { name: username, address: useremail }
    var note = Act.note('post', author, subject, body)

    var draft: Draft = {
      activities: [note],
      from:       author,
      to:         parseAddressList(to),
      subject:    subject,
    }

    this.emit(new Ev.Send(draft))
  }
}
