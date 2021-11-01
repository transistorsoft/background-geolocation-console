import * as Utils from './utils.js';
import './customMarkers.component.js';
import './details.component.js';
import './filters.component.js';
import './layout.component.js';
import './list.component.js';
import './login.component.js';
import './map.component.js';
import './settings.component.js';

// react reducer goes here
const GlobalController = {
  makeHeaders: function() {
    const accessToken = (Utils.getAuth() || {}).accessToken;
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  },

  getDefaultJwt: async function(token) {
    try {
      const response = await fetch(
        `${this.apiUrl}/jwt`,
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

  sendEvent: function() {
    if (window.GA) {
      window.GA.sendEvent.apply(GA, arguments);
    }
  },

  applyExistingSettings: function(settings) {
    Object.assign(this, settings);
  },

  loadInitialData: async function() {
    const storedAuth = Utils.getAuth() || {};
    if (storedAuth.org && !this.org) {
      console.info('TransistorSoft-dashboard: using an org ${storedAuth.org} from localStorage');
      this.org = storedAuth.org;
    }
    if (storedAuth.isAdmin && this.org === storedAuth.org && storedAuth.accessToken) {
      //special case - try to use that token without entering a password
    } else {
      const jwtResponse = await this.getDefaultJwt(this.org);
      Utils.setAuth({
        org: this.org,
        accessToken: jwtResponse.access_token
      });
    }

    const existingSettings = Utils.getSettings(this.org);
    this.applyExistingSettings(existingSettings);

    await this.reload({reloadCompanies: true, fitBounds: true});
    setTimeout(() => this.reload({fitBounds: false}), 60 * 1000);
    this.sendEvent('tracker', `load:${this.org}`);
  },

  reload: async function(options = {}) {
    const reloadCompanies = options.reloadCompanies || false;
    const fitBounds = options.fitBounds || true;
    // do not call more than once a second
    // when called multiple times on javascript event handler - call only once

    if (this._latestTimeOfReload && this._latestTimeOfReload + 1 * 1000 > new Date().getTime()) {
      setTimeout( () => this.reload(options), 100);
      return;
    }

    // allow to assign properties all together before rendering
    if (!this._avoidImmediate) {
      setTimeout( () => this.reload(options), 1);
      this._avoidImmediate = true;
      return;
    }

    // reset delay/buffering flags
    this._latestTimeOfReload = new Date().getTime();
    this._avoidImmediate = false;

    console.info('reloading');

    if (reloadCompanies) {
        await this.loadOrgTokens(),
        await this.autoselectOrInvalidateSelectedOrgToken();
    }
    await this.loadDevices(),
    await this.autoselectOrInvalidateSelectedDevice();
    await this.loadLocations(),
    await this.invalidateSelectedLocation();
    await this.loadCurrentLocation()


    if (fitBounds) {
      this.mapEl.fitBounds();
    }
  },

  loadOrgTokens: async function() {
    const params = new URLSearchParams({ company_token: this.org});
    const headers = this.makeHeaders();
    const response = await fetch(`${this.apiUrl}/company_tokens?${params}`, { headers });
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
      if (!this.company) {
        this.company = this.companies[0].id;
      }
    }
  },

  loadDevices: async function() {
    const params = new URLSearchParams({
      company_token: this.org,
      company_id: this.company
    });
    const headers = this.makeHeaders();
    const response = await fetch(`${this.apiUrl}/devices?${params}`, { headers });
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

  autoselectOrInvalidateSelectedDevice: async function() {
    if (this.devices.length === 0) {
      this.device = '';
    }
    if (this.devices.length === 1) {
      this.device = this.devices[0].id;
    }
    if (this.devices.length > 1) {
      if (!this.device) {
        this.device = this.devices[0].id;
      }
    }
  },

  loadLocations: async function() {
    this.sendEvent('tracker', 'loadLocations', this.org);
    const params = new URLSearchParams({
      company_token: this.org,
      company_id: this.company,
      device_id: this.device,
      limit: this.maxMarkers,
      start_date: new Date(this.from).toISOString(),
      end_date: new Date(this.to).toISOString()
    });

    const headers = this.makeHeaders();
    const response = await fetch(`${this.apiUrl}/locations?${params}`, { headers });
    const records = await response.json();
    this.locations = records;
  },

  loadCurrentLocation: async function() {
    const params = new URLSearchParams({
      company_token: this.org,
      company_id: this.company,
      device_id: this.device
    });
    const headers = this.makeHeaders();
    const response = await fetch(`${this.apiUrl}/locations/latest?${params}`, { headers });
    this.currentLocation = await response.json();
  },

  invalidateSelectedLocation: async function() {
    const existingLocation = this.locations.filter( (x) => x.uuid === this.location)[0];
    if (!existingLocation) {
      this.location = null;
    }
  },

  deleteActiveDevice: async function(range) {
    const params = new URLSearchParams(range === 'all' ? {} : {
      start_date: new Date(this.from).toISOString(),
      end_date: new Date(this.to).toISOString()
    });
    const headers = this.makeHeaders();
    await fetch(`${this.apiUrl}/devices/${this.device}?${params}`,
      { method: 'delete', headers }
    )
    await this.reload();
  },

  login: async function({login, password}) {
      const response = await fetch(
        `${this.apiUrl}/auth`,
        {
          method: 'post',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, password }),
        },
      );
      const {
        access_token: accessToken,
        org,
        error,
      } = await response.json();

      if (accessToken) {
        this.org = login;
        Utils.setAuth({org: login, accessToken, isAdmin: true});
        window.history.replaceState(null, null, '/' + login);
        await this.reload({ reloadCompanies: true, fitBounds: true});
        return true;
      } else {
        return false;
      }
  },

  saveSettings: function() {
      Utils.setSettings(this.org, {
        showMarkers: this.showMarkers,
        showPolyline: this.showPolyline,
        showGeofences: this.showGeofences,
        useClustering: this.useClustering,
        from: this.from,
        to: this.to
      });
  }
};

export class TransistorSoftDashboard extends HTMLElement {
  constructor() {
    super();

    const template = `
  <style>
    :host {
      display: block;
      font-family: Roboto, sans-serif;
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
      margin-left: 33px;
    }

    #center-header img {
      height: 100%;
      margin-right: -11px;
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
      <transistorsoft-filters ></transistorsoft-filters>
      <transistorsoft-mapsettings></transistorsoft-mapsettings>
      <transistorsoft-custommarkers></transistorsoft-custommarkers>
    </div>
  </div>
  <div id="center">
    <div id="center-header">
      <span class="expand-button" style="visibility: hidden;"><span>≡</span></span>
      <h2>Background Geolocation Console</h2>
      <a href="https://www.transistorsoft.com" target="_blank"><img src="./images/transistor-logo.svg"></a>
    </div>
    <transistorsoft-layout>
      <transistorsoft-map slot="map"></transistorsoft-map>
      <transistorsoft-list slot="list"></transistorsoft-list>
    </transistorsoft-layout>
    <transistorsoft-login />
  </div>
  <div id="right">
    <div class="panel-header">
      <h2>Location</h2>
      <span class="collapse-button"><span>&lt;</span></span>
    </div>
    <div class="panel-content">
     <transistorsoft-details></transistorsoft-details>
    </div>
  </div>
`;

    // attach only when google maps is ready
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

    this.mapEl = this.shadowRoot.querySelector('transistorsoft-map');
    this.listEl = this.shadowRoot.querySelector('transistorsoft-list');
    this.filtersEl = this.shadowRoot.querySelector('transistorsoft-filters');
    this.customMarkersEl = this.shadowRoot.querySelector('transistorsoft-custommarkers');
    this.settingsEl = this.shadowRoot.querySelector('transistorsoft-mapsettings');
    this.detailsEl = this.shadowRoot.querySelector('transistorsoft-details');
    this.loginEl = this.shadowRoot.querySelector('transistorsoft-login');

    Object.assign(this, GlobalController);
    this.from = Utils.getTodayStart();
    this.to = Utils.getTodayEnd();

    // manage panels visibility
    this.shadowRoot.querySelector('#left .collapse-button').addEventListener('click', () => {
      this.collapseFiltersPanel();
    });

    this.shadowRoot.querySelector('#center .expand-button').addEventListener('click', () => {
      this.expandFiltersPanel();
    });

    this.shadowRoot.querySelector('#right .collapse-button').addEventListener('click', () => {
      if (!this.watchMode) {
        this.collapseLocationPanel();
      }
    });

    // connect all elements together
    this.customMarkersEl.addEventListener('add', e => {
      this.mapEl.addTestMarker(e.detail);
    });

    this.mapEl.addEventListener('selectionchange', () => {
      this.listEl.selected = this.mapEl.selected;
      this.detailsEl.record = this.locations.filter( (x) => x.uuid === this.listEl.selected)[0];
      this.expandLocationPanel();
    });

    this.listEl.addEventListener('selectionchange', () => {
      this.mapEl.selected = this.listEl.selected;
      this.detailsEl.record = this.locations.filter( (x) => x.uuid === this.listEl.selected)[0];
      this.expandLocationPanel();
    });

    this.settingsEl.addEventListener('change', () => {

      this.showMarkers = this.settingsEl.showMarkers;
      this.showPolyline = this.settingsEl.showPolyline;
      this.showGeofences = this.settingsEl.showGeofences;
      this.useClustering = this.settingsEl.useClustering;

      this.saveSettings();


    });

    this.filtersEl.addEventListener('company-changed', () => {
      this.reload();
    });

    this.filtersEl.addEventListener('device-changed', () => {
      this.reload();
    });

    this.filtersEl.addEventListener('from-changed', () => {
      this.saveSettings();
      this.reload();
    });

    this.filtersEl.addEventListener('to-changed', () => {
      this.saveSettings();
      this.reload();
    });

    this.filtersEl.addEventListener('reload', () => {
      this.reload();
    });

    this.filtersEl.addEventListener('watchmode-changed', () => {
      this.listEl.watchMode = this.watchMode;
      this.mapEl.watchMode = this.watchMode;

      if (this.watchMode) {
        this.detailsEl.record = this.currentLocation;
        this.expandLocationPanel();
      } else {
        this.detailsEl.record = this.locations.filter( (x) => x.uuid === this.listEl.selected)[0];
        this.detailsEl.record ?  this.expandLocationPanel() : this.collapseLocationPanel();
      }

    });

    this.filtersEl.addEventListener('delete', async ({detail}) => {
      const { range } = detail; // 'all' | 'custom'
      await this.deleteActiveDevice(range);
      await this.reload();
    });

    this.loginEl.addEventListener('submit', async (e) => {
      const result = await this.login(e.detail);
      if (result) {
        this.loginEl.hideModal();
      } else {
        this.loginEl.showError();
      }
    });

    this.loginEl.style.visibility = this.shared ? '' : 'hidden';

    this.loadInitialData();
  }

  get shared() {
    return this.hasAttribute('shared');
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

  get locations() {
    return this._locations || [];
  }

  set locations(value) {
    this._locations = value;
    this.mapEl.locations = value;
    this.listEl.locations = value;
  }

  get location() {
    return this.mapEl.selected;
  }

  set location(value) {
    this.mapEl.selected = value;
    this.listEl.selected = value;
  }

  get currentLocation() {
    return this._currentLocation;
  }

  set currentLocation(value) {
    this._currentLocation = value;
    this.mapEl.currentLocation = value;
    this.listEl.currentLocation = value;
  }

  get watchMode() {
    return this.filtersEl.watchMode;
  }

  set watchMode(value) {
    this.filtersEl.watchMode = value;
    this.mapEl.watchMode = value;
    this.listEl.watchMode = value;
  }

  get from() {
    return this.filtersEl.from;
  }
  set from(value) {
    this.filtersEl.from = value;
  }

  get to() {
    return this.filtersEl.to
  }

  set to(value) {
    this.filtersEl.to = value;
  }

  get showMarkers() {
    return this._showMarkers;
  }

  set showMarkers(value) {
    this._showMarkers = value;
    this.mapEl.showMarkers = value;
    this.settingsEl.showMarkers = value;
  }

  get showPolyline() {
    return this._showPolyline;
  }

  set showPolyline(value) {
    this._showPolyline = value;
    this.mapEl.showPolyline = value;
    this.settingsEl.showPolyline = value;
  }

  get showGeofences() {
    return this._showGeofences;
  }

  set showGeofences(value) {
    this._showGeofences = value;
    this.mapEl.showGeofences = value;
    this.settingsEl.showGeofences = value;
  }

  get useClustering() {
    return this._useClustering;
  }

  set useClustering(value) {
    this._useClustering = value;
    this.mapEl.useClustering = value;
    this.settingsEl.useClustering = value;
  }

  get org() {
    return this.getAttribute('org');
  }

  set org(value) {
    this.setAttribute('org', value);
  }

  get apiUrl() {
    return this.getAttribute('api');
  }







  get maxMarkers() {
    return 1000;
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
          this.shadowRoot.querySelector('#center-header h2').style.marginLeft = '55px';
  }

  expandFiltersPanel() {
          this.shadowRoot.querySelector('#left').style.left = '0px';
          this.shadowRoot.querySelector('#center').style.left = '253px';
          this.shadowRoot.querySelector('#center .expand-button').style.visibility = 'hidden';
          this.shadowRoot.querySelector('#center-header h2').style.marginLeft = '33px';
  }

}
window.customElements.define('transistorsoft-dashboard', TransistorSoftDashboard);
