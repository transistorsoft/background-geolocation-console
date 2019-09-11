// @flow
import React, { Component, useState } from 'react';
import clsx from 'classnames';
import {
  Container,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  Tab,
  Tabs,
  useTheme,
} from '@material-ui/core';

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
import { connect } from 'react-redux';
import type { GlobalState } from '~/reducer/state';
import { changeActiveTab, type Tab as TabType, type Location } from '~/reducer/dashboard';

type StateProps = {|
  isLocationSelected: boolean,
  activeTabIndex: 0 | 1,
  location: ?Location,
|};
type DispatchProps = {|
  onChangeActiveTab: (tab: TabType) => any,
|};

type Props = {| ...StateProps, ...DispatchProps |};
const Viewport = ({ isLocationSelected, activeTabIndex, location }: StateProps) => {
  const [tabIndex, setTabIndex] = useState(activeTabIndex);
  const [open, setOpen] = React.useState(true);
  const theme = useTheme();
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <CssBaseline />
      <HeaderView classes={classes} setOpen={setOpen} open={open}>
        <Tabs className={classes.tabs} value={tabIndex} onChange={(e, index) => setTabIndex(index)}>
          <Tab label='Map' />
          <Tab label='Data' />
        </Tabs>
      </HeaderView>
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={open}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <FilterView setOpen={setOpen} />
      </Drawer>
      <main
        className={clsx(
          classes.content,
          {
            [classes.contentShift]: open,
          }
        )}
      >
        <LoadingIndicator />
        <TooManyPointsWarning />
        <TabPanel
          value={tabIndex}
          index={0}
          className={classes.tabPanel}
        >
          <MapView open={open} />
        </TabPanel>
        <TabPanel
          value={tabIndex}
          index={1}
          className={clsx(classes.tabPanel, classes.overflowAuto, classes.whiteBackground)}
        >
          <WatchModeWarning />
          <ListView style={{ width: 1300 }} />
        </TabPanel>
      </main>
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="right"
        open={!!location}
        classes={{
          paper: classes.drawerPaper,
        }}
      >
        <LocationView />
      </Drawer>
    </div>
  );
}

const mapStateToProps = function (state: GlobalState): StateProps {
  return {
    isLocationSelected: !!state.dashboard.selectedLocationId,
    activeTabIndex: state.dashboard.activeTab === 'map' ? 0 : 1,
    location: getLocation(state)
  };
};
const mapDispatchToProps: DispatchProps = {
  onChangeActiveTab: changeActiveTab,
};
export default connect(mapStateToProps, mapDispatchToProps)(Viewport);
