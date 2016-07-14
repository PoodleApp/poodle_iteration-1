/* @flow */

import type { Config } from '../config'
import type { Action } from './actions'

export type State = ?Config

const initialState = null

export default function reducer(state: State = initialState, action: Action | {}): State {
  switch (action.type) {
    case 'gotConfig':
      return action.config
    default:
      return state
  }
}
