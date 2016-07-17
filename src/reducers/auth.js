/* @flow */

import type { OauthCredentials } from '../stores/gmail/google-oauth'

export type State = {
  creds?: OauthCredentials  // update state when creds appear to trigger re-render
}

const initialState = {}

export default function reducer(state: State = initialState, action: Object): State {
  switch (action.type) {
    case 'auth/accessToken':
      return {
        ...state,
        creds: action.creds
      }
    default:
      return state
  }
}
