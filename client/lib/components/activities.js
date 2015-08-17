/* @flow */

import * as Sunshine from 'sunshine/react'
import React         from 'react'
import moment        from 'moment'
import repa          from 'repa'
import { mailtoUri
       , objectContent
       , published
       }                    from '../../../lib/activity'
import { likes, likeCount } from '../../../lib/derivedActivity'
import { displayName }      from '../../../lib/notmuch'
import * as Ev              from '../event'
import * as State           from '../state'
import * as Act             from '../../../lib/activityTypes'
import { AppBar
       , AppCanvas
       , Avatar
       , Card
       , CardHeader
       , FlatButton
       , LeftNav
       , Paper
       , RefreshIndicator
       , Styles
       , TextField
       , Toolbar
       , ToolbarGroup
       , ToolbarTitle
       } from 'material-ui'

import type { Activity, Zack } from '../../../lib/activity'
import type { Conversation }   from '../../../lib/conversation'

type ActivityProps = {
  activity:     Zack,
  conversation: Conversation,
  loading:      boolean,
  username:     string,
  useremail:    string,
}

var styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
    whiteSpace: 'pre-wrap',
  }
}

export class ActivityView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var [{ object }, msg] = this.props.activity
    if (object && object.objectType === 'note') {
      return (
        <NoteView {...this.props} />
      )
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
}

class NoteView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var [_, msg] = this.props.activity
    var fromStr    = displayName(msg.from[0])
    var dateStr    = published(this.props.activity).fromNow()
    return (
      <Paper>
        <CardHeader
          title={fromStr}
          subtitle={dateStr}
          avatar={<Avatar>{fromStr[0]}</Avatar>}
          >
          <LikeButton style={{ float:'right' }} {...this.props} />
        </CardHeader>
        {displayContent(this.props.activity)}
      </Paper>
    )
  }
}

class UnknownView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var [{ object }, msg] = this.props.activity
    var fromStr = displayName(msg.from[0])
    var dateStr = published(this.props.activity).fromNow()
    return (
      <Paper>
        <CardHeader
          title={fromStr}
          subtitle={dateStr}
          avatar={<Avatar>{fromStr[0]}</Avatar>}
          />
        {displayContent(this.props.activity)}
      </Paper>
    )
  }
}

type LikeButtonProps = ActivityProps & {
  style?: Object
}

class LikeButton extends Sunshine.Component<{},LikeButtonProps,{}> {
  render(): React.Element {
    var activity     = this.props.activity
    var alreadyLiked = likes(activity).some(l => l.uri === mailtoUri(this.props.useremail))
    return (
      <FlatButton
        style={this.props.style || {}}
        label={`+${likeCount(activity)}`}
        onTouchTap={this.like.bind(this)}
        disabled={alreadyLiked || this.props.loading}
        />
    )
  }

  like() {
    this.emit(new Ev.Like(this.props.activity, this.props.conversation))
  }
}

function displayContent(z: Zack): React.Element {
  var [act, msg] = z
  var content = objectContent(z)
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
  return <p style={styles.body}>{repa(content.toString('utf8'))}</p>
}

function displayHtml(content: Buffer): React.Element {
  return <p style={styles.body}>TODO: display HTML</p>
}

function displayUnknown(): React.Element {
  return <p style={styles.body}><em>unknown activity type</em></p>
}
