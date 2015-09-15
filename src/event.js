/* @flow */

import * as Sunshine                        from 'sunshine-framework'
import { Map, fromJS }                      from 'immutable'
import { compose, get, lookup, over, set }  from 'safety-lens'
import { field }                            from 'safety-lens/immutable'
import * as stream                          from 'stream'
import * as State                           from './state'
import * as Create                          from './activityTypes'
import { activityId }                       from './derivedActivity'
import * as Act                             from './derivedActivity'
import { parseMidUri }                      from './activity'
import { participants, queryConversations } from './conversation'
import { loadConfig, saveConfig }           from './config'
import { assemble }                         from './compose'
import { msmtp }                            from './msmtp'
import * as Mail                            from './maildir'
import { notmuch }                          from './notmuch'
import * as AuthEvent                       from './auth/event'

import type { List }             from 'immutable'
import type { URI }              from './activity'
import type { DerivedActivity }  from './derivedActivity'
import type { Conversation }     from './conversation'
import type { Address, Message } from './notmuch'
import type { Config }           from './config'
import type { Burger, Draft }    from './compose'
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

class Reload {}

function init(app: Sunshine.App<AppState>) {

  app.on(QueryConversations, (state, { query }) => {
    var cmd = lookup(State.notmuchCmd, state) || 'notmuch'
    indicateLoading('conversations',
      queryConversations(cmd, query).then(
        convs => app.emit(new Conversations(convs)),
        err   => app.emit(new GenericError(err))
      )
    )
    return set(State.searchQuery, query, state)
  })

  app.on(Reload, (state, _) => {
    var query = get(State.searchQuery, state)
    if (query) {
      app.emit(new QueryConversations(query))
    }
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

  app.on(ViewRoot, (state, { searchQuery }) => {
    if (searchQuery) {
      app.emit(new QueryConversations(searchQuery))
    }
    return set(State.view, 'root',
           set(State.routeParams, Map({ q: searchQuery }),
           state))
  })

  app.on(ViewCompose, (state, { params }) => {
    return set(State.view, 'compose',
           set(State.routeParams, params,
           state))
  })

  app.on(ViewActivity, (state, { uri }) => {
    var parsed = parseMidUri(uri)
    if (!parsed) {
      app.emit(new GenericError(`Unable to parse activity URI: ${uri}`))
      return
    }
    var { messageId } = parsed
    var cmd = lookup(State.notmuchCmd, state) || 'notmuch'

    indicateLoading('activityByUri',
      queryConversations(cmd, `id:${messageId}`).then(convs => {
        if (convs.size > 0) {
          app.emit(new Conversations(convs))
          app.emit(new ViewConversation(convs.get(0).id, uri))
        }
        else {
          return Promise.reject(`Could not find activity for given URI: ${uri}`)
        }
      })
      .catch(err => app.emit(new GenericError(err)))
    )
  })

  app.on(ViewConversation, (state, { id, activityUri }) => {
    var state_ = set(State.view, 'conversation',
                 set(State.routeParams, fromJS({ conversationId: id, activityUri }),
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

  app.on(ViewAccountSetup, (state, _) => {
    return set(State.view, 'add_account', state)
  })

  app.on(GenericError, (state, { err }) => {
    return set(State.genericError, err, state)
  })

  app.on(DismissError, (state, _) => {
    return set(State.genericError, null, state)
  })

  app.on(GotConfig, (state, { config }) => {
    var account = config.accounts.first()
    if (account) {
      app.emit(new AuthEvent.SetAccount(account))
    }
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

  app.on(Send, (state, { draft }) => {
    send(draft, state)
  })

  app.on(SendReply, (state, event) => {
    sendReply(event, state)
  })

  app.on(Like, (state, { activity, conversation }) => {
    var like = Create.like({
      objectType: 'activity',
      uri: activityId(activity),
    })
    var message = Act.getMessage(activity)
    if (message) {
      sendReply(new SendReply({ reply: like, message, conversation }), state)
    }
    else {
      app.emit(new GenericError('Cannot +1 synthetic activity.'))
    }
  })

  app.on(ShowLink, (state, { activity }) => (
    set(State.showLink, activity, state)
  ))

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
    var subject          = message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`
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

    if (reply[1].verb === 'like') {
      var fallback = lookup(State.likeMessage, state) || '+1'
      draft.fallback = fallback
    }

    send(draft, state)
  }

  function send(draft: Draft, state: AppState) {
    var msg     = assemble(draft)
    var sentDir = lookup(compose(State.config_, field('sentDir')), state)
    var cmd     = lookup(State.notmuchCmd, state)
    var msg_    = new (stream:any).PassThrough()
    msg.pipe(msg_)  // Grabs a duplicate of the msg stream
    indicateLoading('send',
      msmtp(msg)
      .then(() => {
        if (sentDir) {
          return Mail.record(msg_, sentDir).then(() => {
            if (cmd) {
              return notmuch(cmd, 'new').then(() => {
                app.emit(new Reload())
              })
            }
          })
          .catch(err => {
            // An error here should not prevent the snackbar notification
            app.emit(new GenericError('Your message was sent. However: '+err))
          })
        }
      })
      .then(_ => app.emit(new Notify('Message sent')))
      .catch(err => {
        app.emit(new GenericError(err))
      })
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
  Loading,
  DoneLoading,
  Notify,
  DismissNotify,
  QueryConversations,
  Send,
  SendReply,
  ShowLink,
  ViewAccountSetup,
  ViewActivity,
  ViewCompose,
  ViewConversation,
  ViewRoot,
  ViewSettings,
}
