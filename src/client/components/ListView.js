// @flow
import React from 'react';

import { connect } from 'react-redux';
import moment from 'moment';
import { List, AutoSizer } from 'react-virtualized';
import classNames from 'classnames';

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
        className={classNames(Styles.listRow, { [Styles.selectedRow]: item.uuid === this.props.selectedLocationId })}
        style={style}
        onClick={() => this.props.onRowSelect(item.uuid)}
      >
        <span style={{ width: 180 }}><span>{item.uuid}</span></span>
        <span style={{ width: 120 }}><span>{item.recorded_at}</span></span>
        <span style={{ width: 90 }}><span>{item.coordinate}</span></span>
        <span style={{ width: 80 }}><span>{item.accuracy}</span></span>
        <span style={{ width: 80 }}><span>{item.speed}</span></span>
        <span style={{ width: 80 }}><span>{item.odometer}</span></span>
        <span style={{ width: 180 }}><span><strong>{item.event}</strong></span></span>
        <span style={{ width: 80 }}><span>{item.is_moving}</span></span>
        <span style={{ width: 140 }}><span>{item.activity}</span></span>
        <span style={{ width: 80 }} className={item.battery_is_charging ? Styles.tableCellGreen : Styles.tableCellRed}>
          <span>
            {item.battery_level * 100}%
          </span>
        </span>
      </div>
    );
  };
  render () {
    this.list && this.list.forceUpdateGrid();
    return (
      <div className={Styles.list} style={{ width: '100%', height: '100%' }}>
        <div className={Styles.listHeaderRow}>
          <span style={{ width: 180 }}>UUID</span>
          <span style={{ width: 120 }}>RECORDED AT</span>
          <span style={{ width: 90 }}>COORDINATE</span>
          <span style={{ width: 80 }}>ACCURACY</span>
          <span style={{ width: 80 }}>SPEED</span>
          <span style={{ width: 80 }}>ODOMETER</span>
          <span style={{ width: 180 }}>EVENT</span>
          <span style={{ width: 80 }}>IS MOVING</span>
          <span style={{ width: 140 }}>ACTIVITY</span>
          <span style={{ width: 80 }}>BATTERY</span>
        </div>
        <div style={{ width: '100%', height: 'calc(100% - 55px)' }}>
          <AutoSizer>
            {({ width, height }: { width: number, height: number }) =>
              <List
                style={{ outline: 0 }}
                ref={(list: React$Element<any>) => (this.list = list)}
                width={1200}
                height={height}
                rowCount={this.props.locations.length}
                rowHeight={48}
                rowRenderer={this.rowRenderer}
              />}
          </AutoSizer>
        </div>
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
