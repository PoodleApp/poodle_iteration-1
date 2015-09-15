/* @flow */

export {
  lift0,
  lift1,
}

function lift0<T>(fn: (cb: (err: any) => void) => any): Promise<void> {
  return new Promise((resolve, reject) => {
    fn((err, value) => {
      if (err) { reject(err) }
      else { resolve(undefined) }
    })
  })
}

function lift1<T>(fn: (cb: (err: any, value: T) => void) => any): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, value) => {
      if (err) { reject(err) }
      else { resolve(value) }
    })
  })
}
