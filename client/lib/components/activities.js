/* @flow */

import * as Sunshine                from 'sunshine/react'
import React                        from 'react'
import moment                       from 'moment'
import repa                         from 'repa'
import { objectContent, published } from '../../../lib/activity'
import { displayName }              from '../../../lib/notmuch'
import * as Ev                      from '../event'
import * as State                   from '../state'
import * as Act                     from '../../../lib/activityTypes'
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

import type { Activity, Conversation, Zack } from '../../../lib/activity'

type ActivityProps = {
  activity:     Zack,
  conversation: Conversation,
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

// TODO: disable +1 button if already liked
class NoteView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var [_, msg] = this.props.activity
    var fromStr  = displayName(msg.from[0])
    var dateStr  = published(this.props.activity).fromNow()
    return (
      <Paper>
        <CardHeader
          title={fromStr}
          subtitle={dateStr}
          avatar={<Avatar>{fromStr[0]}</Avatar>}
          >
          <FlatButton
            style={{ float:'right' }}
            label='+1'
            onTouchTap={this.like.bind(this)}
            />
        </CardHeader>
        {displayContent(this.props.activity)}
      </Paper>
    )
  }

  like() {
    this.emit(new Ev.Like(this.props.activity, this.props.conversation))
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
