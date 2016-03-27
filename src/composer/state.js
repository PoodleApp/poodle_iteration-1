/* @flow */

import { Record }                     from 'immutable'
import { compose, filtering, getter } from 'safety-lens'
import { prop }                       from 'safety-lens/es2015'
import { constructor }                from '../util/record'

import type { Getter, Lens_, Traversal_ } from 'safety-lens'
import type { Address }                   from 'arfe/models/address'
import type { DerivedActivity }           from 'arfe/derivedActivity'
import type { Constructor }               from '../util/record'

export type ComposerState = {
  addPeople?: Address[],
  editing?:   DerivedActivity,
}

const newComposerState: Constructor<{},ComposerState> = constructor({})

const initialState = newComposerState({})

const showAddPeople: Getter<ComposerState, boolean> = getter(state => !!state.addPeople)
const setAddPeople: Lens_<ComposerState, ?Address[]> = prop('addPeople')
const addPeople: Traversal_<ComposerState, Address[]> = compose(prop('addPeople'), filtering(ppl => !!ppl))
const editing: Lens_<ComposerState, ?DerivedActivity> = prop('editing')

export {
  addPeople,
  editing,
  initialState,
  setAddPeople,
  showAddPeople,
}
