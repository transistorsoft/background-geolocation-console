// @flow
import { type GlobalState } from 'reducer/state';

export type GetState = () => GlobalState;
export type Dispatch = (action: Action | ThunkAction) => Promise<void>; // eslint-disable-line no-use-before-define
export type ThunkAction = (dispatch: Dispatch, getState: GetState) => Promise<void>;


export type AuthSettings = {
  org: string,
  accessToken: string,
};

export type AuthInfo = {|
  ...AuthSettings,
  error: string,
|};
