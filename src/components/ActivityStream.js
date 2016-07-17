/* @flow */

import React                   from 'react'
import { connect }             from 'react-redux'
import { select }              from 'redux-crud-store'
import * as Act                from 'arfe/derivedActivity'
import * as actions            from '../actions'
import { fetchThreadsByQuery } from '../imap-store/actions'
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
import type { ThreadResult }    from '../imap-store/actions'
import type { State }           from '../reducers'

type ActivityStreamProps = {
  threads:  Selection<ThreadResult[]>,
  creds:    Object,  // opaque object
  dispatch: (action: any) => void,
  query:    string,
}

export class ActivityStream extends React.Component<void,ActivityStreamProps,void> {

  componentWillMount() {
    const { dispatch, threads } = this.props
    if (threads.needsFetch) {
      dispatch(threads.fetch)
    }
  }

  componentWillReceiveProps(nextProps: ActivityStreamProps) {
    const { threads } = nextProps
    const { dispatch }   = this.props
    if (threads.needsFetch) {
      dispatch(threads.fetch)
    }
  }

  render(): React.Element<*> {
    const { threads, dispatch, query } = this.props
    if (threads.isLoading) {
      return <p>loading...</p>
    }
    else if (threads.error) {
      return <h2>Error: {String(threads.error)}</h2>
    }
    else {
      const data = threads.data || []
      const rows = data.map(thread => <ActivityRow thread={thread} dispatch={dispatch}/>)
      return (
        <div>
          <form onSubmit={this.onSearch.bind(this)}>
            <input type="text" ref="query" defaultValue={query} />
            <input type="submit" value="search" />
          </form>
          {rows}
        </div>
      )
    }
  }

  onSearch(event: Event) {
    event.preventDefault()
    const query = this.refs.query.value
    this.props.dispatch(actions.search(query))
  }

}

function ActivityRow(props: Object): React.Element<*> {
  return <div>{String(props.thread)}<hr/></div>
}

function mapStateToProps(
  state: State, ownProps: $Shape<ActivityStreamProps>
): $Shape<ActivityStreamProps> {
  const { query } = state.activityStream
  return {
    threads: select(fetchThreadsByQuery(query), state.models),
    creds:   state.auth.creds,  // depend on credentials to trigger re-render on updates
    query,
  }
}

export default connect(mapStateToProps)(ActivityStream)
