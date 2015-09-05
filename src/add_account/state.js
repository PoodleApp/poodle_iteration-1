/* @flow */

import { Record }                     from 'immutable'
import { compose, filtering, getter } from 'safety-lens'
import { field }                      from 'safety-lens/immutable'

import type { Lens_ } from 'safety-lens'

export type AddAccountState = Record & {
  email: ?string,
}

var AddAccountStateRecord = Record({
  email: null,
})

var initialState = new AddAccountStateRecord()

var email: Lens_<AddAccountState,?string> = field('email')

export {
  email,
  initialState,
}
