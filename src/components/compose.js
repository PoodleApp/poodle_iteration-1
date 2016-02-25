/* @flow */

import * as Sunshine       from 'sunshine-framework/react'
import React               from 'react'
import { compose, get, lookup } from 'safety-lens'
import { parseAddressList} from 'email-addresses'
import * as Act            from '../derivedActivity'
import { participants }    from '../conversation'
import * as State          from '../state'
import * as CS             from '../composer/state'
import * as Ev             from '../event'
import * as CE             from '../composer/event'
import * as Create         from '../activityTypes'
import { ActivityOptsMenu } from './activityMenu'
import { FlatButton
       , IconButton
       , IconMenu
       , Paper
       , Styles
       , TextField
       }            from 'material-ui'
import MenuItem     from 'material-ui/lib/menus/menu-item'
import MoreVertIcon from 'material-ui/lib/svg-icons/navigation/more-vert'

import type { DerivedActivity } from '../derivedActivity'
import type { Conversation }    from '../conversation'
import type { Address }         from '../models/address'
import type { Draft }           from '../compose'
import type { ActivityProps }   from './activities'

type ComposeState = {
  activityType: ?string,
  loading:      boolean,
  username:     ?string,
  useremail:    ?string,
}

const { Colors } = Styles

const styles = {
  body: {
    padding: '16px',
  },
  activityCard: {
    paddingTop: '0.6em',
  },
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
    const { activityType } = this.state
    if (activityType === 'note') {
      return <ComposeNote {...this.state} />
    }
    else if (activityType === 'document') {
      return <ComposeNote {...this.state} />
    }

    return (
      <div style={styles.activityCard}>
      <Paper>
        <p style={styles.body}>
          <em>Unknown activity type: {String(activityType)}</em>
        </p>
      </Paper>
      </div>
    )
  }
}

class ComposeNote extends Sunshine.Component<{},ComposeState,{}> {
  render(): React.Element {
    const { username, useremail, loading } = this.props
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
    const { activityType, username, useremail } = this.props
    if (!useremail) { return }

    const to      = this.refs.to.getValue()
    const subject = this.refs.subject.getValue()
    const body    = this.refs.body.getValue()

    const author = { name: username, address: useremail }
    const activity = activityType === 'document' ?
      Create.document({ verb: 'post', author, subject, body }) :
      Create.note({ verb: 'post', author, subject, body })

    const draft: Draft = {
      activities: [activity],
      from:       author,
      to:         parseAddressList(to),
      subject:    subject,
    }

    this.emit(new Ev.Send(draft))

    // reset form
    this.refs.body.setValue('')
  }
}

type ReplyState = {
  loading:       boolean,
  showAddPeople: boolean,
  username:      ?string,
  useremail:     ?string,
}

type ReplyProps = {
  inReplyTo: Conversation,
  hintText?: string,
}

export class ComposeReply extends Sunshine.Component<{},ReplyProps,ReplyState> {
  getState(state: State.AppState): ReplyState {
    return {
      loading:       get(State.isLoading, state),
      showAddPeople: get(compose(State.composerState, CS.showAddPeople), state),
      username:      lookup(State.username, state),
      useremail:     lookup(State.useremail, state),
    }
  }

  getStyles(): Object {
    return {
      body: {
        padding: '16px',
        marginRight: '48px',
      },
      menu: {
        float: 'right',
      },
    }
  }

  render(): React.Element {
    const { showAddPeople, username, useremail, loading } = this.state
    const sty = this.getStyles()
    return (
      <div style={styles.activityCard}>
      <Paper>
        <ComposeOptsMenu style={sty.menu} showAddPeople={this.state.showAddPeople} />
        <form style={sty.body} onSubmit={this.onSend.bind(this)}>

          {showAddPeople ? <div>{this.addPeopleComponent()}<br/></div> : ''}

          <TextField
            hintText={this.props.hintText || 'Compose reply'}
            multiLine={true}
            fullWidth={true}
            name='body'
            ref='body'
            />
          <br/>

          <FlatButton
            label='Reply'
            disabled={loading}
            onTouchTap={this.onSend.bind(this)}
            />
        </form>
      </Paper>
      </div>
    )
  }

  addPeopleComponent(): React.Element {
    return (
      <TextField
        hintText='Turanga Leela <leela@planetexpress.biz>, Philip J. Fry <fry@planetexpress.biz>'
        multiLine={true}
        fullWidth={true}
        name='to'
        ref='to'
        />
    )
  }

  // TODO: validate required inputs
  onSend(event: Event) {
    event.preventDefault()
    const conversation            = this.props.inReplyTo
    const activity                = conversation.activities.findLast(a => !Act.isSynthetic(a))
    const message                 = Act.getMessage(activity)
    const { username, useremail } = this.state
    if (!username || !useremail) {
      this.emit(new Error("Please set your name and email address in 'Settings'"))
      return
    }
    if (!message) {
      this.emit(new Error('Cannot reply to synthetic activity.'))
      return
    }

    const subject = message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`
    const body    = this.refs.body.getValue()
    const author  = { name: username, address: useremail }
    const reply   = Create.note({ verb: 'reply', author, subject, body, target: {
      objectType: 'activity',
      uri: Act.activityId(activity),
      // TODO: include activity inline, add relevant attachments
    } })

    const addPeople = this.state.showAddPeople ? parseAddressList(this.refs.to.getValue()) || [] : []

    this.emit(new Ev.SendReply({ reply, message, conversation, addPeople }))

    // reset form
    this.refs.body.setValue('')
    this.emit(new CE.Reset())
  }
}

type EditNoteState = {
  loading: boolean,
}

export class EditNote extends Sunshine.Component<{},ActivityProps,EditNoteState> {
  getState(state: State.AppState): EditNoteState {
    return {
      loading: get(State.isLoading, state),
    }
  }

  getStyles(): Object {
    return {
      body: {
        padding: '16px',
        marginRight: '48px',
      },
      menu: {
        float: 'right',
      },
    }
  }

  render(): React.Element {
    const activity = this.props.activity
    const { loading } = this.state
    const sty = this.getStyles()

    const content = textContent(activity)
    if (!content) {
      this.emit(new Error('Cannot edit activity with multiple parts, or with no text part.'))
      return <p>Cannot edit activity with multiple parts, or with no text part.</p>
    }

    return (
      <div style={styles.activityCard}>
      <Paper>
        <ActivityOptsMenu style={sty.menu} {...this.props} />
        <form style={sty.body} onSubmit={this.onSend.bind(this)}>

          <TextField
            defaultValue={content}
            multiLine={true}
            fullWidth={true}
            name='body'
            ref='body'
            />
          <br/>

          <FlatButton
            label='Post changes'
            disabled={loading}
            onTouchTap={this.onSend.bind(this)}
            />
        </form>
      </Paper>
      </div>
    )
  }

  // TODO: validate required inputs
  onSend(event: Event) {
    event.preventDefault()
    const { activity, conversation } = this.props
    const message = Act.getMessage(activity)
    const verb = Act.rawVerb(activity)
    if (!message || !verb) {
      this.emit(new Error('Cannot reply to synthetic activity.'))
      return
    }

    const constructor = Act.objectType(activity) === 'document' ? Create.document : Create.note
    const amended = constructor({
      verb,
      author:  (Act.object(activity): any).author,
      subject: Act.title(activity) || '[no subject]',
      body:    this.refs.body.getValue(),
      target:  Act.target(activity),
    })
    const edit = Create.edit({ amended, target: Act.latestRevision(activity) })

    this.emit(new Ev.SendReply({ reply: edit, message, conversation }))

    // reset form
    this.refs.body.setValue('')
    this.emit(new CE.Reset())
  }
}

class ComposeOptsMenu extends Sunshine.Component<{},{ showAddPeople: boolean },{}> {
  render() {
    return (
      <IconMenu
        iconButtonElement={
          <IconButton>
            <MoreVertIcon color={Colors.grey400} />
          </IconButton>
        }
        onItemTouchTap={this.onMenuAction.bind(this)}
        {...this.props}
        >
        <MenuItem
          value='addPeople'
          primaryText='Add people'
          checked={this.props.showAddPeople}
          style={{ boxSizing: 'content-box' }}
          />
      </IconMenu>
    )
  }

  onMenuAction(event: Event, item: React.Element) {
    if (item.props.value === 'addPeople') {
      this.emit(new CE.ShowAddPeople(!this.props.showAddPeople))
    }
  }
}

function textContent(activity: DerivedActivity): ?string {
  const part = Act.objectContent(activity)[0]
  if (part && part.contentType.startsWith('text/')) {
    return part.content.toString('utf8')
  }
}
