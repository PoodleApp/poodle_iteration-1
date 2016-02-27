/* @flow */

import { List, Map } from 'immutable'

import type { IndexedIterable, IndexedSeq } from 'immutable'

export {
  partition,
  uniqBy,
}

function partition<T,TS:Iterable<any,T>>(fn: (_: T) => boolean, xs: TS): [TS, TS] {
  const grouped = xs.groupBy(x => fn(x) ? 1 : 0)
  return [grouped.get(1, List()), grouped.get(0, List())]
}

function uniqBy<T,U,TS:IndexedIterable<T>>(fn: (_: T) => U, xs: TS | T[]): IndexedSeq<T> {
  const map: Map<U,T> = xs.reduce((m, x) => (
    m.set(fn(x), x)
  ), Map())
  return map.valueSeq()
}
