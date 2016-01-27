/* @flow */

import * as Sunshine   from 'sunshine-framework/react'
import React           from 'react'
import * as immutable  from 'immutable'
import makeRouter      from 'hash-brown-router'
import { set }         from 'safety-lens'
import ThemeManager    from 'material-ui/lib/styles/theme-manager'
import { PoodleTheme } from '../themes'
import * as State      from '../state'
import * as Event      from '../event'
import * as CE         from '../composer/event'
import * as AE         from '../add_account/event'
import { App }         from '../components/Views'
import {}              from './polyfills'

export {
  run,
}

var router = makeRouter()

var q = (window.location.href.match(/[?&]q=(.*?)&?$/) || [])[1]

var initialState = q ?
  set(State.routeParams, immutable.Map({ q: decodeURIComponent(q) }), State.initialState) :
  State.initialState

var app = new Sunshine.App(initialState, Event.reducers)

setTimout(() => {
  app.emit(new Event.LoadConfig())
  router.evaluateCurrent('/')
}, 0)

Event.init(app, router)
CE.init(app)
AE.init(app)

router.add('/', params => {
  app.emit(new Event.ViewRoot(params.q))
})

router.add('/compose/:activityType', params => {
  app.emit(new Event.ViewCompose(immutable.fromJS(params)))
})

router.add('/conversations/:id', params => {
  app.emit(new Event.ViewConversation(params.id))
})

router.add('/conversations/:id', params => {
  app.emit(new Event.ViewConversation(params.id))
})

router.add('/activities/:uri', params => {
  app.emit(new Event.ViewActivity(decodeURIComponent(params.uri)))
})

router.add('/settings', () => {
  app.emit(new Event.ViewSettings())
})

router.add('/add_account', params => {
  app.emit(new Event.ViewAccountSetup(decodeURIComponent(params.email)))
})

class ContextWrapper extends React.Component<{},{},{}> {
  getChildContext(): Object {
    return {
      _sunshineApp: app,
      muiTheme: ThemeManager.getMuiTheme(PoodleTheme),
    }
  }

  render(): React.Element {
    return (
      <App/>
    )
  }
}
ContextWrapper.childContextTypes = {
  _sunshineApp: React.PropTypes.instanceOf(Sunshine.App).isRequired,
  muiTheme: React.PropTypes.object.isRequired,
}

function run(domElement: Element) {
  React.render(
    <ContextWrapper />,
    domElement
  )
}


// import ipc from 'electron-safe-ipc/guest'

// ipc.on('message', message => {
//   console.log('message', message)
// })

// ipc.send('sync', 'Changes in Poodle')

import PouchDB     from 'pouchdb'
import * as config from '../config'
import { sync }    from '../sync'

config.loadConfig().then(config => {
  var account = config.accounts.get(0)
  if (account) {
    sync('Testing Poodle', account).onValue(resp => {
      // console.log('message', typeof resp)
      console.log('message', resp)
    })
    .onError(err => console.log(err))
  }
})
