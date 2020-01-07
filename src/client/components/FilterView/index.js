// @flow
import DateFnsUtils from '@date-io/date-fns';
import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import TextField from '@material-ui/core/TextField';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useTheme } from '@material-ui/core/styles';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import RefreshIcon from '@material-ui/icons/Refresh';
import {
  DatePicker,
  MuiPickersUtilsProvider,
  TimePicker,
} from '@material-ui/pickers';
import React from 'react';
import { connect } from 'react-redux';

import {
  changeDeviceId,
  changeEnableClustering,
  changeEndDate,
  changeIsWatching,
  changeMaxMarkers,
  changeOrgToken,
  changeShowGeofenceHits,
  changeShowMarkers,
  changeShowPolyline,
  changeStartDate,
  type Device,
  type MaterialInputElement,
  type OrgToken,
  reload,
  type Source,
} from 'reducer/dashboard';
import { type GlobalState } from 'reducer/state';
import formatDate from 'utils/formatDate';

import RemoveAnimationProvider from '../RemoveAnimationProvider';

import CustomMarkers from './CustomMarkers';
import DeleteDeviceLink from './DeleteDeviceLink';
import DeviceField from './DeviceField';
import OrgField from './OrgField';
import useStyles from './Style';

const cardMargins = { marginBottom: '10px' };
type StateProps = {|
  companyId: string,
  orgTokens: Source[],
  deviceId: string,
  devices: Source[],
  enableClustering: boolean,
  endDate: Date,
  hasData: boolean,
  isWatching: boolean,
  maxMarkers: number,
  showGeofenceHits: boolean,
  showMarkers: boolean,
  showPolyline: boolean,
  startDate: Date,
|};
type DispatchProps = {|
  onChangeOrgToken: (orgToken: string) => any,
  onChangeDeviceId: (deviceId: string) => any,
  onChangeEnableClustering: (value: boolean) => any,
  onChangeEndDate: (date: Date) => any,
  onChangeIsWatching: (value: boolean) => any,
  onChangeMaxMarkers: (value: number) => any,
  onChangeShowGeofenceHits: (value: boolean) => any,
  onChangeShowMarkers: (value: boolean) => any,
  onChangeShowPolyline: (value: boolean) => any,
  onChangeStartDate: (date: Date) => any,
  onReload: () => any,
|};
type Props = {|
  ...StateProps,
  ...DispatchProps,
  setOpen: (open: boolean) => any,
|};
const FilterView = ({
  companyId,
  orgTokens,
  deviceId,
  devices,
  enableClustering,
  endDate,
  hasData,
  isWatching,
  maxMarkers,
  onChangeOrgToken,
  onChangeDeviceId,
  onChangeEnableClustering,
  onChangeEndDate,
  onChangeIsWatching,
  onChangeMaxMarkers,
  onChangeShowGeofenceHits,
  onChangeShowMarkers,
  onChangeShowPolyline,
  onChangeStartDate,
  onReload,
  setOpen,
  showGeofenceHits,
  showMarkers,
  showPolyline,
  startDate,
}: Props): React$Element<any> => {
  const theme = useTheme();
  const classes = useStyles();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <div className='filterView'>
      <AppBar className={classes.appBar} position='static'>
        <Toolbar style={{ justifyContent: 'space-between' }}>
          <IconButton
            edge='start'
            onClick={onReload}
            color='inherit'
            aria-label='menu'
          >
            <RefreshIcon />
          </IconButton>
          <Typography variant='h6'>Filter!</Typography>
          <IconButton edge='end' color='inherit' onClick={() => setOpen(false)}>
            {theme.direction === 'ltr'
              ? <ChevronLeftIcon />
              : <ChevronRightIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <div className={classes.cardsContainer}>
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <Card style={cardMargins}>
            <CardHeader className={classes.header} title='Locations' />
            <CardContent className={classes.relative}>
              <RemoveAnimationProvider>
                <OrgField
                  fullScreen={fullScreen}
                  onChange={onChangeOrgToken}
                  source={orgTokens}
                  value={companyId}
                />
                <DeviceField
                  onChange={onChangeDeviceId}
                  source={devices}
                  hasData={hasData}
                  value={deviceId}
                />
              </RemoveAnimationProvider>
              <DeleteDeviceLink />
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <DatePicker
                  autoOk
                  label='Start date'
                  format='MM-dd'
                  style={{ flex: 1 }}
                  onChange={onChangeStartDate}
                  value={startDate}
                  labelFunc={formatDate}
                />
                <TimePicker
                  autoOk
                  label='Time'
                  style={{ flex: 1 }}
                  onChange={onChangeStartDate}
                  value={startDate}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <DatePicker
                  autoOk
                  label='End date'
                  format='MM-dd'
                  style={{ flex: 1 }}
                  onChange={onChangeEndDate}
                  value={endDate}
                  labelFunc={formatDate}
                />
                <TimePicker
                  autoOk
                  label='Time'
                  style={{ flex: 1 }}
                  onChange={onChangeEndDate}
                  value={endDate}
                />
              </div>
              <Button
                fullWidth
                className={classes.paddingRow}
                variant='contained'
                color='primary'
                onClick={onReload}
              >
                <RefreshIcon />
                Reload
              </Button>
              <FormControlLabel
                labelPlacement='start'
                className={classes.switch}
                control={(
                  <Switch
                    color='primary'
                    value='watching'
                    checked={isWatching}
                    onChange={(e: MaterialInputElement) => onChangeIsWatching(e.target.checked)}
                    style={{ flex: 1 }}
                  />
                )}
                label='Watch mode'
              />
            </CardContent>
          </Card>
          <Card style={cardMargins}>
            <CardHeader className={classes.header} title='Map' />
            <CardContent>
              <FormControlLabel
                control={(
                  <Checkbox
                    color='primary'
                    checked={!showMarkers}
                    onChange={(e: MaterialInputElement) => onChangeShowMarkers(!e.target.checked)}
                  />
                )}
                label='Hide Markers'
              />
              <FormControlLabel
                control={(
                  <Checkbox
                    color='primary'
                    checked={!showPolyline}
                    onChange={(e: MaterialInputElement) => onChangeShowPolyline(!e.target.checked)}
                  />
                )}
                label='Hide Polyline'
              />
              <FormControlLabel
                control={(
                  <Checkbox
                    color='primary'
                    checked={!showGeofenceHits}
                    onChange={(e: MaterialInputElement) => onChangeShowGeofenceHits(!e.target.checked)}
                  />
                )}
                label='Hide Geofences'
              />
              <FormControlLabel
                control={(
                  <Checkbox
                    color='primary'
                    checked={!enableClustering}
                    onChange={(e: MaterialInputElement) => onChangeEnableClustering(!e.target.checked)}
                  />
                )}
                label='Disable Clustering'
              />
              <TextField
                fullWidth
                type='text'
                value={maxMarkers}
                onChange={(e: MaterialInputElement) => onChangeMaxMarkers(+e.target.value)}
                label='Max markers'
              />
            </CardContent>
          </Card>
          <CustomMarkers classes={classes} />
        </MuiPickersUtilsProvider>
      </div>
    </div>
  );
};

const mapStateToProps = (state: GlobalState): StateProps => ({
  deviceId: `${state.dashboard.deviceId}`,
  companyId: `${state.dashboard.companyId}`,
  enableClustering: state.dashboard.enableClustering,
  startDate: state.dashboard.startDate,
  endDate: state.dashboard.endDate,
  devices: state.dashboard.devices.map((device: Device) => ({
    value: `${device.id}`,
    label: device.name,
  })),
  orgTokens: state.dashboard.orgTokens.map((orgToken: OrgToken) => ({
    value: `${orgToken.id}`,
    label: orgToken.name,
  })),
  hasData: state.dashboard.hasData,
  isWatching: state.dashboard.isWatching,
  showGeofenceHits: state.dashboard.showGeofenceHits,
  showPolyline: state.dashboard.showPolyline,
  showMarkers: state.dashboard.showMarkers,
  maxMarkers: state.dashboard.maxMarkers,
});

const mapDispatchToProps: DispatchProps = {
  onReload: reload,
  onChangeDeviceId: changeDeviceId,
  onChangeOrgToken: changeOrgToken,
  onChangeStartDate: changeStartDate,
  onChangeEndDate: changeEndDate,
  onChangeEnableClustering: changeEnableClustering,
  onChangeIsWatching: changeIsWatching,
  onChangeShowMarkers: changeShowMarkers,
  onChangeShowPolyline: changeShowPolyline,
  onChangeShowGeofenceHits: changeShowGeofenceHits,
  onChangeMaxMarkers: changeMaxMarkers,
};

export default connect(mapStateToProps, mapDispatchToProps)(FilterView);
