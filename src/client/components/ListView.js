// @flow
import React from 'react';

import { connect } from 'react-redux';
import * as moment from 'moment';

import { Table, TableHead, TableRow, TableCell } from 'react-toolbox';

import Styles from '../assets/styles/app.css';

import { type Location, type DashboardState, setSelectedLocation } from '~/reducer/dashboard';
import { type GlobalState } from '~/reducer/state';

type MapProps = {|
  locations: Location[],
  selectedLocationId: string,
|};

type DispatchProps = {|
  onRowSelect: (id: string) => any,
|};

type Props = {| ...MapProps, ...DispatchProps |};
const getRowData = (location: Location) => {
  let event = location.event || '';
  switch (location.event) {
    case 'geofence':
      event = location.event + ': ' + location.geofence.action + ' ' + location.geofence.identifier;
      break;
  }
  return {
    data: location,
    uuid: location.uuid,
    device_id: location.device_id,
    coordinate: location.latitude.toFixed(6) + ', ' + location.longitude.toFixed(6),
    recorded_at: moment(new Date(location.recorded_at)).format('MM-DD HH:mm:ss:SSS'),
    is_moving: location.is_moving ? 'true' : 'false',
    accuracy: location.accuracy,
    speed: location.speed,
    odometer: location.odometer,
    event: event,
    activity: location.activity_type + ' (' + location.activity_confidence + '%)',
    battery_level: location.battery_level,
    battery_is_charging: location.battery_is_charging,
  };
};

const ListView = ({ locations, selectedLocationId, onRowSelect }: Props) =>
  <Table onRowSelect={onRowSelect}>
    <TableHead>
      <TableCell>UUID</TableCell>
      <TableCell numeric>RECORDED AT</TableCell>
      <TableCell numeric>COORDINATE</TableCell>
      <TableCell numeric>ACCURACY</TableCell>
      <TableCell numeric>SPEED</TableCell>
      <TableCell numeric>ODOMETER</TableCell>
      <TableCell numeric>EVENT</TableCell>
      <TableCell numeric>IS MOVING</TableCell>
      <TableCell numeric>ACTIVITY</TableCell>
      <TableCell numeric>BATTERY</TableCell>
    </TableHead>
    {locations.map((item: Object, idx: number) =>
      <TableRow key={idx} selected={item.uuid === selectedLocationId} onSelect={onRowSelect}>
        <TableCell>{item.uuid}</TableCell>
        <TableCell numeric>{item.recorded_at}</TableCell>
        <TableCell numeric>{item.coordinate}</TableCell>
        <TableCell numeric>{item.accuracy}</TableCell>
        <TableCell numeric>{item.speed}</TableCell>
        <TableCell numeric>{item.odometer}</TableCell>
        <TableCell numeric><strong>{item.event}</strong></TableCell>
        <TableCell numeric>{item.is_moving}</TableCell>
        <TableCell numeric>{item.activity}</TableCell>
        <TableCell numeric className={item.battery_is_charging ? Styles.tableCellGreen : Styles.tableCellRed}>
          {item.battery_level * 100}%
        </TableCell>
      </TableRow>
    )}
  </Table>;

const getLocationsSource = function (dashboard: DashboardState) {
  if (dashboard.isWatching) {
    return dashboard.currentLocation ? [dashboard.currentLocation] : [];
  } else {
    return dashboard.locations;
  }
};

const getLocations = function (dashboard: DashboardState) {
  const source = getLocationsSource(dashboard);
  return source.map(getRowData);
};

const mapStateToProps = function (state: GlobalState) {
  return {
    locations: getLocations(state.dashboard),
    selectedLocationId: state.dashboard.selectedLocationId,
  };
};

const mapDispatchToProps = (dispatch: Function) => {
  return {
    onRowSelect: (entry: any) => dispatch(setSelectedLocation(entry.uuid)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ListView);
