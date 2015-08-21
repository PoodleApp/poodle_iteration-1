/* @flow */

import * as Sunshine                        from 'sunshine'
import { Map, fromJS }                      from 'immutable'
import { lookup, over, set }                from 'lens'
import fs                                   from 'fs'
import * as State                           from './state'
import * as Create                          from '../../lib/activityTypes'
import { activityId }                       from '../../lib/derivedActivity'
import * as Act                             from '../../lib/derivedActivity'
import { participants, queryConversations } from '../../lib/conversation'
import { loadConfig, saveConfig }           from '../../lib/config'
import { assemble }                         from '../../lib/compose'
import { msmtp }                            from '../../lib/msmtp'

import type { List }             from 'immutable'
import type { DerivedActivity }  from '../../lib/derivedActivity'
import type { Conversation }     from '../../lib/conversation'
import type { Address, Message } from '../../lib/notmuch'
import type { Config }           from '../../lib/config'
import type { Burger, Draft }    from '../../lib/compose'
import type { AppState }         from './state'

class QueryConversations {
  query: string;
  constructor(query: string) { this.query = query }
}

class Conversations {
  convs: List<Conversation>;
  constructor(convs: List<Conversation>) { this.convs = convs }
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

class Send {
  draft: Draft;
  constructor(draft: Draft) { this.draft = draft }
}

class SendReply {
  reply:        Burger;
  message:      Message;
  conversation: Conversation;
  addPeople:    Address[];
  constructor(opts: {
    reply: Burger,
    message: Message,
    conversation: Conversation,
    addPeople?: Address[],
  }) {
    this.reply        = opts.reply
    this.message      = opts.message
    this.conversation = opts.conversation
    this.addPeople    = opts.addPeople || []
  }
}

class Like {
  activity:     DerivedActivity;
  conversation: Conversation;
  constructor(activity: DerivedActivity, conversation: Conversation) {
    this.activity     = activity
    this.conversation = conversation
  }
}

function init(app: Sunshine.App<AppState>) {

  app.on(QueryConversations, (state, { query }) => {
    var cmd = lookup(State.notmuchCmd, state) || 'notmuch'
    indicateLoading('conversations',
      queryConversations(cmd, query).then(
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
        err    => app.emit(new GenericError(err))
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

  app.on(Send, (_, { draft }) => {
    send(draft)
  })

  app.on(SendReply, (state, event) => {
    sendReply(event, state)
  })

  app.on(Like, (state, { activity, conversation }) => {
    var like = Create.like({
      objectType: 'activity',
      uri: activityId(activity),
    })
    var message = Act.message(activity)
    sendReply(new SendReply({ reply: like, message, conversation }), state)
  })

  function indicateLoading<T>(label: string, p: Promise<T>): Promise<T> {
    app.emit(new Loading())
    p.then(
      success => app.emit(new DoneLoading()),
      err => app.emit(new DoneLoading())
    )
    return p
  }

  function sendReply({ reply, message, conversation, addPeople }: SendReply, state: AppState) {
    var username  = lookup(State.username, state)
    var useremail = lookup(State.useremail, state)
    if (!username || !useremail) {
      app.emit(new GenericError("Please set your name and email address in 'Settings'"))
      return
    }

    var { to, from, cc } = participants(conversation)
    var subject          = `Re: ${message.subject}`
    var author           = { name: username, address: useremail }

    var recipients    = to.concat(from).concat(addPeople)
    var toWithoutSelf = withoutSelf(author, recipients)
    var recipients_   = toWithoutSelf.length > 0 ? toWithoutSelf : recipients

    var draft: Draft = {
      activities: [reply],
      from:       author,
      to:         recipients_,
      cc:         withoutSelf(author, without(recipients, cc)),
      subject,
      inReplyTo:  message.messageId,
      references: (message.references || []).concat(message.messageId),
    }

    if (reply[0].verb === 'like') {
      var fallback = lookup(State.likeMessage, state)
      if (fallback) {
        draft.fallback = fallback
      }
    }

    send(draft)
  }

  function send(draft: Draft) {
    var msg = assemble(draft)
    indicateLoading('send',
      msmtp(msg).catch(err => app.emit(new GenericError(err)))
    )
  }
}

function withoutSelf(self: Address, addrs: Address[]): Address[] {
  return addrs.filter(a => a.address !== self.address)
}

function without(exclude: Address[], addrs: Address[]): Address[] {
  return addrs.filter(a => !exclude.some(e => e.address === a.address))
}

export {
  init,
  DismissError,
  GenericError,
  Like,
  LoadConfig,
  SaveConfig,
  Notify,
  DismissNotify,
  QueryConversations,
  Send,
  SendReply,
  ViewCompose,
  ViewConversation,
  ViewRoot,
  ViewSettings,
}
