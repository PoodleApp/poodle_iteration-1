/* @flow */

import * as Sunshine          from 'sunshine'
import { compose, over, set } from 'lens'
import * as State             from '../../client/lib/state'
import * as CS                from './state'

import type { DerivedActivity } from '../derivedActivity'

class Edit {
  activity: DerivedActivity;
  constructor(activity: DerivedActivity) { this.activity = activity }
}

class ShowAddPeople {
  toggle: boolean;
  constructor(toggle: boolean) { this.toggle = toggle }
}
class Reset {}

function init(app: Sunshine.App<State.AppState>) {
  app.on(Edit, (state, { activity }) => (
    set(compose(State.composerState, CS.editing), activity, state)
  ))

  app.on(ShowAddPeople, (state, { toggle }) => (
    set(compose(State.composerState, CS.setAddPeople), toggle ? [] : null, state)
  ))

  app.on(Reset, (state, _) => (
    set(State.composerState, CS.initialState,
    set(compose(State.composerState, CS.editing), null,
    state))
  ))
}

export {
  init,
  Edit,
  Reset,
  ShowAddPeople,
}
