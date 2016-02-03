/* @flow */

import { List }  from 'immutable'
import { lens }  from 'safety-lens'
import { index } from 'safety-lens/immutable'

import type { Lens_ }        from 'safety-lens'
import type { Conversation } from '../conversation'

export type View = <R>(
  RootView:         (searchQuery: ?string, conversations: ?List<Conversation>) => R,
  ConversationView: (id: ?string, uri: ?string, conversation: ?Conversation)   => R,
  ComposeView:      () => R,
  SettingsView:     () => R,
  AddAccountView:   () => R
) => R

export type ViewState = List<View>

const initialState = List.of(RootView())


/* View constructors */

function RootView(searchQuery: ?string = null, conversations: ?List<Conversation> = null): ViewState {
  return function<R>(a: *, b: *, c: *, d: *, e: *): R {
    return a(searchQuery, conversations)
  }
}

function ConversationView(id: ?string, uri: ?string, conversation: ?Conversation = null): ViewState {
  return function<R>(a: *, b: *, c: *, d: *, e: *): R {
    return b(id, uri, conversation)
  }
}

function ComposeView(): ViewState {
  return function<R>(a: *, b: *, c: *, d: *, e: *): R {
    return c()
  }
}

function SettingsView(): ViewState {
  return function<R>(a: *, b: *, c: *, d: *, e: *): R {
    return d()
  }
}

function AddAccountView(): ViewState {
  return function<R>(a: *, b: *, c: *, d: *, e: *): R {
    return e()
  }
}


/* lenses & helpers */

const view: Lens_<ViewState,View> = lens(
  vs => vs.shift(),
  (vs, v) => replaceView(v, vs)
)

function pushView(v: View, vs: ViewState): ViewState {
  return vs.unshift(v)
}

function popView(vs: ViewState): [?View, ViewState] {
  const v = vs.first()
  const vs_ = vs.count() > 1 ? vs.shift() : vs
  return [v, vs_]
}

function replaceView(v: View, vs: ViewState): ViewState {
  return vs.shift().unshift(v)
}

export {
  RootView,
  ConversationView,
  ComposeView,
  SettingsView,
  AddAccountView,
  initialState,
  popView,
  pushView,
  replaceView,
  view,
}


