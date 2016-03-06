/* @flow */

import * as m from 'mori'

import type { Pair, Seq, Seqable, Set, Vector } from 'mori'

function butLast<A>(coll: Vector<A>): Vector<A> {
  return m.subvec(coll, 0, m.count(coll) - 1)
}

function join(sep: string, coll: Seqable<string>): string {
  return m.intoArray(coll).join(sep)
}

function pair<A,B>(a: A, b: B): Pair<A,B> {
  return m.vector(a, b)
}

function partition<A>(fn: (_: A) => boolean, coll: Seqable<A>): [Vector<A>, Vector<A>] {
  const groups = m.groupBy(fn, coll)
  return [m.get(groups, true, m.vector()), m.get(groups, false, m.vector())]
}

function subtract<A>(colla: Set<A>, collb: Set<A>): Set<A> {
  return m.disj(colla, ...m.intoArray(collb))
}

function uniqBy<T,U>(fn: (_: T) => U, xs: Seqable<T>): Seq<T> {
  const map = m.into(m.hashMap(), m.map(x => m.vector(fn(x), x), xs))
  return m.vals(map)
}

export {
  butLast,
  join,
  pair,
  partition,
  subtract,
  uniqBy,
}
