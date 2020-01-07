import React from 'react';

import { loadInitialData } from 'reducer/dashboard';

import store from '../store';

import Viewport from './Viewport';


const WrappedViewport = ({ match }) => {
  store.dispatch(loadInitialData(match.params.token));
  return <Viewport />;
};

export default WrappedViewport;
