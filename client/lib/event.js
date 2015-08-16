/* @flow */

import * as Sunshine              from 'sunshine'
import { Map, fromJS }            from 'immutable'
import { over, set }              from 'lens'
import * as State                 from './state'
import { queryConversations }     from '../../lib/activity'
import { loadConfig, saveConfig } from '../../lib/config'

import type { Conversation, URI } from '../../lib/activity'
import type { Config }            from '../../lib/config'
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
class ViewCompose {
  params: Map<string,string>;
  constructor(params: Map<string,string>) { this.params = params }
}
class ViewConversation {
  id: string;
  constructor(id: string) { this.id = id }
}
class ViewSettings {}

class DismissError {}
class GenericError {
  err: any;
  constructor(err: any) { this.err = err }
}

class LoadConfig {}
class SaveConfig {
  config: Config;
  constructor(config: Config) { this.config = config }
}
class GotConfig {
  config: Config;
  constructor(config: Config) { this.config = config }
}

class Notify {
  message: string;
  constructor(message: string) { this.message = message }
}
class DismissNotify {}

function init(app: Sunshine.App<AppState>) {
  app.on(QueryConversations, (state, { query }) => {
    indicateLoading('conversations',
      queryConversations(query).then(
        convs => app.emit(new Conversations(convs)),
        err   => app.emit(new GenericError(err))
      )
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
           set(State.routeParams, Map(),
           state))
  })

  app.on(ViewCompose, (state, { params }) => {
    return set(State.view, 'compose',
           set(State.routeParams, params,
           state))
  })

  app.on(ViewConversation, (state, { id }) => {
    var state_ = set(State.view, 'conversation',
                 set(State.routeParams, fromJS({ conversationId: id }),
                 state))
    var conv = State.currentConversation(state_)
    if (!conv) {
      app.emit(new QueryConversations(id))
    }
    return state_
  })

  app.on(ViewSettings, (state, _) => {
    return set(State.view, 'settings', state)
  })

  app.on(GenericError, (state, { err }) => {
    return set(State.genericError, err, state)
  })

  app.on(DismissError, (state, _) => {
    return set(State.genericError, null, state)
  })

  app.on(GotConfig, (state, { config }) => {
    return set(State.config, config, state)
  })

  app.on(LoadConfig, (_, __) => {
    indicateLoading('config',
      loadConfig().then(
        config => app.emit(new GotConfig(config)),
        err    => app.emit(new GenericError(`Error loading configuration: ${err}`))
      )
    )
  })

  app.on(SaveConfig, (state, { config }) => {
    indicateLoading('config',
      saveConfig(config).then(
        _ => {
          app.emit(new GotConfig(config))
          app.emit(new Notify('Saved settings'))
        },
        err => app.emit(new GenericError(`Error saving configuration: ${err}`))
      )
    )
  })

  app.on(Notify, (state, { message }) => {
    return set(State.notification, message, state)
  })

  app.on(DismissNotify, (state, _) => {
    return set(State.notification, null, state)
  })

  function indicateLoading<T>(label: string, p: Promise<T>): Promise<T> {
    app.emit(new Loading())
    p.then(
      success => app.emit(new DoneLoading()),
      err => app.emit(new DoneLoading())
    )
    return p
  }
}

export {
  init,
  DismissError,
  GenericError,
  LoadConfig,
  SaveConfig,
  Notify,
  DismissNotify,
  QueryConversations,
  ViewCompose,
  ViewConversation,
  ViewRoot,
  ViewSettings,
}
