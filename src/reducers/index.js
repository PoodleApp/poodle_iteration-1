/* @flow */

import { combineReducers }   from 'redux'
import { routerReducer }     from 'react-router-redux'
import { crudReducer }       from 'redux-crud-store'
import activityStreamReducer from './activityStream'
import authReducer           from './auth'
import configReducer         from './config'
import chromeReducer         from './chrome'
import settingsReducer       from '../settings/reducers'

import type { State as StreamState }   from './activityStream'
import type { State as AuthState }     from './auth'
import type { State as ConfigState }   from './config'
import type { State as ChromeState }   from './chrome'
import type { State as SettingsState } from '../settings/reducers'
import type { State as ImapState }     from '../imap-store/reducers'

export type State = {
  activityStream: StreamState,
  auth:           AuthState,
  config:         ConfigState,
  chrome:         ChromeState,
  imap:           ImapState,
  models:         Object,
  routing:        Object,
  settings:       SettingsState,
}

export default combineReducers({
  activityStream: activityStreamReducer,
  auth:           authReducer,
  config:         configReducer,
  chrome:         chromeReducer,
  models:         crudReducerWithClear,
  routing:        routerReducer,
  settings:       settingsReducer,
})

function crudReducerWithClear(state: Object, action: Object): Object {
  switch (action.type) {
    case 'redux-crud-store/clear-everything':
      return state.clear()
    default:
      return crudReducer(state, action)
  }
}
