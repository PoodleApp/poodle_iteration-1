/* @flow */

import * as Sunshine     from 'sunshine/react'
import React             from 'react'
import Router            from 'react-router'
import { initialState }  from './lib/state'
import * as Event        from './lib/event'
import { Conversations } from './lib/components/Views'

var app = new Sunshine.App(initialState, () => {
  Event.init(app)
})

React.render(
  <Conversations app={app} />,
  document.getElementById('app')
)
