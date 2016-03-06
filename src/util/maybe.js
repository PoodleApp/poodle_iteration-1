/* @flow */

import * as m   from 'mori'

import type { Seq, Seqable } from 'mori'

function catMaybes<T>(maybes: Seqable<?T>): Seq<T> {
  return (m.filter(x => !!x, maybes): any)
}

function maybeToSeqable<T>(x: ?T): T[] {
  return x ? [x] : []
}

export {
  catMaybes,
  maybeToSeqable,
}
