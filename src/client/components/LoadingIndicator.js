// @flow
import React from 'react';
import { connect } from 'react-redux';
import {
  Fade,
  LinearProgress,
 } from '@material-ui/core';
import { type GlobalState } from '~/reducer/state';

const style = {
  height: 10,
  zIndex: '1000',
  top: 0,
  position: 'absolute',
  left: 0,
  right: 0,
};

type Props = {|
  isLoading: boolean,
|};
const LoadingIndicator = ({ isLoading }: Props) => (<div style={style}>
  <Fade
    in={isLoading}
    style={{
      transitionDelay: isLoading ? '800ms' : '0ms',
    }}
    unmountOnExit
  >
    <LinearProgress />
  </Fade>
</div>);

const mapStateToProps = (state: GlobalState) => ({
  isLoading: state.dashboard.isLoading,
});
export default connect(mapStateToProps)(LoadingIndicator);
