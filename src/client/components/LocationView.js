// @flow
import React from 'react';
import { createSelector } from 'reselect';

import { AppBar } from 'react-toolbox/lib/app_bar';
import { Card } from 'react-toolbox/lib/card';

import Styles from '../assets/styles/app.css';
import _ from 'lodash';

import { connect } from 'react-redux';
import { type Location, unselectLocation } from '~/reducer/dashboard';
import { type GlobalState } from '~/reducer/state';

type StateProps = {|
  location: ?Location,
|};
type DispatchProps = {|
  onClose: () => any,
|};

type Props = {| ...StateProps, ...DispatchProps |};

const LocationView = ({ location, onClose }: Props) =>
  <div className='filterView'>
    <AppBar title='Location' rightIcon='close' onRightIconClick={onClose} />
    <div className={Styles.content}>
      <Card style={{ marginBottom: '10px' }}>
        <div className={Styles.content}>
          <pre style={{ fontSize: '12px' }}>{JSON.stringify(location, null, 2)}</pre>
        </div>
      </Card>
    </div>
  </div>;

type LocationArgs = {
  isWatching: boolean,
  currentLocation: ?Location,
  locations: Location[],
  selectedLocationId: ?string,
};

const getLocation = createSelector(
  [
    (state: GlobalState) => ({
      isWatching: state.dashboard.isWatching,
      currentLocation: state.dashboard.currentLocation,
      locations: state.dashboard.locations,
      selectedLocationId: state.dashboard.selectedLocationId,
    }),
  ],
  ({ isWatching, currentLocation, locations, selectedLocationId }: LocationArgs) =>
    isWatching ? currentLocation : _.find(locations, { uuid: selectedLocationId })
);

const mapStateToProps = (state: GlobalState): StateProps => ({
  location: getLocation(state),
});
const mapDispatchToProps: DispatchProps = {
  onClose: unselectLocation,
};

export default connect(mapStateToProps, mapDispatchToProps)(LocationView);
