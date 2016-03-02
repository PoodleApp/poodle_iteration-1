/* @flow */

import * as m from 'mori'

import type { Pair, Seq, Seqable } from 'mori'

function join(sep: string, coll: Seqable<string>): string {
  return m.intoArray(coll).join(sep)
}

function pair<A,B>(a: A, b: B): Pair<A,B> {
  return m.vector(a, b)
}

function uniqBy<T,U>(fn: (_: T) => U, xs: Seqable<T>): Seq<T> {
  const map = m.into(m.hashMap(), m.map(x => m.vector(fn(x), x), xs))
  return m.vals(map)
}

export {
  join,
  pair,
  uniqBy,
}
