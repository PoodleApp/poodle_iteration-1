/* @flow */

import { List, Record }                                    from 'immutable'
import { getter }                                          from 'lens'
import { field }                                           from 'lens/immutable'
import { chain, filter, map, pipe, reverse, sortBy, uniq } from 'ramda'
import { parseMidUri, published }                          from '../../lib/activity'

import type { Moment }            from 'moment'
import type { Getter, Lens_ }     from 'lens'
import type { Conversation, URI } from '../../lib/activity'
import type { ThreadId }          from '../../lib/notmuch'

export type AppState = Record<{
  conversations: List<Conversation>,
  loading: number,
  view: View,
  routeParams: Object,
}>

export type View = 'root' | 'conversation'

var AppStateRecord = Record({
  conversations: List(),
  loading: 0,
  view: 'root',
  routeParams: {},
})

var initialState: AppState = new AppStateRecord()

var conversations: Lens_<AppState,List<Conversation>> = field('conversations')
var loading: Lens_<AppState,number> = field('loading')
var isLoading: Getter<AppState,boolean> = getter(state => state.loading > 0)
var view: Lens_<AppState,View> = field('view')
var routeParams: Lens_<AppState,Object> = field('routeParams')

function routeParam(key: string): Getter<AppState,string> {
  return getter(state => state.routeParams[key])
}

// TODO: Currently only returns senders, not recipients.
function participants(conv: Conversation): string[] {
  return pipe(
    map(act => act.actor.displayName),
    reverse,
    uniq
  )(conv.activities)
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
  conversation,
  conversations,
  currentConversation,
  initialState,
  isLoading,
  lastActive,
  loading,
  // lookupUri,
  participants,
  routeParam,
  routeParams,
  view,
}
