/* @flow */

import { List, Map, Record }          from 'immutable'
import { compose, filtering, getter } from 'safety-lens'
import { field, index }               from 'safety-lens/immutable'
import * as CS                        from './composer/state'
import * as AS                        from './add_account/state'
import * as AuthState                 from './auth/state'
import { published }                  from './activity'
import { parseMidUri }                from './models/message'
import * as Act                       from './derivedActivity'

import type { Getter, Lens_, Traversal_ } from 'safety-lens'
import type { URI }                       from './activity'
import type { DerivedActivity }           from './derivedActivity'
import type { Conversation }              from './conversation'
import type { Config, Account }           from './config'

export type AppState = Record<{
  conversations: List<Conversation>,
  loading:       number,
  view:          View,
  routeParams:   Map<string,string>,
  genericError:  ?Object,
  config?:       Config,
  notification?: string,
  composerState: CS.ComposerState,
  addAccountState: AS.AddAccountState,
  authState:     AuthState.AuthState,
  showLink:      ?DerivedActivity,
  searchQuery:   ?string,
}>

export type View = 'root' | 'compose' | 'conversation' | 'settings' | 'add_account'

var AppStateRecord = Record({
  conversations: List(),
  loading:       0,
  view:          'root',
  routeParams:   Map(),
  genericError:  null,
  config:        null,
  notification:  null,
  composerState: CS.initialState,
  addAccountState: AS.initialState,
  authState:     AuthState.initialState,
  showLink:      null,
  searchQuery:   null,
})

var initialState: AppState = new AppStateRecord()

var composerState: Lens_<AppState,CS.ComposerState> = field('composerState')
var addAccountState: Lens_<AppState,AS.AddAccountState> = field('addAccountState')

var conversations: Lens_<AppState,List<Conversation>> = field('conversations')
var loading: Lens_<AppState,number> = field('loading')
var isLoading: Getter<AppState,boolean> = getter(state => state.loading > 0)
var view: Lens_<AppState,View> = field('view')
var routeParams: Lens_<AppState,Map<string,string>> = field('routeParams')
var genericError: Lens_<AppState,?Object> = field('genericError')
var notification = field('notification')
var showLink = field('showLink')
var searchQuery = field('searchQuery')

var config: Lens_<AppState,?Config> = field('config')
var config_: Traversal_<AppState,Config> = compose(config, filtering(c => !!c))

var username: Traversal_<AppState,string> = compose(config_, field('name'))
var useremail: Traversal_<AppState,string> = compose(config_, field('email'))

var useraccount: Traversal_<AppState,Account> =
  compose(compose(config_, field('accounts')), index(0))
var username: Traversal_<AppState,string> =
  compose(useraccount, field('displayName'))
var useremail: Traversal_<AppState,string> =
  compose(useraccount, field('email'))

var likeMessage: Traversal_<AppState,string> = compose(config_, field('likeMessage'))
var notmuchCmd: Traversal_<AppState,string> = compose(config_, field('notmuchCmd'))

function routeParam(key: string): Traversal_<AppState,string> {
  return compose(routeParams, index(key))
}

function conversation(id: string, state: AppState): ?Conversation {
  return state.conversations.find(c => c.id === id)
}

function currentConversation(state: AppState): ?Conversation {
  var id = state.routeParams.get('conversationId')
  if (id) { return conversation(id, state) }
}

function currentActivity(state: AppState): ?Conversation {
  var conv = currentConversation(state)
  var uri = state.routeParams.get('activityUri')
  if (conv && uri) {
    return conv.activities.find(a => Act.activityId(a) === uri)
  }
}

export {
  addAccountState,
  composerState,
  config,
  config_,
  conversation,
  conversations,
  currentConversation,
  genericError,
  initialState,
  isLoading,
  likeMessage,
  loading,
  // lookupUri,
  notification,
  notmuchCmd,
  routeParam,
  routeParams,
  searchQuery,
  showLink,
  username,
  useremail,
  view,
}
