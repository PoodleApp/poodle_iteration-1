/* @flow */

import * as Sunshine  from 'sunshine-framework/react'
import React          from 'react'
import * as immutable from 'immutable'
import makeRouter     from 'hash-brown-router'
import { set }        from 'safety-lens'
import { Styles }     from 'material-ui'
import * as State     from '../state'
import * as Event     from '../event'
import * as CE        from '../composer/event'
import * as AE        from '../add_account/event'
import { App }        from '../components/Views'
import {}             from './polyfills'

export {
  run,
}

var router = makeRouter()

var q = (window.location.href.match(/[?&]q=(.*?)&?$/) || [])[1]

var initialState = q ?
  set(State.routeParams, immutable.Map({ q: decodeURIComponent(q) }), State.initialState) :
  State.initialState

var app = new Sunshine.App(initialState, () => {
  app.emit(new Event.LoadConfig())
  router.evaluateCurrent('/')
})

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
  app.emit(new AE.NewAccount(decodeURIComponent(params.email)))
})

var ThemeManager = new Styles.ThemeManager()
import { PoodleTheme } from '../themes'
ThemeManager.setTheme(PoodleTheme)

class ContextWrapper extends React.Component<{},{},{}> {
  getChildContext(): Object {
    return {
      _sunshineApp: app,
      muiTheme: ThemeManager.getCurrentTheme(),
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
