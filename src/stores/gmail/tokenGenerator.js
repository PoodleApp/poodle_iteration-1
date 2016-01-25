/* @flow */

import xoauth2 from 'xoauth2'

import type { OauthCredentials } from './google-oauth'

export {
  tokenGenerator,
}

var client_id = '550977579314-ot07bt4ljs7pqenefen7c26nr80e492p.apps.googleusercontent.com'
var client_secret = 'ltQpgi6ce3VbWgxCXzCgKEEG'

declare class Generator extends stream$Readable {
  constructor(options?: Object): void;
  getToken(cb: (err: Error, token: string) => any): void;
  updateToken(accessToken: string, timeout: number): void;
  generateToken(cb: (err: Error, token: string) => any): void;
}

export type XOAuth2Generator = Generator

function tokenGenerator(userEmail: string, creds: OauthCredentials): XOAuth2Generator {
  return xoauth2.createXOAuth2Generator({
    user:         userEmail,
    // accessUrl:    'https://accounts.google.com/oauth2/v3/token',
    clientId:     client_id,
    clientSecret: client_secret,
    refreshToken: creds.refresh_token,
    customParams: {
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    },
  })
}
