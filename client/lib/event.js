/* @flow */

import * as Sunshine          from 'sunshine'
import { over, set }          from 'lens'
import * as State             from './state'
import { queryConversations } from '../../lib/notmuch'

import type { Conversation } from '../../lib/notmuch'
import type { AppState }     from './state'

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
}

export {
  init,
  QueryConversations,
}
