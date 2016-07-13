/**
 * Code here is adapted from electron-google-oauth
 * https://github.com/parro-it/electron-google-oauth/tree/master/es6
 *
 * @flow
 */

import { BrowserWindow } from 'electron'
import google            from 'googleapis'
import { stringify }     from 'querystring';
import fetch             from 'node-fetch'

export {
  getAccessToken,
  oauthClient,
}

export type OauthCredentials = {
  access_token:  string,
  token_type:    string,  // "Bearer"
  expires_in:    number,  // seconds
  id_token:      string,
  refresh_token: string,
}

type AccessTokenOpts = {
  scopes:                  string[],
  client_id:               string,
  client_secret:           string,
  login_hint?:             string,
  include_granted_scopes?: boolean,
}

function getAccessToken(opts: AccessTokenOpts): Promise<OauthCredentials> {
  var { client_id, client_secret } = opts
  return getAuthorizationCode(opts).then(authorizationCode => {
    var body = stringify({
      code: authorizationCode,
      client_id,
      client_secret,
      grant_type: 'authorization_code',
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    })
    return fetch('https://accounts.google.com/o/oauth2/token', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  })
  .then(res => res.json())
}

function getAuthorizationCode({
  scopes,
  client_id,
  client_secret,
  login_hint,
  include_granted_scopes,
}: AccessTokenOpts): Promise<string> {
  var params: Object = {
    access_type: 'offline',
    scope:       scopes,
  }
  if (login_hint) { params.login_hint = login_hint }
  if (typeof include_granted_scopes === 'boolean') {
    params.include_granted_scopes = include_granted_scopes
  }
  var url = oauthClient(client_id, client_secret).generateAuthUrl(params)
  return authorizeApp(url)
}

function oauthClient(client_id: string, client_secret: string): Object {
  var OAuth2 = google.auth.OAuth2
  return new OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob')
}

function authorizeApp(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    var win = new (BrowserWindow:any)({
      'use-content-size': true
    })

    win.loadUrl(url)

    win.on('closed', () => {
      reject(new Error('User closed the window'))
    })

    win.on('page-title-updated', () => {
      setImmediate(() => {
        var title = win.getTitle()
        if (title.startsWith('Denied')) {
          reject(new Error(title.split(/[ =]/)[2]))
          win.removeAllListeners('closed')
          win.close()
        }
        else if (title.startsWith('Success')) {
          resolve(title.split(/[ =]/)[2])
          win.removeAllListeners('closed')
          win.close()
        }
      })
    })
  })
}
