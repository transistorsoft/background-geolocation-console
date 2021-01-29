// @flow
import React, { useState } from 'react';
import { connect } from 'react-redux';
import clsx from 'classnames';
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import IconButton from '@material-ui/core/IconButton';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';

import type { GlobalState } from '../reducer/state';
import {
  changeActiveTab,
  type Tab as TabType,
  type Location,
} from '../reducer/dashboard';

import { logout as logoutAction } from '../reducer/auth';

import HeaderView from './HeaderView';
import FilterView from './FilterView';
import TabPanel from './TabPanel';
import LocationView, { getLocation } from './LocationView';
import MapView from './MapView';
import ListView from './ListView';
import LoadingIndicator from './LoadingIndicator';
import WatchModeWarning from './WatchModeWarning';
import useStyles from './ViewportStyle';
import TooManyPointsWarning from './TooManyPointsWarning';

type StateProps = {|
  isLocationSelected: boolean,
  activeTabIndex: 0 | 1,
  location: ?Location,
|};
type DispatchProps = {|
  onChangeActiveTab: (tab: TabType) => any,
|};
const shared = !!process.env.SHARED_DASHBOARD;
type Props = {|
  ...StateProps,
  ...DispatchProps,
|};

const Viewport = ({
  activeTabIndex,
  accessToken,
  location,
  logout,
}: Props) => {
  const [tabIndex, setTabIndex] = useState(activeTabIndex);
  const [open, setOpen] = React.useState(true);
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <CssBaseline />
      <HeaderView
        classes={classes}
        setOpen={setOpen}
        location={location}
        open={open}
      >
        <div className={classes.actionRow}>
          <Tabs
            className={classes.tabs}
            value={tabIndex}
            onChange={(e: Event, index: number) => setTabIndex(index)}
          >
            <Tab label='Map' />
            <Tab label='Data' />
          </Tabs>
          {accessToken && shared && (
            <IconButton onClick={logout} className={classes.logout} aria-label='logout'>
              <ExitToAppIcon />
            </IconButton>
          )}
        </div>
      </HeaderView>
      <Drawer
        className={classes.drawer}
        variant='persistent'
        anchor='left'
        open={open}
        classes={{ paper: classes.drawerPaper }}
      >
        <FilterView setOpen={setOpen} />
      </Drawer>
      <main
        className={clsx(classes.content, {
          [classes.contentShift]: open,
          [classes.contentShiftLocation]: !!location,
        })}
      >
        <LoadingIndicator />
        <TooManyPointsWarning />
        <TabPanel value={tabIndex} index={0} className={classes.tabPanel}>
          <MapView open={open} />
        </TabPanel>
        <TabPanel
          value={tabIndex}
          index={1}
          className={clsx(
            classes.tabPanel,
            classes.overflowAuto,
            classes.whiteBackground,
          )}
        >
          <WatchModeWarning />
          <ListView style={{ width: 1300 }} />
        </TabPanel>
      </main>
      <Drawer
        className={classes.locationDrawer}
        variant='persistent'
        anchor='right'
        open={!!location}
        classes={{ paper: classes.drawerLocationPaper }}
      >
        <LocationView classes={classes} />
      </Drawer>
    </div>
  );
};

const mapStateToProps = (state: GlobalState): StateProps => ({
  accessToken: state.auth.accessToken,
  activeTabIndex: state.dashboard.activeTab === 'map' ? 0 : 1,
  isLocationSelected: !!state.dashboard.selectedLocationId,
  location: getLocation(state),
});
const mapDispatchToProps: DispatchProps = {
  onChangeActiveTab: changeActiveTab,
  logout: logoutAction,
};

export default connect(mapStateToProps, mapDispatchToProps)(Viewport);
