/* @flow */

import { Record } from 'immutable'
import xoauth2    from 'xoauth2'
import { field }  from 'safety-lens/immutable'
import { lift1 }  from '../util/promises'

export type AuthState = Record<{
  tokenGen: ?Object,
}>

var AuthStateRecord = Record({
  tokenGen: null,
})

var initialState = new AuthStateRecord()

var tokenGen = field('tokenGen')

function getToken(state: AuthState): Promise<string> {
  var { tokenGen } = state
  if (!tokenGen) { return Promise.reject("No token generator is available") }
  return lift1(cb => tokenGen.getToken(cb))
}

export {
  getToken,
  initialState,
  tokenGen,
}
