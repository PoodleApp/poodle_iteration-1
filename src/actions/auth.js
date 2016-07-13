/* @flow */

import type { Account }          from '../config'
import type { OauthCredentials } from '../stores/gmail/google-oauth'

export type Action =
  | { type: 'auth/accessToken', email: string, creds: OauthCredentials }
  | { type: 'auth/setAccount',  account: Account }

export function accessToken(email: string, creds: OauthCredentials): Action {
  return {
    type: 'auth/accessToken',
    email,
    creds,
  }
}

export function setAccount(account: Account): Action {
  return {
    type: 'auth/setAccount',
    account ,
  }
}
