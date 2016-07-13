/* @flow */

export type Action =
  | { type: 'activityStream/search', query: string }

export function search(query: string): Action {
  return {
    type: 'activityStream/search',
    query,
  }
}
