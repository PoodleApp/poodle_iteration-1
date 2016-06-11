/* @flow */

import type { DerivedActivity } from 'arfe/derivedActivity'
import type { Action }          from '../actions/chrome'

export type State = {
  error?:        ?Error,
  leftNavOpen:   boolean,
  notification?: ?string,
  showLink?:     ?DerivedActivity,
}

const inititialState: State = {
  leftNavOpen: false,
}

export default function reducer(state: State = inititialState, action: Action): State {
  switch (action.type) {
    case 'dismissError':
      return {
        ...state,
        error: null,
      }
    case 'dismissNotify':
      return {
        ...state,
        notification: null,
      }
    case 'leftNavToggle':
      const open = typeof action.open === 'boolean' ? action.open : !state.leftNavOpen
      return {
        ...state,
        leftNavOpen: open,
      }
    case 'showError':
      return {
        ...state,
        error: action.error,
      }
    case 'showLink':
      return {
        ...state,
        showLink: action.activity,
      }
    case 'showNotification':
      return {
        ...state,
        notification: action.notification,
      }
    default:
      return state
  }
}
