// @flow
import React from 'react';

import { connect } from 'react-redux';
import moment from 'moment';
import { List } from 'react-virtualized';

import Styles from '../assets/styles/app.css';

import { type Location, setSelectedLocation } from '~/reducer/dashboard';
import { type GlobalState } from '~/reducer/state';
import { createSelector } from 'reselect';
type StateProps = {|
  locations: Object[],
  selectedLocationId: string,
|};

type DispatchProps = {|
  onRowSelect: (id: string) => any,
|};

type Props = {| ...StateProps, ...DispatchProps |};
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

class ListView extends React.PureComponent {
  props: Props;
  list: any;
  selectRow = (indicies: number[]) => {
    this.props.onRowSelect(this.props.locations[indicies[0]].uuid);
  };
  rowRenderer = ({ index, isScrolling, isVisible, key, parent, style }: any) => {
    const item = this.props.locations[index];
    return (
      <div
        key={key}
        className={Styles.listRow}
        style={style}
        selected={item.uuid === this.props.selectedLocationId}
        onSelect={this.selectRow}
      >
        <span style={{ width: 140 }}>{item.uuid}</span>
        <span style={{ width: 100 }}>{item.recorded_at}</span>
        <span style={{ width: 80 }}>{item.coordinate}</span>
        <span style={{ width: 80 }}>{item.accuracy}</span>
        <span style={{ width: 80 }}>{item.speed}</span>
        <span style={{ width: 80 }}>{item.odometer}</span>
        <span style={{ width: 200 }}><strong>{item.event}</strong></span>
        <span style={{ width: 80 }}>{item.is_moving}</span>
        <span style={{ width: 140 }}>{item.activity}</span>
        <span style={{ width: 60 }} className={item.battery_is_charging ? Styles.tableCellGreen : Styles.tableCellRed}>
          {item.battery_level * 100}%
        </span>
      </div>
    );
  };
  render () {
    return (
      <div>
        <div className={Styles.listRow}>
          <span style={{ width: 140 }}>UUID</span>
          <span style={{ width: 100 }}>RECORDED AT</span>
          <span style={{ width: 80 }}>COORDINATE</span>
          <span style={{ width: 80 }}>ACCURACY</span>
          <span style={{ width: 80 }}>SPEED</span>
          <span style={{ width: 80 }}>ODOMETER</span>
          <span style={{ width: 200 }}>EVENT</span>
          <span style={{ width: 80 }}>IS MOVING</span>
          <span style={{ width: 140 }}>ACTIVITY</span>
          <span style={{ width: 60 }}>BATTERY</span>
        </div>
        <List
          width={1200}
          height={800}
          rowCount={this.props.locations.length}
          rowHeight={48}
          rowRenderer={this.rowRenderer}
        />
      </div>
    );
  }
}

type LocationArgs = {
  isWatching: boolean,
  currentLocation: ?Location,
  locations: Location[],
};
const getLocationsSource = function ({ locations, currentLocation, isWatching }: LocationArgs) {
  if (isWatching) {
    return currentLocation ? [currentLocation] : [];
  } else {
    return locations;
  }
};

const getLocations = function ({ locations, currentLocation, isWatching }: LocationArgs) {
  const source = getLocationsSource({ locations, currentLocation, isWatching });
  return source.map(getRowData);
};

const getLocationsSelector = createSelector(
  [
    (state: GlobalState) => ({
      locations: state.dashboard.locations,
      currentLocation: state.dashboard.currentLocation,
      isWatching: state.dashboard.isWatching,
    }),
  ],
  ({ locations, currentLocation, isWatching }: LocationArgs) => getLocations({ locations, currentLocation, isWatching })
);

const mapStateToProps = function (state: GlobalState): StateProps {
  return {
    locations: getLocationsSelector(state),
    selectedLocationId: state.dashboard.selectedLocationId,
  };
};

const mapDispatchToProps: DispatchProps = {
  onRowSelect: setSelectedLocation,
};

export default connect(mapStateToProps, mapDispatchToProps)(ListView);
