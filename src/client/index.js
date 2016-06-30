/* @flow */

import React                            from 'react'
import { render }                       from 'react-dom'
import { Provider }                     from 'react-redux'
import { routerMiddleware }             from 'react-router-redux'
import { applyMiddleware, createStore } from 'redux'
import logger                           from 'redux-logger'
import sagaMiddleware                   from 'redux-saga'
import reducers                         from '../reducers'
import sagas                            from '../sagas'
import './polyfills'

import {
  IndexRoute, Redirect, Router, Route, hashHistory
} from 'react-router'

import App            from '../components/App'
import ActivityStream from '../components/ActivityStream'

export {
  run,
}

const history = hashHistory
const router = routerMiddleware(history)
const saga = sagaMiddleware()

const middleware = process.env.NODE_ENV === 'production' ?
  [ router, saga ] :
  [ router, saga, logger() ]

const store = createStore(
  reducers,
  applyMiddleware(...middleware)
)

saga.run(sagas)

function run(domElement: Element) {
  render(
    <Provider store={store}>
      <Router history={history}>
        <Route component={App}>
          <IndexRoute component={ActivityStream} />
        </Route>
      </Router>
    </Provider>,
    domElement
  )
}

          // <Route path="compose/:activityType" component={ComposeView} />
          // <Route path="conversations/:id"     component={Conversation} />
          // <Route path="activities/:uri"       component={Conversation} />
          // <Route path="settings"              component={Settings} />
          // <Route path="add_account"           component={AddAccount} />
