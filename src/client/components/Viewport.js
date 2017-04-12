import React, {
  PropTypes, 
  Component,
  View,
  Text
} from 'react';

import GoogleMap from 'google-map-react';

import {
  AppBar,
  Button,
  Navigation,
  Link,
  FontIcon,
  Layout, 
  NavDrawer,
  Panel, 
  Tabs,
  Tab,
  Sidebar } from 'react-toolbox';

import Styles from '../assets/styles/app.css';
import HeaderView from './HeaderView';
import FilterView from './FilterView';
import LocationView from './LocationView';
import MapView from "./MapView";
import ListView from "./ListView";
import App from "./App";

const API_KEY = "AIzaSyA9j72oZA5SmsA8ugu57pqXwpxh9Sn4xuM";

export default class Viewport extends Component {  

  constructor(props) {
    super(props);

    this.state = {
      activeTab: 0,
      sideBarActive: false,
      location: null
    };

    App.getInstance().on('selectlocation', this.onSelectLocation.bind(this));
  }

  onSelectLocation(location) {
    this.setState({
      sideBarActive: (location !== null),
      location: location
    });
  }

  onCloseLocationView() {

  }
  handleTabChange(index) {
    this.setState({activeTab: index});
  }
  render() {
    return (
        <Layout className={Styles.viewport}>
          <NavDrawer active={true} pinned={true} className={Styles.navDrawer}>
            <FilterView />
          </NavDrawer>
          <Sidebar pinned={this.state.sideBarActive} width={6}>
            <LocationView location={this.state.location} onClose={this.onCloseLocationView.bind(this)} />
          </Sidebar>
          <Panel className={Styles.workspace}>
            <HeaderView />
            <Tabs index={this.state.activeTab} hideMode="display" onChange={this.handleTabChange.bind(this)} inverse>
              <Tab label="Map">
                <MapView />
              </Tab>
              <Tab label="Data">
                <ListView selected={this.state.location} />
              </Tab>
            </Tabs>
          </Panel>
        </Layout>
    );
  }
}