/* @flow */

import type { Thread } from '../models/thread'

export type ThreadDoc = {
  _id: string,
  _rev?: string,
  type: 'thread',
  thread: Thread,
}

export type QueryResponseWithDoc<Value,Doc> = {
  total_rows: number,
  offset:     number,
  rows: {
    doc:   Doc,
    id:    string,
    key:   string,
    value: Value,
  }[],
}
