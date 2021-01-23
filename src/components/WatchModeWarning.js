// @flow
import React from 'react';
import { connect } from 'react-redux';

import { type GlobalState } from 'reducer/state';

type Props = {|
  isWatching: boolean,
|};
const WatchModeWarning = ({ isWatching }: Props) => (
  <div
    style={{
      zIndex: 10000,
      display: isWatching ? '' : 'none',
      position: 'absolute',
      top: 22,
      left: '50%',
      transform: 'translateX(-50%)',
      borderRadius: 3,
      color: 'black',
      fontSize: 14,
      padding: 3,
      fontWeight: 'bold',
    }}
  >
    You are in the Watch mode. Only the latest location is being displayed here
  </div>
);

const mapStateToProps = (state: GlobalState) => ({ isWatching: state.dashboard.isWatching });
export default connect(mapStateToProps)(WatchModeWarning);
