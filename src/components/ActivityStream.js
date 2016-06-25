/* @flow */

import React       from 'react'
import { connect } from 'react-redux'
import * as Act    from 'arfe/derivedActivity'
import * as A      from '../actions'
import { AppBar
       , AppCanvas
       , Dialog
       , FlatButton
       , IconButton
       , IconMenu
       , LeftNav
       , MenuItem
       , RefreshIndicator
       , Snackbar
       , Styles
       , TextField
       } from 'material-ui'

import type { DerivedActivity } from 'arfe/derivedActivity'
import type { Conversation }    from 'arfe/conversation'
import type { Action }          from '../actions'
import type { State }           from '../reducers'

type ActivityStreamProps = {}

export class ActivityStream extends React.Component<void,ActivityStreamProps,void> {

  render(): React.Element {
    return (
      <div>(activity stream)</div>
    )
  }

}

function mapStateToProps(state: State, ownProps: $Shape<ActivityStreamProps>
                        ): $Shape<ActivityStreamProps> {
  return {}
}

export default connect(mapStateToProps)(ActivityStream)
