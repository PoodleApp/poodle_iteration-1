/* @flow */

import { List, Record }                     from 'immutable'
import { compose, filtering, getter }       from 'lens'
import { field, index }                     from 'lens/immutable'
import { messages, parseMidUri, published } from '../../lib/activity'
import { displayName }                      from '../../lib/notmuch'
import { chain
       , filter
       , map
       , pipe
       , reverse
       , sortBy
       , uniq
       } from 'ramda'

import type { Moment }                    from 'moment'
import type { Getter, Lens_, Traversal_ } from 'lens'
import type { Conversation, URI }         from '../../lib/activity'
import type { ThreadId }                  from '../../lib/notmuch'
import type { Config }                    from '../../lib/config'

export type AppState = Record<{
  conversations: List<Conversation>,
  loading:       number,
  view:          View,
  routeParams:   Object,
  genericError:  ?Object,
  config?:       Config,
  notification?: string,
}>

export type View = 'root' | 'conversation' | 'settings'

var AppStateRecord = Record({
  conversations: List(),
  loading:       0,
  view:          'root',
  routeParams:   {},
  genericError:  null,
  config:        null,
  notification:  null,
})

var initialState: AppState = new AppStateRecord()

var conversations: Lens_<AppState,List<Conversation>> = field('conversations')
var loading: Lens_<AppState,number> = field('loading')
var isLoading: Getter<AppState,boolean> = getter(state => state.loading > 0)
var view: Lens_<AppState,View> = field('view')
var routeParams: Lens_<AppState,Object> = field('routeParams')
var genericError: Lens_<AppState,?Object> = field('genericError')
var notification = field('notification')

var config: Lens_<AppState,?Config> = field('config')
var config_: Traversal_<AppState,Config> = compose(config, filtering(c => !!c))
var username: Traversal_<AppState,string> = compose(config_, field('name'))
var useremail: Traversal_<AppState,string> = compose(config_, field('email'))

function routeParam(key: string): Getter<AppState,string> {
  return getter(state => state.routeParams[key])
}

// TODO: Currently only returns senders, not recipients.
function participants(conv: Conversation): string[] {
  var display = addrs => addrs ? addrs.map(displayName) : []
  var names   = msg   => chain(display, [msg.from, msg.cc, msg.to])
  var allNames: string[] = chain(names, messages(conv))
  return uniq(reverse(allNames))
}

function lastActive(conv: Conversation): Moment {
  return pipe(
    sortBy(act => published(act)),
    map(act => published(act))
  )(conv.activities).pop()
}

function conversation(id: ThreadId, state: AppState): ?Conversation {
  return state.conversations.find(c => c.id === id)
}

function currentConversation(state: AppState): ?Conversation {
  var id = state.routeParams.conversationId
  if (id) { return conversation(id, state) }
}

// TODO: lookup by Activity URI
// function lookupUri(uri: URI, state: AppState): ?{ conv: Conversation, msg: ?Message, part: ?Attachment } {
//   var parsed = parseMidUri(uri)
//   if (!parsed) { return }
//   var { msgId, partId } = parsed
//   var conv = state.conversations.find(
//     c => c.messages.some(m => m.id === msgId)
//   )
//   var msg = conv ? conv.messages.find(m => m.id === msgId) : null
//   var part = msg ? msg.attachments.find(p => p.contentId === partId) : null
//   if (conv) {
//     return { conv, msg, part }
//   }
// }

export {
  config,
  conversation,
  conversations,
  currentConversation,
  genericError,
  initialState,
  isLoading,
  lastActive,
  loading,
  // lookupUri,
  notification,
  participants,
  routeParam,
  routeParams,
  username,
  useremail,
  view,
}
