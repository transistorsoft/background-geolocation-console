// @flow
import React, { useEffect } from 'react';
import { connect } from 'react-redux';

import type { GlobalState } from '../reducer/state';
import { prepareView as prepareAction } from '../reducer/auth';

import Viewport from './Viewport';
import Loading from './Loading';
import AuthForm from './AuthForm';

type StateProps = {|
  org: string,
  match: { params?: { token: string } },
  prepare: (string) => void,
  loading: boolean,
|};
const shared = !!process.env.SHARED_DASHBOARD;

const WrappedViewport = ({
  loading,
  match,
  org,
  prepare,
}: StateProps) => {
  const { token } = match.params;
  const isAdminPath = token === 'admin';
  const hasToken = (!!org || (!isAdminPath && !!token));

  useEffect(() => {
    prepare(token);
  }, [token, org]);

  return isAdminPath && !hasToken && shared
    ? <AuthForm />
    : (!loading ? <Viewport /> : <Loading />);
};

const mapStateToProps = (state: GlobalState): StateProps => (
  {
    accessToken: state.auth.accessToken,
    loading: state.auth.loading,
    org: state.auth.org,
  }
);

export default connect(
  mapStateToProps,
  { prepare: prepareAction },
)(WrappedViewport);
