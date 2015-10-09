/* @flow */

import { Record }                     from 'immutable'
import { compose, filtering, getter } from 'safety-lens'
import { field }                      from 'safety-lens/immutable'

import type { Getter, Lens_, Traversal_ } from 'safety-lens'
import type { Address }                   from '../models/address'
import type { DerivedActivity }           from '../derivedActivity'

export type ComposerState = Record<{
  addPeople: ?Address[],
  editing:   ?DerivedActivity,
}>

var ComposerStateRecord = Record({
  addPeople: null,
  editing:   null,
})

var initialState = new ComposerStateRecord()

var showAddPeople: Getter<ComposerState, boolean> = getter(state => !!state.addPeople)
var setAddPeople: Lens_<ComposerState, ?Address[]> = field('addPeople')
var addPeople: Traversal_<ComposerState, Address[]> = compose(field('addPeople'), filtering(ppl => !!ppl))
var editing: Lens_<ComposerState, ?DerivedActivity> = field('editing')

export {
  addPeople,
  editing,
  initialState,
  setAddPeople,
  showAddPeople,
}
