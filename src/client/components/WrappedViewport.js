// @flow
import React from 'react';
import { connect } from 'react-redux';

import type { GlobalState } from 'reducer/state';
import { loadInitialData } from 'reducer/dashboard';
import { showAuthDialog } from 'reducer/auth';

import store from '../store';

import Viewport from './Viewport';
import AuthForm from './AuthForm';

type StateProps = {|
  org: string,
  match: { params?: { token: string } },
|};

const WrappedViewport = ({
  hasData,
  match,
  org,
}: StateProps) => {
  const { token } = match.params;
  const hasToken = !!org || !!token || !!process.env.SHARED_DASHBOARD;
  const action = !hasToken
    ? showAuthDialog()
    : loadInitialData(token);

  !hasData && store.dispatch(action);

  return hasToken
    ? <Viewport />
    : <AuthForm />;
};

const mapStateToProps = (state: GlobalState): StateProps => ({
  org: state.auth.org,
  hasData: state.dashboard.hasData,
});

export default connect(mapStateToProps)(WrappedViewport);
