// @flow
// key function for making a new state in reducers
export default function cloneState<T> (originalObject: T, changes: $Shape<T>): T {
  return Object.assign({}, originalObject, changes);
}
