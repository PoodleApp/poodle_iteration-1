/* @flow */

import * as Vocab                                          from 'vocabs-as'
import * as m                                              from 'mori'
import React                                               from 'react'
import moment                                              from 'moment'
import repa                                                from 'repa'
import marked                                              from 'marked'
import { mailtoUri }                                       from 'arfe/models/uri'
import { allNames, asideToConversation, flatParticipants } from 'arfe/conversation'
import { displayName }                                     from 'arfe/models/address'
import { ComposeReply, EditNote }                          from './compose'
import { ActivityOptsMenu }                                from './activityMenu'
import { actorAvatar }                                     from './avatar'
import { join }                                            from '../util/mori'
import * as Act                                            from 'arfe/derivedActivity'
import { Card
       , CardHeader
       , FlatButton
       , Paper
       , Styles
       } from 'material-ui'

import type { DerivedActivity } from 'arfe/derivedActivity'
import type { Conversation }    from 'arfe/conversation'

export type ActivityProps = {
  activity:     DerivedActivity,
  conversation: Conversation,
  dispatch:     (_: Object) => void,
  editing:      ?DerivedActivity,
  loading:      boolean,
  username:     string,
  useremail:    string,
  nestLevel?:   number,
}

var { Colors } = Styles

var styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
  },
  documentBody: {
    paddingBottom: '2em',
  },
  activityCard: {
    paddingTop: '0.6em'
  },
  asideContainer: {
    padding: '1em',
    paddingTop: 0,
  },
  inlineNotice: {
    padding: '16px',
    paddingBottom: 0,
  },
  inlineNoticeUnderHeader: {
    padding: '16px',
    paddingBottom: 0,
    paddingTop: 0,
  },
  menu: {
    float: 'right',
  },
}

const contextTypes = {
  muiTheme: React.PropTypes.object.isRequired,
}

export class ActivityView extends React.Component<void,ActivityProps,void> {
  render(): React.Element {
    const activity = this.props.activity
    const { Aside, Conflict, Join } = Act.syntheticTypes
    if (Act.hasType(Conflict, activity)) {
      return <ConflictView {...this.props} />
    }
    else if (Act.hasType(Join, activity)) {
      return <JoinView {...this.props} />
    }
    else if (Act.hasType(Aside, activity)) {
      return <AsideView {...this.props} />
    }
    else if (Act.hasObjectType(Vocab.Note, activity)) {
      return this.editingThis() ?
        <EditNote {...this.props} /> :
        <NoteView {...this.props} />
    }
    else if (Act.hasObjectType(Vocab.Document, activity)) {
      // TODO: special edit view for document
      return this.editingThis() ?
        <EditNote {...this.props} /> :
        <DocumentView {...this.props} />
    }
    else {
      return (
        <UnknownView {...this.props} />
      )
    }
  }

  unknown(): React.Element {
    return (
      <ActivityCard nestLevel={this.props.nestLevel}>
        {displayUnknown()}
      </ActivityCard>
    )
  }

  editingThis(): boolean {
    const { activity, editing } = this.props
    return !!editing && Act.getId(editing) === Act.getId(activity)
  }
}

function ActivityCard(props: { nestLevel: ?number, children?: any }): React.Element {
  return (
    <div style={styles.activityCard}>
      <Paper {...props} zDpeth={props.nestLevel || 1}>
        {props.children}
      </Paper>
    </div>
  )
}

function NoteView(props: ActivityProps): React.Element {
  const { activity, nestLevel } = props
  const from    = Act.getActor(activity)  // TODO: `from` is now an AS.models.Object
  const fromStr = (from && from.displayName) || '[unknown sender]'
  const dateStr = Act.getPublishTime(activity).fromNow()
  return (
    <ActivityCard nestLevel={nestLevel}>
      <CardHeader
        title={fromStr}
        subtitle={dateStr}
        avatar={from && actorAvatar(from)}
        >
        <LikeButton style={{ float:'right' }} {...props} />
        <ActivityOptsMenu style={styles.menu} {...props} />
      </CardHeader>
      {Act.isEdited(activity) ?
        <p style={styles.inlineNoticeUnderHeader}>
          <em>Last edited {Act.getLatestEditTime(activity).fromNow()}</em>
        </p> : ''}
      {displayContent(activity)}
    </ActivityCard>
  )
}

function DocumentView(props: ActivityProps): React.Element {
  const { activity, conversation } = props
  const from    = Act.getActor(activity)  // TODO: `from` is now an AS.models.Object
  const fromStr = (from && from.displayName) || '[unknown author]'
  const editor  = Act.getActor(Act.getLatestRevision(activity))  // TODO: `editor` is now an AS.models.Object
  const editStr = (from && from.displayName) || '[unknown author]'
  const dateStr = Act.getPublishTime(activity).fromNow()
  return (
    <div>
      <h2>{conversation.subject}</h2>
      {Act.isEdited(activity) ?
        <p>
          <em>Last edited {Act.getLatestEditTime(activity).fromNow()} by {editStr}</em>
        </p> :
        <p>
          <em>Posted {dateStr} by {fromStr}</em>
        </p>}
      {displayContent(activity, styles.documentBody)}
    </div>
  )
}

function ConflictView(props: ActivityProps): React.Element {
  const { activity, nestLevel, useremail } = props
  const from    = Act.getActor(activity)  // TODO `from` is now an AS.models.Object
  const fromStr = (from && from.displayName) || '[unknown sender]'
  const dateStr = Act.getPublishTime(activity).fromNow()
  // const { palette } = (this.context: any).muiTheme.baseTheme  // TODO
  // const backgroundColor = palette.borderColor
  const backgroundColor = 'red'  // TODO
  return (
    <ActivityCard nestLevel={nestLevel} style={{backgroundColor: backgroundColor}}>
      <div style={styles.inlineNotice}>
        <strong>Edit failed due to a conflict with another edit.</strong>
      </div>
      {displayContent(activity)}
    </ActivityCard>
  )
}

ConflictView.contextTypes = contextTypes

function JoinView(props: ActivityProps): React.Element {
  const { activity, nestLevel } = props
  const from    = Act.getActor(activity)  // TODO: `from` is now an AS.models.Object
  const fromStr = (from && from.displayName) || '[unknown sender]'
  // const { palette } = (this.context: any).muiTheme.baseTheme  // TODO
  // const backgroundColor = palette.borderColor
  const backgroundColor = 'red'  // TODO
  return (
    <ActivityCard nestLevel={nestLevel} style={{backgroundColor: backgroundColor}}>
      <CardHeader
        title={fromStr}
        subtitle='joined the discussion'
        avatar={from && actorAvatar(from)}
        >
      </CardHeader>
    </ActivityCard>
  )
}

JoinView.contextTypes = contextTypes

function AsideView(props: ActivityProps): React.Element {
  const nestLevel = props.nestLevel || 1
  const { activity, conversation } = props

  const conv = asideToConversation(activity)
  const ppl = join(', ', allNames(conv))

  // TODO: will not work anymore
  const showReplyForm = m.equals(activity, m.last(m.filter(act => (
    act.verb === 'aside' && m.equals(act.allActivities, activity.allActivities)
  ), conversation.activities)))

  const activities = m.intoArray(m.map(act => (
    <ActivityView
      {...this.props}
      activity={act}
      conversation={conv}
      key={activityId(act)}
      nestLevel={nestLevel+1}
      />
  ), activity.aside || m.list()))

  const { palette } = (this.context: any).muiTheme.baseTheme

  return (
    <ActivityCard nestLevel={nestLevel} style={{backgroundColor: palette.primary3Color}}>
      <CardHeader
        title='private aside'
        subtitle={ppl}
        avatar={<span></span>}
        >
      </CardHeader>
      <div style={styles.asideContainer}>
        {activities}
        {showReplyForm ?
          <ComposeReply
            inReplyTo={conv}
            hintText='Compose private reply'
            /> : ''}
      </div>
    </ActivityCard>
  )
}

AsideView.contextTypes = contextTypes

class UnknownView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var activity = this.props.activity
    var from     = actor(activity)
    var fromStr  = (from && from.displayName) || '[unknown sender]'
    var dateStr  = published(activity).fromNow()
    return (
      <ActivityCard nestLevel={this.props.nestLevel}>
        <CardHeader
          title={fromStr}
          subtitle={dateStr}
          avatar={from && actorAvatar(from)}
          />
        {displayContent(activity)}
      </ActivityCard>
    )
  }
}

type LikeButtonProps = ActivityProps & {
  style?: Object
}

class LikeButton extends Sunshine.Component<{},LikeButtonProps,{}> {
  render(): React.Element {
    var { activity, loading, useremail, style } = this.props
    var me           = mailtoUri(useremail)
    var alreadyLiked = !!m.some((uri, _) => uri === me, likes(activity))
    var mine         = myContent(activity, useremail)
    return (
      <FlatButton
        style={style || {}}
        label={`+${likeCount(activity)+1}`}
        onTouchTap={this.like.bind(this)}
        disabled={mine || alreadyLiked || loading}
        />
    )
  }

  like() {
    this.emit(new Ev.Like(this.props.activity, this.props.conversation))
  }
}

function displayContent(activity: DerivedActivity, style?: Object): React.Element {
  const content = m.first(
    m.filter(
      // TODO: support other content types
      ({ contentType }) => contentType === 'text/plain' || contentType === 'text/html'
    , m.sort((a, b) => {
      // prefer text/plain
      if (a.contentType === 'text/plain' && b.contentType !== 'text/plain') {
        return -1
      }
      else if (a.contentType !== 'text/plain' && b.contentType === 'text/plain') {
        return 1
      }
      else {
        return 0
      }
    }
    , objectContent(activity)))
  )
  if (content && content.contentType === 'text/plain') {
    return displayText(content.content, style)
  }
  else if (content && content.contentType === 'text/html') {
    return displayHtml(content.content, style)
  }
  else {
    return displayUnknown(style)
  }
}

function displayText(content: Buffer, style?: Object): React.Element {
  var content = repa(content.toString('utf8'))
  var out = {
    __html: marked(content, { sanitized: true })
  }
  return <div
    style={style || styles.body}
    className='markdown-content'
    dangerouslySetInnerHTML={out} />
}

function displayHtml(content: Buffer, style?: Object): React.Element {
  return (
    <div style={style || styles.body}>
      <p>TODO: display HTML</p>
    </div>
  )
}

function displayUnknown(style?: Object): React.Element {
  return <div style={style || styles.body}><p><em>[no content]</em></p></div>
}

function myContent(activity: DerivedActivity, email: string): boolean {
  var me   = mailtoUri(email)
  var them = actor(activity)
  return !!them && (them.uri === me)
}
