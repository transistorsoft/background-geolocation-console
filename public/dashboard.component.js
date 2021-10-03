import * as Storage from './storage.js';
import './customMarkers.component.js';
import './details.component.js';
import './filters.component.js';
import './layout.component.js';
import './list.component.js';
import './login.component.js';
import './map.component.js';
import './settings.component.js';
import './storage.js';

// react reducer goes here
const GlobalController = {
  makeHeaders: function() {
    const accessToken = (Storage.getAuth() || {}).accessToken;
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  },

  getDefaultJwt: async function(token) {
    const apiUrl = this.getAttribute('api');
    try {
      const response = await fetch(
        `${apiUrl}/jwt`,
        {
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ org: token }),
        },
      );

      return (await response.json());
    } catch (e) {
      return {
        error: e.message,
        access_token: null
      };
    }
  },

  loadInitialData: async function() {
    const storedAuth = Storage.getAuth() || {};
    if (storedAuth.org === 'admin' && storedAuth.accessToken) {
      //special case - try to use that token
    }
    const org = this.getAttribute('org');
    const jwtResponse = await this.getDefaultJwt(org);

    Storage.setAuth({
      org,
      accessToken: jwtResponse.access_token
    });

    const existingSettings = Storage.getSettings(org);
    const urlSettings =  Storage.getUrlSettings();

    this.applyExistingSettings(existingSettings);
    this.applyExistingSettings(urlSettings);

    await this.reload();
    setTimeout(() => this.reload(), 60 * 1000);
    this.sendEvent('tracker', `load:${id}`);
  },

  sendEvent: function() {
    if (window.GA) {
      window.GA.sendEvent.apply(GA, arguments);
    }
  },

  applyExistingSettings: function(settings) {
    Object.assign(this, settings);
  },

  reload: async function() {

    await this.loadOrgTokens();
    await this.autoselectOrInvalidateSelectedOrgToken();
    await this.loadDevices();
    await this.autoselectOrInvalidateSelectedDevice();
    await this.loadLocations();
    await this.loadCurrentLocation();
    await this.invalidateSelectedLocation();

    this.mapEl.fitBounds();
  },

  loadOrgTokens: async function() {
    const org = this.getAttribute('org');
    const apiUrl = this.getAttribute('api');
    const params = new URLSearchParams({ company_token: org});
    const headers = this.makeHeaders();
    const response = await fetch(`${apiUrl}/company_tokens?${params}`, { headers });
    const records = await response.json();
    this.companies = records.map((x) => ({
      id: x.id,
      name: x.company_token,
    }));
  },

  autoselectOrInvalidateSelectedOrgToken: async function() {
    if (this.companies.length === 0) {
      this.company = 1;
    }
    if (this.companies.length === 1) {
      this.company = this.companies[0].id;
    }
    if (this.companies.length > 1) {
      this.company = this.company;
    }
  },

  loadDevices: async function() {
    const org = this.getAttribute('org');
    const apiUrl = this.getAttribute('api');
    const params = new URLSearchParams({
      company_token: org,
      company_id: this.company
    });
    const headers = this.makeHeaders();
    const response = await fetch(`${apiUrl}/devices?${params}`, { headers });
    const records = await response.json();
    const devices = records.map(({
        id, device_id: deviceId, framework,
      }) => ({
        id,
        name: framework
          ? `${deviceId}(${framework})`
          : `${deviceId}`,
      }));
    this.devices = devices;
  },

  autoselectOrInvalidateSelectedDevice: function() {
    if (this.devices.length === 0) {
      this.device = '';
    }
    if (this.devices.length === 1) {
      this.device = this.devices[0].id;
    }
    if (this.device.length > 1) {
      this.device = this.device;
    }

  }



};

export class TransistorSoftDashboard extends HTMLElement {
  constructor() {
    super();

    const template = `
  <style>
    :host {
      display: block;
    }
    #left {
      border-right: 3px solid grey;
      position: absolute;
      width: 250px;
      height: 100%;
      left: 0;
      top: 0;
    }
    #right {
      border-left: 3px solid grey;
      position: absolute;
      width: 350px;
      height: 100%;
      right: 0px;
      top: 0;
    }
    #center {
      position: absolute;
      display: flex;
      flex-direction: column;
      height: 100%;
      left: 253px;
      right: 353px;
      top: 0;
    }
    #center-header {
      background: #303f9f;
      color: white;
      height: 60px;
      display: flex;
      justify-content: space-between;
      font-size: 20px;
    }
    #center-header h2 {
      margin: 15px;
      margin-left: 55px;
    }
    #center transistorsoft-layout {
      flex: 1;
    }
    #center transistorsoft-login {
      position: absolute;
      right: 5px;
      top: 70px;
    }

    .panel-content {
      margin-top: 65px;
      overflow-y: auto;
      height: calc(100% - 65px);
    }

    .panel-content > * {
      margin: 5px 0;
    }

    .panel-header {
      position: absolute;
      width: 100%;
      top: 0;
      left: 0;
      margin: 0;
      height: 60px;
      background: #303f9f;
      color: white;
      text-align: center;
    }

    .collapse-button {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 40px;
      cursor: pointer;
      right: 5px;
      top: 15px;
    }

    .collapse-button span {
      font-size: 30px;
      transform: scaleX(0.5);
      margin-left: 2px;
      display: inline-block;
    }

    .collapse-button:hover {
      background: #101f7f;
    }

    .expand-button {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 40px;
      cursor: pointer;
      left: 10px;
      top: 12px;
    }

    .expand-button span {
      font-size: 50px;
      left: 7px;
      margin-top: -12px;
      display: inline-block;
      position: relative;
    }

    .expand-button:hover {
      background: #101f7f;
    }

  </style>
  <div id="left">
    <div class="panel-header">
      <h2>Filters</h2>
      <span class="collapse-button"><span>&lt;</span></span>
    </div>
    <div class="panel-content">
      <transistorsoft-filters></transistorsoft-filters>
      <transistorsoft-mapsettings></transistorsoft-mapsettings>
      <transistorsoft-custommarkers></transistorsoft-markers>
    </div>
  </div>
  <div id="center">
    <div id="center-header">
      <span class="expand-button" style="visibility: hidden;"><span>≡</span></span>
      <h2>Background Geolocation Console</h2>
      <img src="./images/transistor-logo.svg">
    </div>
    <transistorsoft-layout>
      <transistorsoft-map slot="map"></transistorsoft-map>
      <transistorsoft-list slot="list"></transistorsoft-list>
    </transistorsoft-layout>
    <transistorsoft-login>
  </div>
  <div id="right">
    <div class="panel-header">
      <h2>Location</h2>
      <span class="collapse-button"><span>&lt;</span></span>
    </div>
    <panel-header>
     <transistorsoft-details></transistorsoft-details>
    </panel-header>
  </div>
`;

    // attach only when google maps is ready
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;


    this.shadowRoot.querySelector('#left .collapse-button').addEventListener('click', () => {
      this.collapseFiltersPanel();
    });

    this.shadowRoot.querySelector('#center .expand-button').addEventListener('click', () => {
      this.expandFiltersPanel();
    });

    this.shadowRoot.querySelector('#right .collapse-button').addEventListener('click', () => {
      this.collapseLocationPanel();
    });

    this.mapEl = this.shadowRoot.querySelector('transistorsoft-map');
    this.listEl = this.shadowRoot.querySelector('transistorsoft-list');
    this.filtersEl = this.shadowRoot.querySelector('transistorsoft-filters');
    this.settingsEl = this.shadowRoot.querySelector('transistorsoft-settings');

    Object.assign(this, GlobalController);

    this.loadInitialData();
  }

  get companies() {
    return this._companies || [];
  }

  set companies(value) {
    this._companies = value;
    this.filtersEl.companies = value;
  }

  get company() {
    return this.filtersEl.company;
  }

  set company(value) {
    this.filtersEl.company = value;
  }

  get devices() {
    return this._devices || [];
  }

  set devices(value) {
    this._devices = value;
    this.filtersEl.devices = value;
  }

  get device() {
    return this.filtersEl.device;
  }

  set device(value) {
    this.filtersEl.device = value;
  }

  expandLocationPanel() {
          this.shadowRoot.querySelector('#right').style.right = '0px';
          this.shadowRoot.querySelector('#center').style.right = '353px';
  }

  collapseLocationPanel() {
          this.shadowRoot.querySelector('#right').style.right = '-353px';
          this.shadowRoot.querySelector('#center').style.right = '0px';
  }

  collapseFiltersPanel() {
          this.shadowRoot.querySelector('#left').style.left = '-250px';
          this.shadowRoot.querySelector('#center').style.left = '0px';
          this.shadowRoot.querySelector('#center .expand-button').style.visibility = '';
  }

  expandFiltersPanel() {
          this.shadowRoot.querySelector('#left').style.left = '0px';
          this.shadowRoot.querySelector('#center').style.left = '253px';
          this.shadowRoot.querySelector('#center .expand-button').style.visibility = 'hidden';
  }

}
window.customElements.define('transistorsoft-dashboard', TransistorSoftDashboard);
