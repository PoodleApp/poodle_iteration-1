/* @flow */

import { List, is }  from 'immutable'
import * as Sunshine from 'sunshine-framework/react'
import React         from 'react'
import moment        from 'moment'
import repa          from 'repa'
import marked        from 'marked'
import { mailtoUri } from '../activity'
import { asideToConversation, flatParticipants } from '../conversation'
import { displayName } from '../notmuch'
import * as Ev       from '../event'
import * as State    from '../state'
import { ComposeReply, EditNote }  from './compose'
import { ActivityOptsMenu } from './activityMenu'
import { actorAvatar } from './avatar'
import * as Act from '../derivedActivity'
import { activityId
       , actor
       , edited
       , lastEdited
       , likes
       , likeCount
       , objectContent
       , objectType
       , published
       , verb
       } from '../derivedActivity'
import { Card
       , CardHeader
       , FlatButton
       , Paper
       , Styles
       } from 'material-ui'

import type { DerivedActivity } from '../derivedActivity'
import type { Conversation }    from '../conversation'

export type ActivityProps = {
  activity:     DerivedActivity,
  conversation: Conversation,
  editing:      ?DerivedActivity,
  loading:      boolean,
  username:     string,
  useremail:    string,
  nestLevel:    ?number,
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

var contextTypes = {
  _sunshineApp: React.PropTypes.instanceOf(Sunshine.App).isRequired,
  muiTheme: React.PropTypes.object.isRequired,
}

export class ActivityView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var activity = this.props.activity
    var v = verb(activity)
    if (v === 'conflict') {
      return <ConflictView {...this.props} />
    }
    else if (v === 'join') {
      return <JoinView {...this.props} />
    }
    else if (v === 'aside') {
      return <AsideView {...this.props} />
    }
    else if (objectType(activity) === 'note') {
      return this.editingThis() ?
        <EditNote {...this.props} /> :
        <NoteView {...this.props} />
    }
    else if (objectType(activity) === 'document') {
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
    var { activity, editing } = this.props
    return editing && activityId(editing) === activityId(activity)
  }
}

class ActivityCard extends Sunshine.Component<{},{ nestLevel: ?number, children: React.Element },{}> {
  render(): React.Element {
    return (
      <div style={styles.activityCard}>
        <Paper {...this.props} zDpeth={this.props.nestLevel || 1}>
          {this.props.children}
        </Paper>
      </div>
    )
  }
}

class NoteView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var { activity } = this.props
    var from    = actor(activity)
    var fromStr = (from && from.displayName) || '[unknown sender]'
    var dateStr = published(activity).fromNow()
    return (
      <ActivityCard nestLevel={this.props.nestLevel}>
        <CardHeader
          title={fromStr}
          subtitle={dateStr}
          avatar={from && actorAvatar(from)}
          >
          <LikeButton style={{ float:'right' }} {...this.props} />
          <ActivityOptsMenu style={styles.menu} {...this.props} />
        </CardHeader>
        {edited(activity) ?
          <p style={styles.inlineNoticeUnderHeader}>
            <em>Last edited {lastEdited(activity).fromNow()}</em>
          </p> : ''}
        {displayContent(activity)}
      </ActivityCard>
    )
  }
}

class DocumentView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var { activity, conversation } = this.props
    var from    = actor(activity)
    var fromStr = (from && from.displayName) || '[unknown author]'
    var editor  = actor(Act.latestRevision(activity))
    var editStr = (from && from.displayName) || '[unknown author]'
    var dateStr = published(activity).fromNow()
    return (
      <div>
        <h2>{conversation.subject}</h2>
        {edited(activity) ?
          <p>
            <em>Last edited {lastEdited(activity).fromNow()} by {editStr}</em>
          </p> :
          <p>
            <em>Posted {Act.published(activity).fromNow()} by {fromStr}</em>
          </p>}
        {displayContent(activity, styles.documentBody)}
      </div>
    )
  }
}

class ConflictView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var { activity, useremail } = this.props
    var from    = actor(activity)
    var fromStr = (from && from.displayName) || '[unknown sender]'
    var dateStr = published(activity).fromNow()
    var { palette } = this.context.muiTheme
    return (
      <ActivityCard nestLevel={this.props.nestLevel} style={{backgroundColor: palette.borderColor}}>
        <div style={styles.inlineNotice}>
          <strong>Edit failed due to a conflict with another edit.</strong>
        </div>
        {displayContent(activity)}
      </ActivityCard>
    )
  }
}

ConflictView.contextTypes = contextTypes

class JoinView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var { activity } = this.props
    var from    = actor(activity)
    var fromStr = (from && from.displayName) || '[unknown sender]'
    var { palette } = this.context.muiTheme
    return (
      <ActivityCard nestLevel={this.props.nestLevel} style={{backgroundColor: palette.borderColor}}>
        <CardHeader
          title={fromStr}
          subtitle='joined the discussion'
          avatar={from && actorAvatar(from)}
          >
        </CardHeader>
      </ActivityCard>
    )
  }
}

JoinView.contextTypes = contextTypes

class AsideView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var nestLevel = this.props.nestLevel || 1
    var { activity, conversation } = this.props

    var conv = asideToConversation(activity)
    var ppl = flatParticipants(conv).map(p => displayName(p)).join(', ')

    // TODO: a bit hackish
    var showReplyForm = is(activity, conversation.activities.findLast(act => (
      act.verb === 'aside' && is(act.allActivities, activity.allActivities)
    )))

    var activities = (activity.aside || List()).map(act => (
      <ActivityView
        {...this.props}
        activity={act}
        conversation={conv}
        key={activityId(act)}
        nestLevel={nestLevel+1}
        />
    ))

    var { palette } = this.context.muiTheme

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
    var alreadyLiked = likes(activity).some(l => l.uri === me)
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
  var content = objectContent(activity)
  .sort((a,b) => {
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
  })
  .filter(({ contentType }) => contentType === 'text/plain' || contentType === 'text/html')  // TODO: support other content types
  [0]
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
