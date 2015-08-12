/* @flow */

import * as Sunshine    from 'sunshine/react'
import React            from 'react'
import Router           from 'react-router'
import { initialState } from './lib/state'
import * as Event       from './lib/event'
import Main             from './lib/components/Main'

var app = new Sunshine.App(initialState)
Event.init(app)

class MainWrapper extends Sunshine.Component<{},{},{}> {
  render(): React.Element {
    return (
      <Main app={app}/>
    )
  }
}

var Route = Router.Route
var routes = (
  <Route handler={MainWrapper}/>
)

Router.run(routes, Router.HashLocation, Root => {
  React.render(<Root/>, document.getElementById('app'))
})
