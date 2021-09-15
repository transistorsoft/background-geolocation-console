// @flow
/* eslint-disable no-console */
import cloneState from '../../utils/cloneState';

import {
  type Dispatch,
  type ThunkAction,
} from '../types';

import { loadInitialData } from '../dashboard';

import { setAuth, getAuth } from '../../storage';

import { API_URL } from '../../constants';

const shared = !!process.env.SHARED_DASHBOARD;

type AuthPayload = { accessToken: string, org: string };
getAuth;

type SetAccessTokenAction = {|
  type: 'auth/SET_ACCESS_TOKEN',
  value: AuthPayload,
|};

type SetAuthModalOpenAction = {|
  type: 'auth/SET_MODAL_OPEN',
  value: boolean,
|};

type LogoutAction = {|
  type: 'auth/LOGOUT',
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
  | SetAccessTokenAction
  | SetTokenLoadingAction;

// ------------------------------------
// Action Creators
// ------------------------------------

export const setAccessToken = (value: AuthPayload): SetAccessTokenAction => ({ type: 'auth/SET_ACCESS_TOKEN', value });

export const setAuthModalOpen = (value: boolean): SetAuthModalOpenAction => ({ type: 'auth/SET_MODAL_OPEN', value });

export const setAuthError = (value: string): AuthErrorAction => ({ type: 'auth/ERROR', value });

export const setTokenLoading = (): SetTokenLoadingAction => ({ type: 'auth/ACCESS_TOKEN_LOADING' });

export const logoutAction = (): LogoutAction => ({ type: 'auth/LOGOUT' });

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
        setAuth({ org, accessToken });
        await dispatch(loadInitialData(org));
      } else {
        await dispatch(setAuthError(error));
      }
    } catch (e) {
      console.error('checkAuth', e);
    }
  };

export const logout = (): ThunkAction => async (dispatch: Dispatch): Promise<void> => {
  setAuth({ org: '', accessToken: '' });
  await dispatch(logoutAction());
  window.location.href = '/admin';
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
      setAuth({ org, accessToken });
      await dispatch(loadInitialData(org));
    } else {
      await dispatch(setAuthError(error));
    }
  } catch (e) {
    console.error('loadLocations', e);
  }
};

export const prepareView =
  (token: string): ThunkAction => async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    const {
      auth: { org, accessToken },
      dashboard: { hasData },
    } = getState();
    const isAdminPath = token === 'admin';
    const hasToken = (!!org || (!isAdminPath && !!token));
    const action = !hasToken && !!shared
    // auth mode for admin
      ? showAuthDialog()
    // admin or without auth mode
      : (
        !accessToken
          ? getDefaultJwt(token || org)
          : loadInitialData(org)
      );

    !hasData && action && await dispatch(action);
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

const logoutHandler = (state: AuthState): AuthState => cloneState(
  state,
  {
    loading: false, org: '', accessToken: '',
  },
);

// ------------------------------------
// Initial State
// ------------------------------------

const { org = '', accessToken = '' } = getAuth() || {};

const initialState: AuthState = {
  org,
  error: '',
  accessToken,
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
    case 'auth/LOGOUT':
      return logoutHandler(state, action);
    default:
      // eslint-disable-next-line no-unused-expressions
      (action: empty);
      return state;
  }
}
