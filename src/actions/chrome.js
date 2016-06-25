/* @flow */

import type { DerivedActivity } from 'arfe/derivedActivity'

export type Action =
  | { type: 'dismissError' }
  | { type: 'dismissNotify' }
  | { type: 'leftNavToggle',    open: ?boolean }
  | { type: 'showError',        error: Error }
  | { type: 'showLink',         activity: ?DerivedActivity }
  | { type: 'showNotification', notification: string }

const dismissError: Action = Object.freeze({
  type: 'dismissError'
})

const dismissNotify: Action = Object.freeze({
  type: 'dismissNotify'
})

function leftNavToggle(open: ?boolean): Action {
  return {
    type: 'leftNavToggle',
    open,
  }
}

function showError(error: Error): Action {
  return {
    type: 'showError',
    error,
  }
}

function showLink(activity: ?DerivedActivity): Action {
  return {
    type: 'showLink',
    activity,
  }
}

function showNotification(notification: string): Action {
  return {
    type: 'showNotification',
    notification,
  }
}

export {
  dismissError,
  dismissNotify,
  leftNavToggle,
  showError,
  showLink,
  showNotification,
}
