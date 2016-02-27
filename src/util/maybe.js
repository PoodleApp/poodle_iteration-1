/* @flow */

import { List } from 'immutable'

import type { IndexedIterable, IndexedSeq } from 'immutable'

export {
  catMaybes,
  maybeToList,
}

function catMaybes<T>(maybes: IndexedIterable<?T>): IndexedSeq<T> {
  return maybes.filter(x => !!x)
}

function maybeToList<T>(x: ?T): List<T> {
  return x ? List.of(x) : List()
}
