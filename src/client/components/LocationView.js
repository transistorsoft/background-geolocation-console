// @flow
import React from 'react';
import { createSelector } from 'reselect';
import find from 'lodash/find';
import {
  AppBar,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
} from '@material-ui/core';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@material-ui/icons';

import CloseIcon from '@material-ui/icons/Close';

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

const LocationView = ({ location, onClose, classes }: Props) => (location && (
  <div>
    <AppBar className={classes.appBar} position='static'>
      <Toolbar style={{ justifyContent: 'space-between' }}>
        <Typography variant='h6'>
          Location
        </Typography>
        <IconButton color='inherit' onClick={onClose}>
          {useTheme().direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Toolbar>
    </AppBar>
    <div className={classes.locationContainer}>
      <pre style={{ fontSize: '12px' }}>{JSON.stringify(location, null, 2)}</pre>
    </div>
  </div>
)) || '';

type LocationArgs = {
  isWatching: boolean,
  currentLocation: ?Location,
  locations: Location[],
  selectedLocationId: ?string,
};

export const getLocation = createSelector(
  [
    (state: GlobalState) => ({
      isWatching: state.dashboard.isWatching,
      currentLocation: state.dashboard.currentLocation,
      locations: state.dashboard.locations,
      selectedLocationId: state.dashboard.selectedLocationId,
    }),
  ],
  ({ isWatching, currentLocation, locations, selectedLocationId }: LocationArgs) =>
    isWatching
    ? currentLocation
    : find(locations, { uuid: selectedLocationId })
);

const mapStateToProps = (state: GlobalState): StateProps => ({
  location: getLocation(state),
});
const mapDispatchToProps: DispatchProps = {
  onClose: unselectLocation,
};

export default connect(mapStateToProps, mapDispatchToProps)(LocationView);
