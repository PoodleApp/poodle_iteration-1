/* @flow */

import { Record }                     from 'immutable'
import { compose, filtering, getter } from 'safety-lens'
import { field }                      from 'safety-lens/immutable'

import type { Lens_ } from 'safety-lens'

export type AddAccountState = Record & {
}

var AddAccountStateRecord = Record({
})

var initialState = new AddAccountStateRecord()

export {
  initialState,
}
