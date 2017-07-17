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
          <Panel className={Styles.workspace} bodyScroll={false} scrollY={false}>
            <HeaderView />
            <Tabs index={this.state.activeTab} hideMode="display" onChange={this.handleTabChange.bind(this)}>
              <Tab label="Verificadores">
                  <div id="map-canvas-verificador" class="map" data-bind="visible: isGoogleMapsInitialized"></div>

                  <div id="no-map" data-bind="invisible: isGoogleMapsInitialized">
                      <h3>Se require activar la ubicación y conexión a internet para mostrar el mapa.</h3>
                  </div>
                  <div id="map-search-wrap" class="map-tools" data-bind="visible: isGoogleMapsInitialized, invisible: hideSearch">
                      <div data-bind="events: { keyup: checkEnter }">
                          
                          <button id="map-navigate-home" class="map-tools-button home" data-bind="click: onNavigateHome"></button>
                          <input id="map-address" type="search" class="map-tools-input" data-bind="value: address" placeholder="Buscar dirección..." />
                          <button id="map-search" class="map-tools-button search" data-bind="click: onSearchAddress"></button>
                          
                      </div>
                  </div>
              </Tab>
              <Tab label="Mapa" className={Styles.cabeceraTabla}>
                <MapView />
              </Tab>
              <Tab label="Data" className={Styles.cabeceraTabla}>
                <ListView selected={this.state.location} />
              </Tab>
            </Tabs>
          </Panel>
        </Layout>
    );
  }
}