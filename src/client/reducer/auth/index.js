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

type SetTokenLoadingAction = {|
  type: 'auth/ACCESS_TOKEN_LOADING',
|};

type AuthErrorAction = {|
  type: 'auth/ERROR',
  value: string,
|};

// Combining Actions

type Action =
  | AuthErrorAction
  | CloseAuthModalAction
  | SetAccessTokenAction
  | SetTokenLoadingAction;

// ------------------------------------
// Action Creators
// ------------------------------------

export const setAccessToken = (value: AuthPayload): SetAccessTokenAction => ({ type: 'auth/SET_ACCESS_TOKEN', value });

export const setAuthModalOpen = (value: boolean): SetAuthModalOpenAction => ({ type: 'auth/SET_MODAL_OPEN', value });

export const setAuthError = (value: string): AuthErrorAction => ({ type: 'auth/ERROR', value });

export const setTokenLoading = (): SetTokenLoadingAction => ({ type: 'auth/ACCESS_TOKEN_LOADING' });

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
      await dispatch(setTokenLoading());
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


export const getDefaultJwt = (token: string): ThunkAction => async (dispatch: Dispatch): Promise<void> => {
  try {
    const response = await fetch(
      `${API_URL}/jwt`,
      {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org: token }),
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
    console.error('loadLocations', e);
  }
};

// ------------------------------------
// Action Handlers
// ------------------------------------
const setAccessTokenHandler =
  (state: AuthState, action: SetAccessTokenAction): AuthState => cloneState(
    state,
    {
      ...action.value,
      loading: false,
    },
  );

const setAuthModalOpenHandler =
  (state: AuthState, action: SetAuthModalOpenAction): AuthState => cloneState(
    state,
    { modal: action.value, loading: false },
  );

const setAuthErrorHandler =
  (state: AuthState, action: AuthErrorAction): AuthState => cloneState(
    state,
    { error: action.value, loading: false },
  );

const setTokenLoadingHandler =
(state: AuthState): AuthState => cloneState(
  state,
  { loading: true },
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
    case 'auth/ACCESS_TOKEN_LOADING':
      return setTokenLoadingHandler(state, action);
    default:
      // eslint-disable-next-line no-unused-expressions
      (action: empty);
      return state;
  }
}
