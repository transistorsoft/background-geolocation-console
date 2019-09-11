// @flow
import React from 'react';
import { connect } from 'react-redux';
import DateFnsUtils from '@date-io/date-fns';
import { useTheme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import CardHeader from '@material-ui/core/CardHeader';
import Toolbar from '@material-ui/core/Toolbar';
import Checkbox from '@material-ui/core/Checkbox';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import RefreshIcon from '@material-ui/icons/Refresh';
import SaveIcon from '@material-ui/icons/Save';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import {
  TimePicker,
  DatePicker,
  MuiPickersUtilsProvider,
} from '@material-ui/pickers';

import useStyles from './Style';
import formatDate from '~/utils/formatDate';
import DeviceField from './DeviceField';
import DeleteDeviceLink from './DeleteDeviceLink';
import CompanyTokenField from './CompanyTokenField';
import CustomMarkers from './CustomMarkers';
import { type GlobalState } from '~/reducer/state';
import {
  type Device,
  type CompanyToken,
  reload,
  changeDeviceId,
  changeCompanyToken,
  changeStartDate,
  changeEndDate,
  changeIsWatching,
  changeShowMarkers,
  changeShowPolyline,
  changeShowGeofenceHits,
  changeMaxMarkers,
} from '~/reducer/dashboard';
const cardMargins = { marginBottom: '10px' };
type StateProps = {|
  hasData: boolean,
  devices: { value: string, label: string }[],
  deviceId: string,
  companyTokens: { value: string, label: string }[],
  companyToken: string,
  startDate: Date,
  endDate: Date,
  isWatching: boolean,
  showGeofenceHits: boolean,
  showPolyline: boolean,
  showMarkers: boolean,
  maxMarkers: number
|};
type DispatchProps = {|
  onReload: () => any,
  setOpen: (open: boolean) => any,
  onChangeDeviceId: (deviceId: string) => any,
  onChangeCompanyToken: (companyToken: string) => any,
  onChangeStartDate: (date: Date) => any,
  onChangeEndDate: (date: Date) => any,
  onChangeIsWatching: (value: boolean) => any,
  onChangeShowMarkers: (value: boolean) => any,
  onChangeShowPolyline: (value: boolean) => any,
  onChangeShowGeofenceHits: (value: boolean) => any,
  onChangeMaxMarkers: (value: number) => any,
|};
type Props = {| ...StateProps, ...DispatchProps |};
const FilterView = function ({
  hasData,
  devices,
  deviceId,
  companyTokens,
  companyToken,
  startDate,
  endDate,
  isWatching,
  showGeofenceHits,
  showPolyline,
  showMarkers,
  maxMarkers,
  onReload,
  setOpen,
  onChangeDeviceId,
  onChangeCompanyToken,
  onChangeStartDate,
  onChangeEndDate,
  onChangeIsWatching,
  onChangeShowMarkers,
  onChangeShowPolyline,
  onChangeShowGeofenceHits,
  onChangeMaxMarkers,
}: Props): React$Element<any> {
  const theme = useTheme();
  const classes = useStyles();
  return (
    <div className='filterView'>
      <AppBar className={classes.appBar} position="static">
        <Toolbar style={{ justifyContent: 'space-between' }}>
          <IconButton edge="start" onClick={onReload} color="inherit" aria-label="menu">
            <RefreshIcon />
          </IconButton>
          <Typography variant="h6">
            Filter
          </Typography>
          <IconButton edge="end" color="inherit" onClick={() => setOpen(false)}>
            {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <div className={classes.cardsContainer}>
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <Card style={cardMargins}>
            <CardHeader className={classes.header} title="Locations" />
            <CardContent className={classes.relative}>
              <CompanyTokenField onChange={onChangeCompanyToken} source={companyTokens} value={companyToken} />
              <DeviceField onChange={onChangeDeviceId} source={devices} hasData={hasData} value={deviceId} />
              <DeleteDeviceLink />
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <DatePicker
                  autoOk
                  label='Start date'
                  format="MM-dd"
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
                  format="MM-dd"
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
              <Button fullWidth variant='contained' color='primary' onClick={onReload}>
                <RefreshIcon />
                Reload
              </Button>
              <FormControlLabel
                labelPlacement='start'
                className={classes.switch}
                control={
                  <Switch color="primary" value='watching' checked={isWatching} onChange={(e) => onChangeIsWatching(e.target.checked)} style={{ flex: 1 }} />
                }
                label="Watch mode"
              />
            </CardContent>
          </Card>
          <Card style={cardMargins}>
            <CardHeader className={classes.header} title="Map" />
            <CardContent>
              <FormControlLabel
                control={<Checkbox color="primary" checked={showMarkers} onChange={onChangeShowMarkers} />}
                label='Show Markers'
              />
              <FormControlLabel
                control={<Checkbox color="primary" checked={showPolyline} onChange={onChangeShowPolyline} />}
                label='Show Polyline'
              />
              <FormControlLabel
                control={<Checkbox color="primary" checked={showGeofenceHits} onChange={onChangeShowGeofenceHits} />}
                label='Show Geofences'
              />
              <TextField fullWidth type="text" value={maxMarkers} onChange={onChangeMaxMarkers} label="Max markers" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className={classes.header} key='header' title='Custom Markers' />,
            <CustomMarkers />
          </Card>
        </MuiPickersUtilsProvider>
      </div>
    </div>
  );
};


const mapStateToProps = function (state: GlobalState): StateProps {
  return {
    deviceId: state.dashboard.deviceId,
    companyToken: state.dashboard.companyToken,
    startDate: state.dashboard.startDate,
    endDate: state.dashboard.endDate,
    devices: state.dashboard.devices.map((device: Device) => ({ value: device.id, label: device.name })),
    companyTokens: state.dashboard.companyTokens.map((companyToken: CompanyToken) => ({
      value: companyToken.id,
      label: companyToken.name,
    })),
    hasData: state.dashboard.hasData,
    isWatching: state.dashboard.isWatching,
    showGeofenceHits: state.dashboard.showGeofenceHits,
    showPolyline: state.dashboard.showPolyline,
    showMarkers: state.dashboard.showMarkers,
    maxMarkers: state.dashboard.maxMarkers,
  };
};

const mapDispatchToProps: DispatchProps = {
  onReload: reload,
  onChangeDeviceId: changeDeviceId,
  onChangeCompanyToken: changeCompanyToken,
  onChangeStartDate: changeStartDate,
  onChangeEndDate: changeEndDate,
  onChangeIsWatching: changeIsWatching,
  onChangeShowMarkers: changeShowMarkers,
  onChangeShowPolyline: changeShowPolyline,
  onChangeShowGeofenceHits: changeShowGeofenceHits,
  onChangeMaxMarkers: changeMaxMarkers,
};

export default connect(mapStateToProps, mapDispatchToProps)(FilterView);
