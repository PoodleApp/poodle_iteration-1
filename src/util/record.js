/* @flow */

export type Constructor<Config,T:Object> = (values: Config & $Shape<T>) => T

function constructor<D:Object,T:Object>(defaults: D): Constructor<$Diff<T,D>,T> {
  return values => Object.freeze(Object.assign(({}:any), defaults, values))
}

export {
  constructor,
}
