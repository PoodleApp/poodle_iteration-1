/* @flow */

import * as Sunshine          from 'sunshine'
import { compose, over, set } from 'lens'
import * as State             from '../../client/lib/state'
import * as CS                from './state'

class ShowAddPeople {
  toggle: boolean;
  constructor(toggle: boolean) { this.toggle = toggle }
}
class Reset {}

function init(app: Sunshine.App<State.AppState>) {
  app.on(ShowAddPeople, (state, { toggle }) => (
    set(compose(State.composerState, CS.setAddPeople), toggle ? [] : null, state)
  ))

  app.on(Reset, (state, _) => (
    set(State.composerState, CS.initialState, state)
  ))
}

export {
  init,
  Reset,
  ShowAddPeople,
}
