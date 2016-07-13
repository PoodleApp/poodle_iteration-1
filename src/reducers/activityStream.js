/* @flow */

import type { Action } from '../actions/activityStream'

export type State = {
  query: string,
}

const initialState: State = {
  query: 'newer_than:2d'
}

export default function reducer(state: State = initialState, action: Action | {}): State {
  switch (action.type) {
    case 'activityStream/search':
      return {
        ...state,
        query: action.query,
      }
    default:
      return state
  }
}
