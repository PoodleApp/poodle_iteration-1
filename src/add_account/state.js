/* @flow */

import { constructor } from '../util/record'

import type { Lens_ }       from 'safety-lens'
import type { Constructor } from '../util/record'

export type AddAccountState =  {
}

const newAddAccountState: Constructor<{},AddAccountState> = constructor({});

const initialState = newAddAccountState({})

export {
  initialState,
}
