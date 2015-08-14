/* @flow */

import * as Sunshine          from 'sunshine/react'
import React                  from 'react'
import makeRouter             from 'hash-brown-router'
import { Styles }             from 'material-ui'
import { initialState }       from './lib/state'
import * as Event             from './lib/event'
import { App, Conversations } from './lib/components/Views'
import {}                     from './polyfills'

var router = makeRouter()

var app = new Sunshine.App(initialState, () => {
  Event.init(app, router)
  app.emit(new Event.LoadConfig())
  router.evaluateCurrent('/')
})

router.add('/', () => {
  app.emit(new Event.ViewRoot())
})

router.add('/conversations/:id', params => {
  app.emit(new Event.ViewConversation(params.id))
})

router.add('/settings', () => {
  app.emit(new Event.ViewSettings())
})

var ThemeManager = new Styles.ThemeManager()
ThemeManager.setTheme(ThemeManager.types.LIGHT)

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

React.render(
  <ContextWrapper />,
  document.body
)
