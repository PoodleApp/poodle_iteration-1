/* @flow */

import {
  fetchCollection,
  fetchRecord,
  createRecord,
  updateRecord,
  deleteRecord,
} from 'redux-crud-store'

import type { CrudAction }      from 'redux-crud-store'
import type { DerivedActivity } from 'arfe/derivedActivity'

export function fetchLatestActivities(): CrudAction<DerivedActivity[]> {
  return fetchCollection('activities', '/activities')
}

export function fetchActivitiesByQuery(query: string): CrudAction<DerivedActivity[]> {
  return fetchCollection('activities', '/activities', { query })
}
