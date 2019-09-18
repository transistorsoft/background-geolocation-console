import React from 'react';
import Viewport from './Viewport';
import { loadInitialData } from '~/reducer/dashboard';
import store from '../store';

const WrappedViewport = ({ match }) => {
  store.dispatch(loadInitialData(match.params.token));
  return <Viewport />;
};

export default WrappedViewport;
