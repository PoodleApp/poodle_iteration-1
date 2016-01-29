/* @flow */

import {
  asyncResult,
  asyncUpdate,
  emit,
  reduce,
  update,
} from 'sunshine-framework'
import { List, Map, fromJS }                from 'immutable'
import { compose, get, lookup, over, set }  from 'safety-lens'
import { prop }                             from 'safety-lens/es2015'
import { field }                            from 'safety-lens/immutable'
import * as stream                          from 'stream'
import * as State                           from './state'
import * as Create                          from './activityTypes'
import { activityId }                       from './derivedActivity'
import * as Act                             from './derivedActivity'
import { parseMidUri }                      from './models/message'
import { participants, threadToConversation } from './conversation'
import { loadConfig, saveConfig, loadAccount } from './config'
import { assemble }                         from './compose'
import { msmtp }                            from './msmtp'
import * as AuthState                       from './auth/state'
import * as AuthEvent                       from './auth/event'
import { hasEnded }                         from './util/observable'
import * as Gmail                           from './stores/gmail/gmail'

import type { Reducers, EventResult } from 'sunshine-framework'
import type { URI }                   from './activity'
import type { DerivedActivity }       from './derivedActivity'
import type { Conversation }          from './conversation'
import type { Address }               from './models/address'
import type { Message }               from './models/message'
import type { Config }                from './config'
import type { Burger, Draft }         from './compose'
import type { AppState }              from './state'

class Loading {}
class DoneLoading {}

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
  constructor(id: string, activityUri?: URI) {
    this.id = id
    this.activityUri = activityUri
  }
}
class ViewSettings {}
class ViewAccountSetup {}

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

class ShowLink {
  activity: ?DerivedActivity;
  constructor(activity: ?DerivedActivity) { this.activity = activity }
}

class LeftNavToggle {
  open: ?boolean;
  constructor(open: ?boolean = null) { this.open = open }
}

const reducers: Reducers<AppState> = [

  // TODO: handle errors for failed async results

  reduce(Loading, (state, _) => update(
    over(State.loading, n => n + 1, state)
  )),

  reduce(DoneLoading, (state, _) => update(
    over(State.loading, n => Math.max(0, n - 1), state)
  )),

  reduce(ViewRoot, (state, { searchQuery }) => {
    const view = new State.RootView(searchQuery)
    const tokenGenerator = get(compose(State.authState, AuthState.tokenGen), state)

    if (!searchQuery) {
      return update(State.pushView(view, state))
    }
    const query = searchQuery  // To help the typechecker

    return indicateLoading('conversations', {
      state: State.pushView(view, state),

      asyncResult: loadAccount().then(account => (
        Gmail.search(query, account.email, tokenGenerator).scan(
          (threads, thread) => threads.push(thread),
          List()
        )
        .last()
        .toPromise()
      ))
      .then(convs => asyncUpdate(state_ => {
        const view_ = lookup(State.view, state_)
        if (view_ == view) {
          return State.replaceView(new State.RootView(query, convs), state_)
        }
        else {
          return state_
        }
      })),
    })
  }),

  reduce(ViewCompose, (state, { params }) => update(
    set(State.routeParams, params,
        State.pushView(new State.ComposeView, state))
  )),

  reduce(ViewActivity, (state, { uri }) => viewConversation(state, uri)),

  reduce(ViewConversation, (state, { id, activityUri }) => {
    const result = viewConversation(state, activityUri, id)
    return set(
      compose(prop('state'), State.routeParams),
      fromJS({ conversationId: id, activityUri }),
      result
    )
  }),

  reduce(ViewSettings, (state, _) => update(
    State.pushView(new State.SettingsView, state)
  )),

  reduce(ViewAccountSetup, (state, _) => update(
    State.pushView(new State.AddAccountView, state)
  )),

  reduce(GenericError, (state, { err }) => update(
    set(State.genericError, err, state)
  )),

  reduce(DismissError, (state, _) => update(
    set(State.genericError, null, state)
  )),

  reduce(GotConfig, (state, { config }) => {
    const account = config.accounts.first()
    return {
      state: set(State.config, config, state),
      events: account ? [new AuthEvent.SetAccount(account)] : [],
    }
  }),

  reduce(LoadConfig, (_, __) => indicateLoading('config', asyncResult(
    loadConfig().then(
      config => emit(new GotConfig(config))
    )
  ))),

  reduce(SaveConfig, (state, { config }) => indicateLoading('config', asyncResult(
    saveConfig(config).then(
      _ => emit(
        new GotConfig(config),
        new Notify('Saved settings')
      )
    )
  ))),

  reduce(Notify, (state, { message }) => update(
    set(State.notification, message, state)
  )),

  reduce(DismissNotify, (state, _) => update(
    set(State.notification, null, state)
  )),

  reduce(Send, (state, { draft }) => send(draft, state)),

  reduce(SendReply, (state, event) => sendReply(event, state)),

  reduce(Like, (state, { activity, conversation }) => {
    const like = Create.like({
      objectType: 'activity',
      uri: activityId(activity),
    })
    const message = Act.getMessage(activity)
    if (message) {
      return sendReply(new SendReply({ reply: like, message, conversation }), state)
    }
    else {
      return emit(new GenericError('Cannot +1 synthetic activity.'))
    }
  }),

  reduce(ShowLink, (state, { activity }) => update(
    set(State.showLink, activity, state)
  )),

  reduce(LeftNavToggle, (state, open) => update(
    over(State.leftNavOpen, s => typeof open === 'boolean' ? open : !s, state)
  )),

]

function indicateLoading(label: string, result: EventResult<AppState>): EventResult<AppState> {
  return Object.assign({}, result, {
    events: Array.from(result.events || []).concat(new Loading(label)),
    asyncResult: (result.asyncResult || Promise.resolve()).then(
      eventResult => Object.assign({}, eventResult, {
        events: Array.from(eventResult.events || []).concat(new DoneLoading(label))
      }),
      err => ({
        events: [new DoneLoading(label)],
        asyncResult: Promise.reject(err)
      })
    )
  })
}

function viewConversation(state: AppState, uri: ?string = null, id: ?string = null): EventResult<AppState> {
  if (!uri && !id) {
    throw "uri or message id is required"
  }

  if (uri) {
    id = id || messageIdFromUri(uri)
  }
  if (!id) {
    return emit(new GenericError(`Unable to parse activity URI: ${uri}`))
  }

  const query = `rfc822msgid:${id}`
  const view = new State.ConversationView(id, uri)
  const tokenGenerator = get(compose(State.authState, AuthState.tokenGen), state)

  return indicateLoading('conversation', {
    state: State.pushView(view, state),

    asyncResult: loadAccount().then(account => (
      Gmail.search(query, account.email, tokenGenerator).scan(
        (threads, thread) => threads.push(thread),
        List()
      )
      .last()
      .toPromise()
    ))
    .then(convs => asyncUpdate(state_ => {
      const conv  = convs.first()
      const view_ = lookup(State.view, state_)
      if (!conv) {
        return emit(new GenericError(`Could not find activity for given URI: ${uri}`))
      }
      else if (view_ == view) {
        return State.replaceView(new State.ConversationView(id, uri, conv), state_)
      }
      else {
        return state_
      }
    })),
  })
}

function messageIdFromUri(uri: string): ?string {
  const parsed = parseMidUri(uri)
  const messageId = parsed ? parsed.messageId : null
  if (parsed && messageId) {
    return messageId
  }
}

function sendReply({ reply, message, conversation, addPeople }: SendReply, state: AppState): EventResult<AppState> {
  const username  = lookup(State.username, state)
  const useremail = lookup(State.useremail, state)
  if (!username || !useremail) {
    return emit(new GenericError("Please set your name and email address in 'Settings'"))
  }

  const { to, from, cc } = participants(conversation)
  const subject          = message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`
  const author           = { name: username, address: useremail }

  const recipients    = to.concat(from).concat(addPeople)
  const toWithoutSelf = withoutSelf(author, recipients)
  const recipients_   = toWithoutSelf.length > 0 ? toWithoutSelf : recipients

  const draft: Draft = {
    activities: [reply],
    from:       author,
    to:         recipients_,
    cc:         withoutSelf(author, without(recipients, cc)),
    subject,
    inReplyTo:  message.messageId,
    references: (message.references || []).concat(message.messageId),
  }

  if (reply[1].verb === 'like') {
    const fallback = lookup(State.likeMessage, state) || '+1'
    draft.fallback = fallback
  }

  return send(draft, state)
}

function send(draft: Draft, state: AppState): EventResult<AppState> {
  const msg     = assemble(draft)
  const sentDir = lookup(compose(State.config_, field('sentDir')), state)
  const msg_    = new (stream:any).PassThrough()
  msg.pipe(msg_)  // Grabs a duplicate of the msg stream
  return indicateLoading('send', asyncResult(
    // TODO: record copy of message in database
    msmtp(msg).then(_ => emit(new Notify('Message sent')))
  ))
}

function withoutSelf(self: Address, addrs: Address[]): Address[] {
  return addrs.filter(a => a.address !== self.address)
}

function without(exclude: Address[], addrs: Address[]): Address[] {
  return addrs.filter(a => !exclude.some(e => e.address === a.address))
}


export {
  DismissError,
  GenericError,
  LeftNavToggle,
  Like,
  LoadConfig,
  SaveConfig,
  Loading,
  DoneLoading,
  Notify,
  DismissNotify,
  Send,
  SendReply,
  ShowLink,
  ViewAccountSetup,
  ViewActivity,
  ViewCompose,
  ViewConversation,
  ViewRoot,
  ViewSettings,
  indicateLoading,
  reducers,
}
