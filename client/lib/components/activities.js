/* @flow */

import * as Sunshine from 'sunshine/react'
import React         from 'react'
import moment        from 'moment'
import { published } from '../../../lib/activity'
import * as Ev       from '../event'
import * as State    from '../state'
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

import type { Activity } from '../../../lib/activity'

type ActivityProps = {
  activity: Activity,
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
    var { object } = this.props.activity
    if (object && object.objectType === 'note') {
      return (
        <NoteView {...this.props} />
      )
    }
    else {
      return this.unknown()
    }
  }

  unknown(): React.Element {
    return (
      <Paper>
        <p style={styles.body}>unknown activity type</p>
      </Paper>
    )
  }
}

export class NoteView extends Sunshine.Component<{},ActivityProps,{}> {
  render(): React.Element {
    var { object } = this.props.activity
    var { author, content } = object
    var fromStr = author.displayName
    var dateStr = published(this.props.activity).fromNow()
    return (
      <Paper>
        <CardHeader
          title={fromStr}
          subtitle={dateStr}
          avatar={<Avatar>{fromStr[0]}</Avatar>}
          />
        <p style={styles.body}>{content}</p>
      </Paper>
    )
  }
}
