/* @flow */

import {
  fetchCollection,
  fetchRecord,
  createRecord,
  updateRecord,
  deleteRecord,
} from 'redux-crud-store'

import type { CrudAction } from 'redux-crud-store'
import type { Thread }     from 'arfe/models/thread'

export type ThreadResult = {
  id:     string,
  thread: Thread,
}

export function fetchLatestThreads(): CrudAction<ThreadResult[]> {
  return fetchCollection('threads', '/threads')
}

export function fetchThreadsByQuery(query: string): CrudAction<ThreadResult[]> {
  return fetchCollection('threads', '/threads', { query })
}
