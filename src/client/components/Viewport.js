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

type State = {|
  activeTab: 0 | 1,
|};

type StateProps = {|
  isLocationSelected: boolean,
|};

type Props = StateProps;
class Viewport extends Component {
  props: Props;
  state: State = {
    activeTab: 0,
  };

  handleTabChange = (index: 0 | 1) => {
    this.setState({ activeTab: index });
  };

  render () {
    const { activeTab } = this.state;
    const { isLocationSelected } = this.props;
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
          <Tabs index={activeTab} hideMode='display' onChange={this.handleTabChange} inverse>
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
                  width: 'calc(100% - 20px)',
                }}
              >
                <WatchModeWarning />
                <ListView style={{ width: 1200 }} />
              </div>
            </Tab>
          </Tabs>
        </Panel>
      </Layout>
    );
  }
}

const mapStateToProps = function (state: GlobalState) {
  return {
    isLocationSelected: !!state.dashboard.selectedLocationId,
  };
};
const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(Viewport);
