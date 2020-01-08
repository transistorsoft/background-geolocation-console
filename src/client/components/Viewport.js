// @flow
import React, { useState } from 'react';
import clsx from 'classnames';
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import { connect } from 'react-redux';

import type { GlobalState } from 'reducer/state';
import {
  changeActiveTab,
  type Tab as TabType,
  type Location,
} from 'reducer/dashboard';

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

type Props = {|
  ...StateProps,
  ...DispatchProps,
|};
const Viewport = ({ activeTabIndex, location }: Props) => {
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
        <Tabs
          className={classes.tabs}
          value={tabIndex}
          onChange={(e: Event, index: number) => setTabIndex(index)}
        >
          <Tab label='Map' />
          <Tab label='Data' />
        </Tabs>
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
  isLocationSelected: !!state.dashboard.selectedLocationId,
  activeTabIndex: state.dashboard.activeTab === 'map' ? 0 : 1,
  location: getLocation(state),
});
const mapDispatchToProps: DispatchProps = { onChangeActiveTab: changeActiveTab };

export default connect(mapStateToProps, mapDispatchToProps)(Viewport);
