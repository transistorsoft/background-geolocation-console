// @flow
import React, { useEffect } from 'react';
import { connect } from 'react-redux';

import type { GlobalState } from 'reducer/state';
import { showAuthDialog, getDefaultJwt } from 'reducer/auth';

import store from '../store';

import Viewport from './Viewport';
import Loading from './Loading';
import AuthForm from './AuthForm';

type StateProps = {|
  org: string,
  match: { params?: { token: string } },
|};

const WrappedViewport = ({
  hasData,
  loading,
  match,
  org,
}: StateProps) => {
  const { token } = match.params;
  const shared = !!process.env.SHARED_DASHBOARD;
  const hasToken = (!!org || !!token);
  useEffect(() => {
    const action = !hasToken && !!shared
      ? showAuthDialog()
      : getDefaultJwt(token);

    !hasData && store.dispatch(action);
  });
  return hasToken || !shared
    ? (!loading ? <Viewport /> : <Loading />)
    : <AuthForm />;
};

const mapStateToProps = (state: GlobalState): StateProps => ({
  org: state.auth.org,
  loading: state.auth.loading,
  hasData: state.dashboard.hasData,
});

export default connect(mapStateToProps)(WrappedViewport);
