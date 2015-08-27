/* @flow */

import { List, Map, Record }          from 'immutable'
import { compose, filtering, getter } from 'lens'
import { field, index }               from 'lens/immutable'
import * as CS                        from '../../lib/composer/state'
import { parseMidUri, published }     from '../../lib/activity'
import * as Act                       from '../../lib/derivedActivity'
import { map
       , pipe
       , sortBy
       } from 'ramda'

import type { Getter, Lens_, Traversal_ } from 'lens'
import type { URI }                       from '../../lib/activity'
import type { DerivedActivity }           from '../../lib/derivedActivity'
import type { Conversation }              from '../../lib/conversation'
import type { ThreadId }                  from '../../lib/notmuch'
import type { Config }                    from '../../lib/config'

export type AppState = Record<{
  conversations: List<Conversation>,
  loading:       number,
  view:          View,
  routeParams:   Map<string,string>,
  genericError:  ?Object,
  config?:       Config,
  notification?: string,
  composerState: CS.ComposerState,
  showLink:      ?DerivedActivity,
}>

export type View = 'root' | 'compose' | 'conversation' | 'settings'

var AppStateRecord = Record({
  conversations: List(),
  loading:       0,
  view:          'root',
  routeParams:   Map(),
  genericError:  null,
  config:        null,
  notification:  null,
  composerState: CS.initialState,
  showLink:      null,
})

var initialState: AppState = new AppStateRecord()

var composerState: Lens_<AppState,CS.ComposerState> = field('composerState')

var conversations: Lens_<AppState,List<Conversation>> = field('conversations')
var loading: Lens_<AppState,number> = field('loading')
var isLoading: Getter<AppState,boolean> = getter(state => state.loading > 0)
var view: Lens_<AppState,View> = field('view')
var routeParams: Lens_<AppState,Map<string,string>> = field('routeParams')
var genericError: Lens_<AppState,?Object> = field('genericError')
var notification = field('notification')
var showLink = field('showLink')

var config: Lens_<AppState,?Config> = field('config')
var config_: Traversal_<AppState,Config> = compose(config, filtering(c => !!c))
var username: Traversal_<AppState,string> = compose(config_, field('name'))
var useremail: Traversal_<AppState,string> = compose(config_, field('email'))
var likeMessage: Traversal_<AppState,string> = compose(config_, field('likeMessage'))
var notmuchCmd: Traversal_<AppState,string> = compose(config_, field('notmuchCmd'))

function routeParam(key: string): Traversal_<AppState,string> {
  return compose(routeParams, index(key))
}

function conversation(id: ThreadId, state: AppState): ?Conversation {
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
  showLink,
  username,
  useremail,
  view,
}
