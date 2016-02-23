/* @flow */

export type Constructor<D,T> = (values: $Diff<T,D> & $Shape<T>) => T

function constructor<D:Object,T:Object>(defaults?: D): Constructor<D,T> {
  return values => Object.freeze(Object.assign({}, defaults || {}, values))
}

export {
  constructor,
}
