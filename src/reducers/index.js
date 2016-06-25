/* @flow */

import { combineReducers } from 'redux'
import { routerReducer }   from 'react-router-redux'
import configReducer       from './config'
import chromeReducer       from './chrome'
import settingsReducer     from './settings/reducers'

import type { State as ConfigState }   from './config'
import type { State as ChromeState }   from './chrome'
import type { State as SettingsState } from './settings/reducers'

export type State = {
  config:   ConfigState,
  chrome:   ChromeState,
  routing:  Object,
  settings: SettingsState,
}

export default combineReducers({
  config:   configReducer,
  chrome:   chromeReducer,
  routing:  routerReducer,
  settings: settingsReducer,
})
