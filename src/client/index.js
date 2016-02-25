/* @flow */

import * as Sunshine   from 'sunshine-framework/react'
import React           from 'react'
import ReactDOM        from 'react-dom'
import * as immutable  from 'immutable'
import * as Kefir      from 'kefir'
import makeRouter      from 'hash-brown-router'
import { set }         from 'safety-lens'
import ThemeManager    from 'material-ui/lib/styles/theme-manager'
import { PoodleTheme } from '../themes'
import * as State      from '../state'
import * as Event      from '../event'
import * as AddAccount from '../add_account/app'
import * as Auth       from '../auth/app'
import * as Composer   from '../composer/app'
import * as ViewState  from '../state/ViewState'
import * as ViewEvent  from '../event/viewEvent'
import { App }         from '../components/Views'
import {}              from './polyfills'

export {
  run,
}

const router = makeRouter()

const routingEvents = Kefir.stream(emitter => {
  // router.add('/', params => {
  //   emitter.emit(new ViewEvent.ViewRoot(params.q))
  // })

  router.add('/compose/:activityType', params => {
    emitter.emit(new ViewEvent.ViewCompose(immutable.fromJS(params)))
  })

  router.add('/conversations/:id', params => {
    emitter.emit(new ViewEvent.ViewConversation(params.id))
  })

  router.add('/activities/:uri', params => {
    emitter.emit(new ViewEvent.ViewActivity(decodeURIComponent(params.uri)))
  })

  router.add('/settings', () => {
    emitter.emit(new ViewEvent.ViewSettings())
  })

  router.add('/add_account', params => {
    emitter.emit(new ViewEvent.ViewAccountSetup(decodeURIComponent(params.email)))
  })
})

const q = (window.location.href.match(/[?&]q=(.*?)&?$/) || [])[1]

const initialState = q ?
  set(State.routeParams, immutable.Map({ q: decodeURIComponent(q) }), State.initialState) :
  State.initialState

const app =
  new Sunshine.App(initialState, Event.reducers)
  .include(
    [AddAccount.app, State.addAccountState],
    [Auth.app, State.authState],
    [Composer.app, State.composerState],
    [new Sunshine.App(ViewState.initialState, ViewEvent.reducers), State.views]
  )
  .input(
    routingEvents,
    Kefir.later(0, new Event.LoadConfig)
  )

setTimeout(() => {
  router.evaluateCurrent('/')
}, 0)

class ContextWrapper extends React.Component<void,{},void> {
  getChildContext(): Object {
    return {
      _sunshineApp: app.run(),
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
  _sunshineApp: React.PropTypes.instanceOf(Sunshine.Session).isRequired,
  muiTheme: React.PropTypes.object.isRequired,
}

function run(domElement: Element) {
  ReactDOM.render(
    <ContextWrapper />,
    domElement
  )
}
