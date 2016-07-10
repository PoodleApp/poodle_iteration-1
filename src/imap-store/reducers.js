/* @flow */

export type State = {}

type Action = Object

const initialState: State = {}

export function reduce(state: State = initialState, action: Action): State {
  switch action.type {
    default:
      return state
  }
}
