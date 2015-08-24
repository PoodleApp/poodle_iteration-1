/* @flow */

export {
  catMaybes,
}

function catMaybes<T>(maybes: List<?T>): List<T> {
  return maybes.filter(x => !!x)
}
