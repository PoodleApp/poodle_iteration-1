/* @flow */

import chai          from 'chai'
import chaiImmutable from 'chai-immutable'

import { get, set } from 'safety-lens'
import * as V from '../../build/state/ViewState'

const expect = chai.expect
chai.use(chaiImmutable)
declare var describe;
declare var it;

describe('ViewState', function() {

  it('gets a view via lens', function() {
    const newView = V.ComposeView()

    const vs = V.pushView(newView, V.initialState)
    expect(vs).to.have.size(2)  // starting RootView, plus origView

    const view = get(V.view, vs)
    expect(view).to.equal(newView)
  })

  it('sets a view via lens', function() {
    const origView = V.ComposeView()
    const newView  = V.SettingsView()

    let vs = V.pushView(origView, V.initialState)
    expect(vs).to.have.size(2)  // starting RootView, plus origView

    vs = set(V.view, newView, vs)
    expect(vs).to.have.size(2)
    expect(vs.first()).to.equal(newView)
  })

})
