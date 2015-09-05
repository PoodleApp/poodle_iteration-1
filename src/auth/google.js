/* @flow */

import electronGoogleOauth from 'electron-google-oauth'
import BrowserWindow       from 'browser-window'
import google              from 'googleapis'

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

var scopes = [
  'email',  // get user's email address
  'https://mail.google.com/',  // IMAP and SMTP access
  'https://www.googleapis.com/auth/contacts.readonly',  // contacts, read-only
]
var clientId = '550977579314-ot07bt4ljs7pqenefen7c26nr80e492p.apps.googleusercontent.com'
var clientSecret = 'ltQpgi6ce3VbWgxCXzCgKEEG'

function getAccessToken(): Promise<OauthCredentials> {
  var googleOauth = electronGoogleOauth(BrowserWindow)
  return googleOauth.getAccessToken(scopes, clientId, clientSecret)
}

function oauthClient(creds: OauthCredentials): Object {
  var OAuth2 = google.auth.OAuth2
  var oauth2Client = new OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob')
  oauth2Client.setCredentials(creds)
  return oauth2Client
}
