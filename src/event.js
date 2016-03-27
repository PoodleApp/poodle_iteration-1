/* @flow */

import {
  asyncResult,
  asyncUpdate,
  emit,
  reduce,
  update,
} from 'sunshine-framework'
import * as m                              from 'mori'
import { compose, get, lookup, over, set } from 'safety-lens'
import { prop }                            from 'safety-lens/es2015'
import * as stream                         from 'stream'
import * as State                          from './state'
import * as Create                         from './activityTypes'
import { activityId }                      from 'arfe/derivedActivity'
import * as Act                            from 'arfe/derivedActivity'
import { participants }                    from 'arfe/conversation'
import { loadConfig, saveConfig }          from './config'
import { assemble }                        from './compose'
import { msmtp }                           from './msmtp'

import type { Reducers, EventResult } from 'sunshine-framework'
import type { Seq, Seqable }          from 'mori'
import type { DerivedActivity }       from 'arfe/derivedActivity'
import type { Conversation }          from 'arfe/conversation'
import type { Address }               from 'arfe/models/address'
import type { Message }               from 'arfe/models/message'
import type { Config }                from './config'
import type { Burger, Draft }         from './compose'
import type { AppState }              from './state'

class Loading {}
class DoneLoading {}

class DismissError {}

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

  reduce(Error, (state, { message }) => update(
    set(State.genericError, message, state)
  )),

  reduce(DismissError, (state, _) => update(
    set(State.genericError, null, state)
  )),

  reduce(GotConfig, (state, { config }) => {
    const account = config.accounts.first()
    return update(
      set(State.config, config, state)
    )
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
      return emit(new Error('Cannot +1 synthetic activity.'))
    }
  }),

  reduce(ShowLink, (state, { activity }) => update(
    set(State.showLink, activity, state)
  )),

  reduce(LeftNavToggle, (state, open) => update(
    over(State.leftNavOpen, s => typeof open === 'boolean' ? open : !s, state)
  )),

]

function indicateLoading<S>(label: string, result: EventResult<S>): EventResult<S> {
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

function sendReply({ reply, message, conversation, addPeople }: SendReply, state: AppState): EventResult<AppState> {
  const username  = lookup(State.username, state)
  const useremail = lookup(State.useremail, state)
  if (!username || !useremail) {
    return emit(new Error("Please set your name and email address in 'Settings'"))
  }

  const { to, from, cc } = participants(conversation)
  const subject          = message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`
  const author           = { name: username, address: useremail }

  const recipients    = m.concat(to, from, addPeople)
  const toWithoutSelf = withoutSelf(author, recipients)
  const recipients_   = m.isEmpty(toWithoutSelf) ? recipients : toWithoutSelf

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
  const sentDir = lookup(compose(State.config_, prop('sentDir')), state)
  const msg_    = new (stream:any).PassThrough()
  msg.pipe(msg_)  // Grabs a duplicate of the msg stream
  return indicateLoading('send', asyncResult(
    // TODO: record copy of message in database
    msmtp(msg).then(_ => emit(new Notify('Message sent')))
  ))
}

function withoutSelf(self: Address, addrs: Seqable<Address>): Seq<Address> {
  return m.filter(a => a.address !== self.address, addrs)
}

function without(exclude: Seqable<Address>, addrs: Seqable<Address>): Seq<Address> {
  return m.filter(a => !m.some(e => e.address === a.address, exclude), addrs)
}


export {
  DismissError,
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
  indicateLoading,
  reducers,
}
