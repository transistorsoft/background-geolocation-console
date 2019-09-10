// @flow
import React from 'react';
import { createSelector } from 'reselect';
import find from 'lodash/fp/find';

import AppBar from '@material-ui/core/AppBar';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import CardHeader from '@material-ui/core/CardHeader';
import Typography from '@material-ui/core/Typography';
import Toolbar from '@material-ui/core/Toolbar';
import MenuIcon from '@material-ui/icons/Menu';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';

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

const LocationView = ({ location, onClose }: Props) => (
  <Card style={{ marginBottom: '10px' }}>
    <CardHeader
      title="Location"
      action={
        <IconButton onClick={onClose} aria-label="settings">
          <CloseIcon />
        </IconButton>
      }
    />
    <CardContent>
      <pre style={{ fontSize: '12px' }}>{JSON.stringify(location, null, 2)}</pre>
    </CardContent>
  </Card>
);

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
    isWatching ? currentLocation : find(locations, { uuid: selectedLocationId })
);

const mapStateToProps = (state: GlobalState): StateProps => ({
  location: getLocation(state),
});
const mapDispatchToProps: DispatchProps = {
  onClose: unselectLocation,
};

export default connect(mapStateToProps, mapDispatchToProps)(LocationView);
