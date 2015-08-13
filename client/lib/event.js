/* @flow */

import * as Sunshine          from 'sunshine'
import { over, set }          from 'lens'
import * as State             from './state'
import { queryConversations } from '../../lib/activity'

import type { Conversation, URI } from '../../lib/activity'
import type { AppState }          from './state'

class QueryConversations {
  query: string;
  constructor(query: string) { this.query = query }
}

class Conversations {
  convs: Conversation[];
  constructor(convs: Conversation[]) { this.convs = convs }
}

class Loading {}
class DoneLoading {}

class ViewRoot {}
class ViewConversation {
  id: string;
  constructor(id: string) { this.id = id }
}

function init(app: Sunshine.App<AppState>) {
  app.on(QueryConversations, (state, { query }) => {
    app.emit(new Loading())
    queryConversations(query).then(convs => {
      app.emit(new Conversations(convs))
      app.emit(new DoneLoading())
    })
  })

  app.on(Conversations, (state, { convs }) => {
    return set(State.conversations, convs, state)
  })

  app.on(Loading, (state, _) => {
    return over(State.loading, n => n + 1, state)
  })

  app.on(DoneLoading, (state, _) => {
    return over(State.loading, n => Math.max(0, n - 1), state)
  })

  app.on(ViewRoot, (state, _) => {
    return set(State.view, 'root',
           set(State.routeParams, {},
           state))
  })

  app.on(ViewConversation, (state, { id }) => {
    return set(State.view, 'conversation',
           set(State.routeParams, { conversationId: id },
           state))
  })
}

export {
  init,
  QueryConversations,
  ViewConversation,
  ViewRoot,
}
