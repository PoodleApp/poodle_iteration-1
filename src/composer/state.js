/* @flow */

import { Record }                     from 'immutable'
import { compose, filtering, getter } from 'safety-lens'
import { field }                      from 'safety-lens/immutable'

import type { Getter, Lens_, Traversal_ } from 'safety-lens'
import type { Address }                   from '../models/address'
import type { DerivedActivity }           from '../derivedActivity'

export type ComposerState = {
  addPeople: ?Address[],
  editing:   ?DerivedActivity,
}

function composerState(values: $Shape<ComposerState>): ComposerState {
  return Object.assign(({
    addPeople: null,
    editing:   null,
  }: ComposerState), values)
}

const initialState = composerState()

const showAddPeople: Getter<ComposerState, boolean> = getter(state => !!state.addPeople)
const setAddPeople: Lens_<ComposerState, ?Address[]> = field('addPeople')
const addPeople: Traversal_<ComposerState, Address[]> = compose(field('addPeople'), filtering(ppl => !!ppl))
const editing: Lens_<ComposerState, ?DerivedActivity> = field('editing')

export {
  addPeople,
  editing,
  initialState,
  setAddPeople,
  showAddPeople,
}
