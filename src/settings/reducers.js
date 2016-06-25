/* @flow */

import type { Config } from '../config'
import type { Action } from './actions'

export type State = ?Config

export default function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'gotConfig':
      return action.config
    default:
      return state
  }
}
