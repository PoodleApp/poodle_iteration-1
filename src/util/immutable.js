/* @flow */

import { List, Map } from 'immutable'

import type { IndexedSeq } from 'immutable'

export {
  partition,
  uniqBy,
}

function partition<T>(fn: (_: T) => boolean, xs: List<T>): [List<T>, List<T>] {
  const grouped = xs.groupBy(x => fn(x) ? 1 : 0)
  return [grouped.get(1, List()), grouped.get(0, List())]
}

function uniqBy<T,U>(fn: (_: T) => U, xs: IndexedSeq<T> | T[]): IndexedSeq<T> {
  const map: Map<U,T> = xs.reduce((m, x) => (
    m.set(fn(x), x)
  ), Map())
  return map.valueSeq()
}

