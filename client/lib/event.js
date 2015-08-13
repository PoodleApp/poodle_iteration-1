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

class DismissError {}
class GenericError {
  err: Object;
  constructor(err: Object) { this.err = err }
}

function init(app: Sunshine.App<AppState>) {
  app.on(QueryConversations, (state, { query }) => {
    app.emit(new Loading())
    queryConversations(query).then(
      convs => {
        app.emit(new Conversations(convs))
        app.emit(new DoneLoading())
      },
      err => {
        app.emit(new GenericError(err))
      }
    )
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
    var state_ = set(State.view, 'conversation',
                 set(State.routeParams, { conversationId: id },
                 state))
    var conv = State.currentConversation(state_)
    if (!conv) {
      app.emit(new QueryConversations(id))
    }
    return state_
  })

  app.on(GenericError, (state, { err }) => {
    return set(State.genericError, err, state)
  })

  app.on(DismissError, (state, _) => {
    return set(State.genericError, null, state)
  })
}

export {
  init,
  DismissError,
  GenericError,
  QueryConversations,
  ViewConversation,
  ViewRoot,
}
