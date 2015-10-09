/* @flow */

export type Address = {
  address: Email,
  name: string,
}

export type Email = string

export {
  displayName,
}

function displayName(addr: Address): string {
  return addr.name || addr.address
}
