/* @flow */

import * as Sunshine       from 'sunshine/react'
import React               from 'react'
import { compose, get, lookup } from 'lens'
import { parseAddressList} from 'email-addresses'
import * as Act            from '../derivedActivity'
import { participants }    from '../conversation'
import * as State          from '../../client/lib/state'
import * as CS             from '../composer/state'
import * as Ev             from '../../client/lib/event'
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
import type { Address }         from '../notmuch'
import type { Draft }           from '../compose'
import type { ActivityProps }   from '../../client/lib/components/activities'

type ComposeState = {
  activityType: ?string,
  loading:      boolean,
  username:     ?string,
  useremail:    ?string,
}

var { Colors } = Styles

var styles = {
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
    var { activityType } = this.state
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
    var { activityType, username, useremail } = this.props

    var to      = this.refs.to.getValue()
    var subject = this.refs.subject.getValue()
    var body    = this.refs.body.getValue()

    var author = { name: username, address: useremail }
    var activity = activityType === 'document' ?
      Create.document({ verb: 'post', author, subject, body }) :
      Create.note({ verb: 'post', author, subject, body })

    var draft: Draft = {
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
    var { showAddPeople, username, useremail, loading } = this.state
    var sty = this.getStyles()
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
    var conversation            = this.props.inReplyTo
    var activity                = conversation.activities.findLast(a => !Act.isSynthetic(a))
    var message                 = Act.getMessage(activity)
    var { username, useremail } = this.state
    if (!username || !useremail) {
      this.emit(new Ev.GenericError("Please set your name and email address in 'Settings'"))
      return
    }
    if (!message) {
      this.emit(new Ev.GenericError('Cannot reply to synthetic activity.'))
      return
    }

    var subject = message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`
    var body    = this.refs.body.getValue()
    var author  = { name: username, address: useremail }
    var reply   = Create.note({ verb: 'reply', author, subject, body, target: {
      objectType: 'activity',
      uri: Act.activityId(activity),
      // TODO: include activity inline, add relevant attachments
    } })

    var addPeople = this.state.showAddPeople ? parseAddressList(this.refs.to.getValue()) || [] : []

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
    var activity = this.props.activity
    var { loading } = this.state
    var sty = this.getStyles()

    var content = textContent(activity)
    if (!content) {
      this.emit(new Ev.GenericError('Cannot edit activity with multiple parts, or with no text part.'))
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
    var { activity, conversation } = this.props
    var message = Act.getMessage(activity)
    var verb = Act.rawVerb(activity)
    if (!message || !verb) {
      this.emit(new Ev.GenericError('Cannot reply to synthetic activity.'))
      return
    }

    var constructor = Act.objectType(activity) === 'document' ? Create.document : Create.note
    var amended = constructor({
      verb,
      author:  (Act.object(activity): any).author,
      subject: Act.title(activity) || '[no subject]',
      body:    this.refs.body.getValue(),
      target:  Act.target(activity),
    })
    var edit = Create.edit({ amended, target: Act.latestRevision(activity) })

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
  var part = Act.objectContent(activity)[0]
  if (part && part.contentType.startsWith('text/')) {
    return part.content.toString('utf8')
  }
}
