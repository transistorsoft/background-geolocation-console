// @flow
import React from 'react';
import { connect } from 'react-redux';
import { type GlobalState } from '~/reducer/state';

type Props = {|
  isLoading: boolean,
|};
const LoadingIndicator = ({ isLoading }: Props) =>
  <div
    style={{
      zIndex: 10000,
      display: isLoading ? '' : 'none',
      position: 'absolute',
      top: 15,
      left: '50%',
      background: 'yellow',
      padding: 10,
    }}
  >
    Loading locations ...
  </div>;

const mapStateToProps = (state: GlobalState) => ({
  isLoading: state.dashboard.isLoading,
});
export default connect(mapStateToProps)(LoadingIndicator);
