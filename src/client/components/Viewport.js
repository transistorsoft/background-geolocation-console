// @flow
import React, { Component } from 'react';

import { Layout, NavDrawer, Panel, Tabs, Tab, Sidebar } from 'react-toolbox';

import Styles from '../assets/styles/app.css';
import HeaderView from './HeaderView';
import FilterView from './FilterView';
import LocationView from './LocationView';
import MapView from './MapView';
import ListView from './ListView';
import LoadingIndicator from './LoadingIndicator';
import WatchModeWarning from './WatchModeWarning';
import { connect } from 'react-redux';
import { type GlobalState } from '~/reducer/state';
import { changeActiveTab, type Tab as TabType } from '~/reducer/dashboard';

type StateProps = {|
  isLocationSelected: boolean,
  activeTabIndex: 0 | 1,
|};
type DispatchProps = {|
  onChangeActiveTab: (tab: TabType) => any,
|};

type Props = {| ...StateProps, ...DispatchProps |};
class Viewport extends Component {
  props: Props;
  changeActiveTabIndex = (index: 0 | 1) => {
    if (index === 0) {
      this.props.onChangeActiveTab('map');
    }
    if (index === 1) {
      this.props.onChangeActiveTab('list');
    }
  };

  render () {
    const { isLocationSelected, activeTabIndex } = this.props;
    return (
      <Layout className={Styles.viewport}>
        <LoadingIndicator />
        <NavDrawer active={true} pinned={true} className={Styles.navDrawer}>
          <FilterView />
        </NavDrawer>
        <Sidebar pinned={isLocationSelected} width={6}>
          <LocationView />
        </Sidebar>
        <Panel className={Styles.workspace} bodyScroll={false}>
          <HeaderView />
          <Tabs index={activeTabIndex} hideMode='display' onChange={this.changeActiveTabIndex} inverse>
            <Tab label='Map'>
              <MapView />
            </Tab>
            <Tab label='Data'>
              <div
                style={{
                  position: 'absolute',
                  flex: 1,
                  overflow: 'auto',
                  height: 'calc(100% - 160px)',
                  width: 'calc(100% - 40px)',
                }}
              >
                <WatchModeWarning />
                <ListView style={{ width: 1180 }} />
              </div>
            </Tab>
          </Tabs>
        </Panel>
      </Layout>
    );
  }
}

const mapStateToProps = function (state: GlobalState): StateProps {
  return {
    isLocationSelected: !!state.dashboard.selectedLocationId,
    activeTabIndex: state.dashboard.activeTab === 'map' ? 0 : 1,
  };
};
const mapDispatchToProps: DispatchProps = {
  onChangeActiveTab: changeActiveTab,
};
export default connect(mapStateToProps, mapDispatchToProps)(Viewport);
