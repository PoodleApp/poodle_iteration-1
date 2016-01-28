/* @flow */

import * as Sunshine from 'sunshine-framework'
import * as State    from './state'
import * as Event    from './event'

const app = new Sunshine.App(State.initialState, Event.reducers)

export {
  app,
}

