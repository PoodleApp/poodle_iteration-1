/* @flow */

import { reduce, update } from 'sunshine-framework'
import { set }            from 'safety-lens'
import * as CS            from './state'

import type { Reducers }        from 'sunshine-framework'
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

const reducers: Reducers<CS.ComposerState> = [

  reduce(Edit, (state, { activity }) => update(
    set(CS.editing, activity, state)
  )),

  reduce(ShowAddPeople, (state, { toggle }) => update(
    set(CS.setAddPeople, toggle ? [] : null, state)
  )),

  reduce(Reset, (state, _) => update(CS.initialState)),

]

export {
  Edit,
  Reset,
  ShowAddPeople,
  reducers,
}
