/* @flow */

import { Record }                     from 'immutable'
import { compose, filtering, getter } from 'lens'
import { field }                      from 'lens/immutable'

import type { Getter, Lens_, Traversal_ } from 'lens'
import type { Address }            from '../notmuch'

export type ComposerState = Record<{
  addPeople: ?Address[],
}>

var ComposerStateRecord = Record({
  addPeople: null,
})

var initialState = new ComposerStateRecord()

var showAddPeople: Getter<ComposerState, boolean> = getter(state => !!state.addPeople)
var setAddPeople: Lens_<ComposerState, ?Address[]> = field('addPeople')
var addPeople: Traversal_<ComposerState, Address[]> = compose(field('addPeople'), filtering(ppl => !!ppl))

export {
  addPeople,
  initialState,
  setAddPeople,
  showAddPeople,
}
