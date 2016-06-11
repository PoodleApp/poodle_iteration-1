/* @flow */

export type State = {
  username?:  ?string,
  useremail?: ?string,
}

type Action = Object

// TODO
const inititialState: State = {
  username: 'Jesse Hallett',
  useremail: 'jesse@sitr.us',
}

export default function reducer(state: State = inititialState, action: Action): State {
  return state
}
