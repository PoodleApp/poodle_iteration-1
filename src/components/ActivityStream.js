/* @flow */

import React                      from 'react'
import { connect }                from 'react-redux'
import { select }                 from 'redux-crud-store'
import * as Act                   from 'arfe/derivedActivity'
import * as A                     from '../actions'
import { fetchActivitiesByQuery } from '../imap-store/actions'
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

import type { Selection }       from 'redux-crud-store'
import type { DerivedActivity } from 'arfe/derivedActivity'
import type { Conversation }    from 'arfe/conversation'
import type { Action }          from '../actions'
import type { State }           from '../reducers'

type ActivityStreamProps = {
  activities: Selection<DerivedActivity[]>,
  dispatch:   (action: Object) => void,
  query:      string,
}

export class ActivityStream extends React.Component<void,ActivityStreamProps,void> {

  componentWillMount() {
    const { dispatch, activities } = this.props
    if (activities.needsFetch) {
      dispatch(activities.fetch)
    }
  }

  componentWillReceiveProps(nextProps: ActivityStreamProps) {
    const { activities } = nextProps
    const { dispatch }   = this.props
    if (activities.needsFetch) {
      dispatch(activities.fetch)
    }
  }

  render(): React.Element {
    const { activities, dispatch, query } = this.props
    if (activities.isLoading) {
      return <p>loading...</p>
    }
    else if (activities.error) {
      return <h2>Error: {String(activities.error)}</h2>
    }
    else {
      const data = activities.data || []
      const rows = data.map(activity => <ActivityRow activity={activity} dispatch={dispatch}/>)
      return (
        <div>
          <form onSubmit={this.onSearch.bind(this)}>
            <input type="text" ref="query" defaultValue={query} />
            <input type="submit" value="search" />
          </from>
          {rows}
        </div>
      )
    }
    return (
      <div>(activity stream)</div>
    )
  }

  onSearch(event: Event) {
    event.preventDefault()
    const query = this.refs.query.value
    this.props.dispatch(actions.search(query))
  }

}

function ActivityRow(props: Object): React.Element {
  return <div>{String(props.activity)}<hr/></div>
}

function mapStateToProps(
  state: State, ownProps: $Shape<ActivityStreamProps>
): $Shape<ActivityStreamProps> {
  const { query } = state.activityStream
  return {
    activities: select(fetchActivitiesByQuery(query), state.models)
  }
}

export default connect(mapStateToProps)(ActivityStream)
