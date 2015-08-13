/* @flow */

import * as Sunshine from 'sunshine/react'
import React         from 'react'
import { get }       from 'lens'
import * as State    from '../state'
import * as Ev       from '../event'

import type { List } from 'immutable'
import type { AppState } from '../state'

type Props = {
  app: Sunshine.App<AppState>
}

type ConversationMeta = {
  subject: string,
  participants: string[],
  lastActive: string,
}

type ConversationsState = {
  conversations: List<ConversationMeta>,
  loading: boolean,
}

export class Conversations extends Sunshine.Component<{},Props,ConversationsState> {
  getState(state: AppState): ConversationsState {
    return {
      conversations: get(State.conversations, state).map(conv => ({
        subject:      conv.subject,
        participants: State.participants(conv),
        lastActive:   State.lastActive(conv),
      })),
      loading: get(State.isLoading, state),
    }
  }

  render(): React.Element {
    var conversations = this.state.conversations.map(conv => (
      <ConversationHeader conv={conv} key={conv.id} />
    ))
    return (
      <div>
        <h1>Conversations</h1>
        <form onSubmit={this.onSearch.bind(this)}>
         <label>
           Enter notmuch query: <input type="text" ref="query" />
         </label>
         <input type="submit" value="Search" disabled={this.state.loading} />
         {this.state.loading ? <p>Loading...</p> : ''}
        </form>
        <section>{conversations}</section>
      </div>
    )
  }

  componentDidMount() {
    super.componentDidMount()
    var input = React.findDOMNode(this.refs.query)
    input.value = 'date:1month..'
  }

  onSearch(event: Event) {
    event.preventDefault()
    var input = React.findDOMNode(this.refs.query)
    this.emit(new Ev.QueryConversations(input.value))
  }
}

class ConversationHeader extends Sunshine.Component<{},{ conv: ConversationMeta },{}> {
  render(): React.Element {
    var { subject, participants, lastActive } = this.props.conv
    return (
      <div>
        <h3>{subject}</h3>
        <p>{lastActive}</p>
        <p>{participants.join(', ')}</p>
        <hr/>
      </div>
    )
  }
}
