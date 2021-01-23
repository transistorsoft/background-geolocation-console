// @flow
import React from 'react';
import { connect } from 'react-redux';

import { type GlobalState } from 'reducer/state';

import { MAX_POINTS } from '../constants';


type Props = {|
  isVisible: boolean,
  maxPoints: number,
  pointsCount: number,
|};
const TooManyPointsWarning = ({
  isVisible, maxPoints, pointsCount,
}: Props) => (
  <div
    style={{
      zIndex: 10000,
      display: isVisible ? '' : 'none',
      position: 'absolute',
      top: 73,
      left: 170,
      borderRadius: 3,
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: 14,
      padding: 3,
      fontWeight: 'bold',
    }}
  >
      Map contains
    {' '}
    {pointsCount}
    {' '}
      points! Only
    {' '}
    {maxPoints}
    {' '}
      are shown for
      performance reason!
  </div>
);

const mapStateToProps = (state: GlobalState) => ({
  isVisible:
    state.dashboard.locations.length > MAX_POINTS &&
    state.dashboard.activeTab === 'map',
  maxPoints: MAX_POINTS,
  pointsCount: state.dashboard.locations.length,
});
export default connect(mapStateToProps)(TooManyPointsWarning);
