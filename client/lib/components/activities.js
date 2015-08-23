/* @flow */

import * as Sunshine from 'sunshine/react'
import React         from 'react'
import moment        from 'moment'
import repa          from 'repa'
import marked        from 'marked'
import { mailtoUri } from '../../../lib/activity'
import * as Ev       from '../event'
import * as State    from '../state'
import { EditNote }  from '../../../lib/components/compose'
import { ActivityOptsMenu } from '../../../lib/components/activityMenu'
import { actorAvatar } from '../../../lib/components/avatar'
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
       } from '../../../lib/derivedActivity'
import { Card
       , CardHeader
       , FlatButton
       , Paper
       } from 'material-ui'

import type { DerivedActivity } from '../../../lib/derivedActivity'
import type { Conversation }    from '../../../lib/conversation'

export type ActivityProps = {
  activity:     DerivedActivity,
  conversation: Conversation,
  editing:      ?DerivedActivity,
  loading:      boolean,
  username:     string,
  useremail:    string,
}

var styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
  },
  activityCard: {
    paddingTop: '0.6em'
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
    else if (objectType(activity) === 'note') {
      return this.editingThis() ?
        <EditNote {...this.props} /> :
        <NoteView {...this.props} />
    }
    else {
      return (
        <UnknownView {...this.props} />
      )
    }
  }

  unknown(): React.Element {
    return (
      <Paper>
        {displayUnknown()}
      </Paper>
    )
  }

  editingThis(): boolean {
    var { activity, editing } = this.props
    return editing && activityId(editing) === activityId(activity)
  }
}

class NoteView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var { activity, useremail } = this.props
    var fromStr = actor(activity).displayName || '[unknown sender]'
    var dateStr = published(activity).fromNow()
    return (
      <div style={styles.activityCard}>
      <Paper>
        <CardHeader
          title={fromStr}
          subtitle={dateStr}
          avatar={actorAvatar(actor(activity))}
          >
          <LikeButton style={{ float:'right' }} {...this.props} />
          <ActivityOptsMenu style={styles.menu} {...this.props} />
        </CardHeader>
        {edited(activity) ?
          <p style={styles.inlineNoticeUnderHeader}>
            <em>Last edited {lastEdited(activity).fromNow()}</em>
          </p> : ''}
        {displayContent(activity)}
      </Paper>
      </div>
    )
  }
}

class ConflictView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var { activity, useremail } = this.props
    var fromStr = actor(activity).displayName || '[unknown sender]'
    var dateStr = published(activity).fromNow()
    return (
      <div style={styles.activityCard}>
      <Paper>
        <div style={styles.inlineNotice}>
          <strong>Edit failed due to a conflict with another edit.</strong>
        </div>
        {displayContent(activity)}
      </Paper>
      </div>
    )
  }
}

class JoinView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var { activity } = this.props
    var fromStr = actor(activity).displayName
    return (
      <div style={styles.activityCard}>
      <Paper>
        <CardHeader
          title={fromStr}
          subtitle='joined the discussion'
          avatar={actorAvatar(actor(activity))}
          >
        </CardHeader>
      </Paper>
      </div>
    )
  }
}

class UnknownView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var activity = this.props.activity
    var fromStr  = actor(activity).displayName || '[unknown sender]'
    var dateStr  = published(activity).fromNow()
    return (
      <Paper>
        <CardHeader
          title={fromStr}
          subtitle={dateStr}
          avatar={actorAvatar(actor(activity))}
          />
        {displayContent(activity)}
      </Paper>
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

function displayContent(activity: DerivedActivity): React.Element {
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
    return displayText(content.content)
  }
  else if (content && content.contentType === 'text/html') {
    return displayHtml(content.content)
  }
  else {
    return displayUnknown()
  }
}

function displayText(content: Buffer): React.Element {
  var content = repa(content.toString('utf8'))
  var out = {
    __html: marked(content, { sanitized: true })
  }
  return <div
    style={styles.body}
    className='markdown-content'
    dangerouslySetInnerHTML={out} />
}

function displayHtml(content: Buffer): React.Element {
  return (
    <div style={styles.body}>
      <p>TODO: display HTML</p>
    </div>
  )
}

function displayUnknown(): React.Element {
  return <div style={styles.body}><p><em>[no content]</em></p></div>
}

function myContent(activity: DerivedActivity, email: string): boolean {
  var me = mailtoUri(email)
  return actor(activity).uri === me
}
