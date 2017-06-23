// @flow
import React from 'react';
import formatDate from '~/utils/formatDate';

import DeviceField from './DeviceField';

import { connect } from 'react-redux';
import { type GlobalState } from '~/reducer/state';
import {
  type Device,
  reload,
  setDeviceAndReload,
  setStartDateAndReload,
  setEndDateAndReload,
  setIsWatching,
  setShowMarkers,
  setShowPolyline,
  setShowGeofenceHits,
} from '~/reducer/dashboard';

import { AppBar, Button, DatePicker, TimePicker, Switch, Checkbox, Card } from 'react-toolbox';

import Styles from '~/assets/styles/app.css';

type StateProps = {|
  hasData: boolean,
  devices: { value: string, label: string }[],
  deviceId: string,
  startDate: Date,
  endDate: Date,
  isWatching: boolean,
  showGeofenceHits: boolean,
  showPolyline: boolean,
  showMarkers: boolean,
|};
type DispatchProps = {|
  onReload: () => any,
  onChangeDeviceId: (deviceId: string) => any,
  onChangeStartDate: (date: Date) => any,
  onChangeEndDate: (date: Date) => any,
  onChangeIsWatching: (value: boolean) => any,
  onChangeShowMarkers: (value: boolean) => any,
  onChangeShowPolyline: (value: boolean) => any,
  onChangeShowGeofenceHits: (value: boolean) => any,
|};
type Props = {| ...StateProps, ...DispatchProps |};
const FilterView = function ({
  hasData,
  devices,
  deviceId,
  startDate,
  endDate,
  isWatching,
  showGeofenceHits,
  showPolyline,
  showMarkers,
  onReload,
  onChangeDeviceId,
  onChangeStartDate,
  onChangeEndDate,
  onChangeIsWatching,
  onChangeShowMarkers,
  onChangeShowPolyline,
  onChangeShowGeofenceHits,
  }: Props): React$Element<any> {
  return (
    <div className='filterView'>
      <AppBar title='Filter' rightIcon='refresh' onRightIconClick={onReload} />
      <div className={Styles.content}>
        <Card style={{ marginBottom: '10px' }}>
          <div className={Styles.content}>
            <h3>Locations</h3>
            <DeviceField onChange={onChangeDeviceId} source={devices} hasData={hasData} value={deviceId} />
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              <DatePicker
                label='Start date'
                sundayFirstDayOfWeek
                autoOk
                style={{ flex: 1 }}
                onChange={onChangeStartDate}
                value={startDate}
                inputFormat={formatDate}
              />
              <TimePicker label='Time' style={{ flex: 1 }} onChange={onChangeStartDate} value={startDate} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              <DatePicker
                label='End date'
                sundayFirstDayOfWeek
                autoOk
                style={{ flex: 1 }}
                onChange={onChangeEndDate}
                value={endDate}
                inputFormat={formatDate}
              />
              <TimePicker label='Time' style={{ flex: 1 }} onChange={onChangeEndDate} value={endDate} />
            </div>
            <Button icon='refresh' label='reload' style={{ width: '100%' }} raised primary onMouseUp={onReload} />

            <div style={{ display: 'flex', flexDirection: 'row', marginTop: 10 }}>
              <label style={{ flex: 1 }}>Watch mode</label>
              <Switch checked={isWatching} onChange={onChangeIsWatching} style={{ flex: 1 }} />
            </div>

          </div>
        </Card>
        <Card>
          <div className={Styles.content}>
            <h3>Map</h3>
            <Checkbox checked={showMarkers} label='Show Markers' onChange={onChangeShowMarkers} />
            <Checkbox checked={showPolyline} label='Show Polyline' onChange={onChangeShowPolyline} />
            <Checkbox checked={showGeofenceHits} label='Show Geofences' onChange={onChangeShowGeofenceHits} />

          </div>
        </Card>
      </div>
    </div>
  );
};

const mapStateToProps = function (state: GlobalState): StateProps {
  return {
    deviceId: state.dashboard.filters.deviceId,
    startDate: state.dashboard.filters.startDate,
    endDate: state.dashboard.filters.endDate,
    devices: state.dashboard.devices.map((device: Device) => ({ value: device.id, label: device.name })),
    hasData: state.dashboard.hasData,
    isWatching: state.dashboard.isWatching,
    showGeofenceHits: state.dashboard.showGeofenceHits,
    showPolyline: state.dashboard.showPolyline,
    showMarkers: state.dashboard.showMarkers,
  };
};

const mapDispatchToProps: DispatchProps = {
  onReload: reload,
  onChangeDeviceId: setDeviceAndReload,
  onChangeStartDate: setStartDateAndReload,
  onChangeEndDate: setEndDateAndReload,
  onChangeIsWatching: setIsWatching,
  onChangeShowMarkers: setShowMarkers,
  onChangeShowPolyline: setShowPolyline,
  onChangeShowGeofenceHits: setShowGeofenceHits,
};

export default connect(mapStateToProps, mapDispatchToProps)(FilterView);
