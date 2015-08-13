/* @flow */

import { List, Record } from 'immutable'
import { getter } from 'lens'
import { field } from 'lens/immutable'
import { chain, filter, map, pipe, reverse, sortBy, uniq } from 'ramda'

import type { Getter, Lens_ } from 'lens'
import type { Conversation } from '../../lib/notmuch'

export type AppState = Record<{
  conversations: List<Conversation>,
  loading: number,
}>

var AppStateRecord = Record({
  conversations: List(),
  loading: 0,
})

var initialState: AppState = new AppStateRecord()

var conversations: Lens_<AppState,List<Conversation>> = field('conversations')
var loading: Lens_<AppState,number> = field('loading')
var isLoading: Getter<AppState,boolean> = getter(state => state.loading > 0)

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

export {
  conversations,
  initialState,
  isLoading,
  lastActive,
  loading,
  participants,
}
