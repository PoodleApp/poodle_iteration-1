/* @flow */

export type Action = {
  type: 'newAccount',
  email: ?string,
}

function newAccount(email: ?string): Action {
  return {
    type: 'newAccount',
    email,
  }
}

export {
  newAccount,
}
