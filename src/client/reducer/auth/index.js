// @flow
/* eslint-disable no-console */
import cloneState from 'utils/cloneState';

import {
  type Dispatch,
  type ThunkAction,
} from 'reducer/types';
import { loadInitialData } from 'reducer/dashboard';

import { API_URL } from '../../constants';


type AuthPayload = { accessToken: string, org: string };

type SetAccessTokenAction = {|
  type: 'auth/SET_ACCESS_TOKEN',
  value: AuthPayload,
|};

type SetAuthModalOpenAction = {|
  type: 'auth/SET_MODAL_OPEN',
  value: boolean,
|};

type AuthErrorAction = {|
  type: 'auth/ERROR',
  value: string,
|};

// Combining Actions

type Action =
  | SetAccessTokenAction
  | CloseAuthModalAction
  | AuthErrorAction;

// ------------------------------------
// Action Creators
// ------------------------------------

export const setAccessToken = (value: AuthPayload): SetAccessTokenAction => ({ type: 'auth/SET_ACCESS_TOKEN', value });

export const setAuthModalOpen = (value: boolean): SetAuthModalOpenAction => ({ type: 'auth/SET_MODAL_OPEN', value });

export const setAuthError = (value: string): AuthErrorAction => ({ type: 'auth/ERROR', value });

// ------------------------------------
// Thunk Actions
// ------------------------------------

export const showAuthDialog =
  (): ThunkAction => async (dispatch: Dispatch): Promise<void> => {
    await dispatch(setAuthError(''));
    await dispatch(setAuthModalOpen(true));
  };

export const checkAuth =
  ({ login, password }: AuthParams): ThunkAction => async (dispatch: Dispatch): Promise<void> => {
    try {
      const response = await fetch(
        `${API_URL}/auth`,
        {
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, password }),
        },
      );
      const {
        access_token: accessToken,
        org,
        error,
      } = await response.json();

      if (accessToken) {
        await dispatch(setAccessToken({ accessToken, org }));
        await dispatch(setAuthModalOpen(false));
        await dispatch(setAuthError(''));
        // setAuth({ org, accessToken });
        await dispatch(loadInitialData(org));
      } else {
        await dispatch(setAuthError(error));
      }
    } catch (e) {
      console.error('checkAuth', e);
    }
  };
// ------------------------------------
// Action Handlers
// ------------------------------------
const setAccessTokenHandler =
  (state: AuthState, action: SetAccessTokenAction): AuthState => cloneState(
    state,
    action.value,
  );

const setAuthModalOpenHandler =
  (state: AuthState, action: SetAuthModalOpenAction): AuthState => cloneState(
    state,
    { modal: action.value },
  );

const setAuthErrorHandler =
  (state: AuthState, action: AuthErrorAction): AuthState => cloneState(
    state,
    { error: action.value },
  );

// ------------------------------------
// Initial State
// ------------------------------------

const initialState: AuthState = {
  org: '',
  error: '',
  accessToken: '',
};

// ------------------------------------
// Reducer
// ------------------------------------
export default function spotsReducer (state: AuthState = initialState, action: Action): DashboardState {
  switch (action.type) {
    case 'auth/SET_ACCESS_TOKEN':
      return setAccessTokenHandler(state, action);
    case 'auth/SET_MODAL_OPEN':
      return setAuthModalOpenHandler(state, action);
    case 'auth/ERROR':
      return setAuthErrorHandler(state, action);
    default:
      // eslint-disable-next-line no-unused-expressions
      (action: empty);
      return state;
  }
}
