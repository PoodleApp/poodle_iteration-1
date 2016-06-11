/* @flow */

import { combineReducers } from 'redux'
import { routerReducer }   from 'react-router-redux'
import configReducer       from './config'
import chromeReducer       from './chrome'

import type { State as ConfigState } from './config'
import type { State as ChromeState } from './chrome'

export type State = {
  config:  ConfigState,
  chrome:  ChromeState,
  routing: Object,
}

export default combineReducers({
  config:  configReducer,
  chrome:  chromeReducer,
  routing: routerReducer,
})
