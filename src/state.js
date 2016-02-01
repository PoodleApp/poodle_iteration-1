/* @flow */

import { List, Map, Record }                  from 'immutable'
import { compose, filtering, getter, lookup, over, set } from 'safety-lens'
import { key }                                from 'safety-lens/es2015'
import { field, index }                       from 'safety-lens/immutable'
import * as CS                                from './composer/state'
import * as AS                                from './add_account/state'
import * as AuthState                         from './auth/state'
import { published }                          from './activity'
import { parseMidUri }                        from './models/message'
import * as Act                               from './derivedActivity'

import type { Fold, Getter, Lens_, Traversal_ } from 'safety-lens'
import type { URI }                             from './activity'
import type { DerivedActivity }                 from './derivedActivity'
import type { Conversation }                    from './conversation'
import type { Config, Account }                 from './config'

export type AppState = Record<{
  loading:          number,
  view:             List<View>,
  routeParams:      Map<string,string>,
  genericError:     ?Object,
  config?:          Config,
  notification?:    string,
  composerState:    CS.ComposerState,
  addAccountState   : AS.AddAccountState,
  authState:        AuthState.AuthState,
  showLink:         ?DerivedActivity,
  leftNavOpen:      boolean,
}>

class RootView {
  searchQuery: ?string;
  conversations: List<Conversation>;
  constructor(q: ?string = null, convs: List<Conversation> = List()) {
    this.conversations = convs
    this.searchQuery = q
  }
}

class ConversationView {
  id: ?string;
  uri: ?string;
  conversation: ?Conversation;
  constructor(id: ?string, uri: ?string, conv: ?Conversation = null) {
    this.id = id
    this.uri = uri
    this.conversation = conv
  }
}

class ComposeView {}
class SettingsView {}
class AddAccountView {}

export type View = RootView | ComposeView | ConversationView | SettingsView | AddAccountView

const AppStateRecord = Record({
  loading:       0,
  view:          List.of(new RootView),
  routeParams:   Map(),
  genericError:  null,
  config:        null,
  notification:  null,
  composerState: CS.initialState,
  addAccountState: AS.initialState,
  authState:     AuthState.initialState,
  showLink:      null,
  leftNavOpen:   false,
})

const initialState: AppState = new AppStateRecord()

const addAccountState: Lens_<AppState,AS.AddAccountState> = field('addAccountState')
const authState: Lens_<AppState,AuthState.AuthState> = field('authState')
const composerState: Lens_<AppState,CS.ComposerState> = field('composerState')

const view: Traversal_<AppState,View> = compose(field('view'), index(0))
const views: Lens_<AppState,List<View>> = field('view')
const conversations: Fold<any,AppState,List<Conversation>> = compose(view, key('conversations'))
const conversation: Fold<any,AppState,Conversation> = compose(view, key('conversation'))
const loading: Lens_<AppState,number> = field('loading')
const isLoading: Getter<AppState,boolean> = getter(state => state.loading > 0)
const routeParams: Lens_<AppState,Map<string,string>> = field('routeParams')
const genericError: Lens_<AppState,?Object> = field('genericError')
const notification = field('notification')
const showLink = field('showLink')
const searchQuery: Fold<any,AppState,string> = compose(view, key('searchQuery'))

const config: Lens_<AppState,?Config> = field('config')
const config_: Traversal_<AppState,Config> = compose(config, filtering(c => !!c))

const useraccount: Traversal_<AppState,Account> =
  compose(compose(config_, field('accounts')), index(0))
const username: Traversal_<AppState,string> =
  compose(useraccount, field('displayName'))
const useremail: Traversal_<AppState,string> =
  compose(useraccount, field('email'))

const likeMessage: Traversal_<AppState,string> = compose(config_, field('likeMessage'))
const notmuchCmd: Traversal_<AppState,string> = compose(config_, field('notmuchCmd'))

const leftNavOpen: Lens_<AppState,boolean> = field('leftNavOpen')

function routeParam(key: string): Traversal_<AppState,string> {
  return compose(routeParams, index(key))
}

function conversationById(id: string, state: AppState): ?Conversation {
  const convs = lookup(conversations, state)
  return convs && convs.find(c => c.id === id)
}

function currentConversation(state: AppState): ?Conversation {
  const id = state.routeParams.get('conversationId')
  const conv = lookup(conversation, state)
  if (conv && conv.id === id) {
    return conv
  }
}

function currentActivity(state: AppState): ?Conversation {
  const conv = currentConversation(state)
  const uri = state.routeParams.get('activityUri')
  if (conv && uri) {
    return conv.activities.find(a => Act.activityId(a) === uri)
  }
}

function pushView(view: View, state: AppState): AppState {
  return over(views, vs => vs.unshift(view), state)
}

function popView(state: AppState): [?View, AppState] {
  const v = lookup(view, state)
  const state_ = over(views, vs => vs.count() > 1 ? vs.shift() : vs, state)
  return [v, state_]
}

function replaceView(v: View, state: AppState): AppState {
  return set(view, v, state)
}

export {
  RootView,
  ConversationView,
  ComposeView,
  SettingsView,
  AddAccountView,
  addAccountState,
  authState,
  composerState,
  config,
  config_,
  conversation,
  conversations,
  conversationById,
  currentConversation,
  genericError,
  initialState,
  isLoading,
  likeMessage,
  loading,
  // lookupUri,
  leftNavOpen,
  notification,
  notmuchCmd,
  popView,
  pushView,
  replaceView,
  routeParam,
  routeParams,
  searchQuery,
  showLink,
  useraccount,
  username,
  useremail,
  view,
  views,
}
