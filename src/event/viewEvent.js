/* @flow */

import {
  asyncResult,
  asyncUpdate,
  emit,
  reduce,
  update,
} from 'sunshine-framework'
import * as m                   from 'mori'
import { List, Map, fromJS }    from 'immutable'
import { lookup }               from 'safety-lens'
import { prop }                 from 'safety-lens/es2015'
import * as State               from '../state/ViewState'
import * as AuthState           from '../auth/state'
import * as Gmail               from '../stores/gmail/gmail'
import { parseMidUri }          from '../models/message'
import { loadAccount }          from '../config'
import { threadToConversation } from '../conversation'

import type { EventResult, Reducers } from 'sunshine-framework'
import type { URI }                   from '../activity'
import type { Conversation }          from '../conversation'
import type { ViewState }             from '../state/ViewState'


/* event types */

class ViewRoot {
  searchQuery: ?string;
  constructor(query: ?string) { this.searchQuery = query }
}
class ViewCompose {
  params: Map<string,string>;
  constructor(params: Map<string,string>) { this.params = params }
}
class ViewActivity {
  uri: URI;
  constructor(uri: URI) { this.uri = uri }
}
class ViewConversation {
  id: string;
  activityUri: ?URI;
  constructor(id: string, activityUri: ?URI = null) {
    this.id = id
    this.activityUri = activityUri
  }
}
class ViewSettings {}
class ViewAccountSetup {}

class PopView {}


/* reducers */

const reducers: Reducers<ViewState> = [

  reduce(ViewRoot, (state, { searchQuery }) => {
    const view = new State.RootView(searchQuery)

    if (!searchQuery) {
      return update(State.pushView(view, state))
    }
    const query = searchQuery  // To help the typechecker

    return {
      state: State.pushView(view, state),

      asyncResult: loadAccount().then(account => {
        const tokenGenerator = AuthState.getTokenGenerator(account)
        return Gmail.search(query, tokenGenerator).scan(
          (threads, thread) => m.conj(threads, thread), m.vector()
        )
        .last()
        .toPromise()
      })
      .then(threads => {
        const convPromises = m.map(threadToConversation, threads)
        return Promise.all(m.intoArray(convPromises)).then(cs => m.into(m.vector(), cs))
      })
      .then(convs => asyncUpdate(state_ => {
        const view_ = lookup(State.view, state_)
        if (view_ == view) {
          return State.replaceView(new State.RootView(query, convs), state_)
        }
        else {
          return state_
        }
      })),
    }
  }),

  reduce(ViewCompose, (state, { params }) => update(
    State.pushView(new State.ComposeView, state)
  )),

  reduce(ViewActivity, (state, { uri }) => viewConversation(state, uri)),

  reduce(ViewConversation, (state, { id, activityUri }) => (
    viewConversation(state, activityUri, id)
  )),

  reduce(ViewSettings, (state, _) => update(
    State.pushView(new State.SettingsView, state)
  )),

  reduce(ViewAccountSetup, (state, _) => update(
    State.pushView(new State.AddAccountView, state)
  )),

  reduce(PopView, (state, _) => {
    const [__, state_] = State.popView(state)
    return update(state_)
  })
]

function viewConversation(state: ViewState, uri: ?string = null, id: ?string = null): EventResult<ViewState> {
  if (!uri && !id) {
    throw "uri or message id is required"
  }

  if (uri) {
    id = id || messageIdFromUri(uri)
  }
  if (!id) {
    return emit(new Error(`Unable to parse activity URI: ${uri}`))
  }

  const query = `rfc822msgid:${id}`
  const view = new State.ConversationView(id, uri)

  return {
    state: State.pushView(view, state),

    asyncResult: loadAccount().then(account => {
      const tokenGenerator = AuthState.getTokenGenerator(account)
      return Gmail.search(query, tokenGenerator).scan(
        (threads, thread) => threads.push(thread),
        List()
      )
      .last()
      .toPromise()
    })
    .then(threads => threadToConversation(threads.first()))
    .then(conv => {
      if (!conv) {
        return emit(new Error(`Could not find activity for given URI: ${uri}`))
      }
      return asyncUpdate(state_ => {
        const view_ = lookup(State.view, state_)
        if (view_ == view) {
          return State.replaceView(new State.ConversationView(id, uri, conv), state_)
        }
        else {
          return state_
        }
      })
    }),
  }
}

function messageIdFromUri(uri: string): ?string {
  const parsed = parseMidUri(uri)
  const messageId = parsed ? parsed.messageId : null
  if (parsed && messageId) {
    return messageId
  }
}

export {
  PopView,
  ViewAccountSetup,
  ViewActivity,
  ViewCompose,
  ViewConversation,
  ViewRoot,
  ViewSettings,
  reducers,
}
