// @flow
import { type AuthState } from './auth';
import { type DashboardState } from './dashboard';

export type GlobalState = {
  dashboard: DashboardState,
  auth: AuthState,
};

export type Tab = 'map' | 'list';
