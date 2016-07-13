/* @flow */

import electron from 'electron'

type Request<T>  = { id: number, payload: T }
type Response<U> = { id: number, payload?: U, error?: string }

let reqId = 0
export function request<T,U>(channel: string, payload: T): Promise<U> {
  return new Promise((resolve, reject) => {
    const id = reqId++
    function listener({ id: responseId, payload, error }: Response<U>) {
      if (responseId === id) {
        if (payload) { resolve(payload) }
        else { reject(new Error(error)) }
        electron.ipcRenderer.removeListener(`${channel}/response`, listener)
      }
    }
    electron.ipcRenderer.on(`${channel}/response`, listener)
    electron.ipcRenderer.send(`${channel}/request`, { id, payload })
  })
}

export function respond<T,U>(channel: string, fn: (payload: T) => Promise<U>) {
  electron.ipcMain.on(`${channel}/request`, (event, { id, payload }: Request<*>) => {
    fn((payload:any)).then(
      response => event.sender.send(`${channel}/response`, { id, payload: response }),
      error    => event.sender.send(`${channel}/response`, { id, error })
    )
  })
}
