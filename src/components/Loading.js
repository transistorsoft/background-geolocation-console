// @flow
import React from 'react';
import CircularProgress from '@material-ui/core/CircularProgress';

const style = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  textAlign: 'center',
  width: '100%',
};

const Loading = () => (
  <div style={style}><CircularProgress /></div>
);

export default Loading;
