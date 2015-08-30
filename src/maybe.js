/* @flow */

import { List } from 'immutable'

export {
  catMaybes,
  maybeToList,
}

function catMaybes<T>(maybes: List<?T>): List<T> {
  return maybes.filter(x => !!x)
}

function maybeToList<T>(x: ?T): List<T> {
  return x ? List.of(x) : List()
}
