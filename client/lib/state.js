/* @flow */

import { List, Record }                                    from 'immutable'
import { getter }                                          from 'lens'
import { field }                                           from 'lens/immutable'
import { chain, filter, map, pipe, reverse, sortBy, uniq } from 'ramda'
import { parseMidUri }                                     from '../../lib/activity'

import type { Getter, Lens_ }                     from 'lens'
import type { Attachment, Conversation, Message } from '../../lib/notmuch'
import type { URI }                               from '../../lib/activity'

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

function participants(conv: Conversation): string[] {
  var names = addresses => (addresses || []).map(a => a.name || a.address)
  var ppl = chain(msg => chain(names, [msg.from, msg.to, msg.cc]), conv.messages)
  return reverse(uniq(ppl))
}

function lastActive(conv: Conversation): string {
  return pipe(
    filter(msg => !!msg.date),
    sortBy(msg => msg.date),
    map(msg => msg.date_relative)
  )(conv.messages).pop()
}

function lookupUri(threadId: string, state: AppState): ?{ conv: Conversation, msg: ?Message, part: ?Attachment } {
  var parsed = parseMidUri(threadId)
  if (!parsed) { return }
  var { msgId, partId } = parsed
  var conv = state.conversations.find(c => c.id === msgId)
  var msg = conv ? conv.messages.find(m => m.id === msgId) : null
  var part = msg ? msg.attachments.find(p => p.contentId === partId) : null
  if (conv) {
    return { conv, msg, part }
  }
}

// TODO: lookup by Activity URI instead of Conversation ID
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
  conversations,
  initialState,
  isLoading,
  lastActive,
  loading,
  lookupUri,
  participants,
  routeParam,
  routeParams,
  view,
}
