import { dateTimeToString } from './date.js';
import './modal.component.js';

const svgReload = `<svg viewBox="0 0 512 512">
	<path d="M411.826,289.391c0,86.061-69.766,155.826-155.826,155.826s-155.826-69.766-155.826-155.826S169.939,133.565,256,133.565
			v66.783l100.174-100.174L256,0v66.783c-122.943,0-222.609,99.665-222.609,222.609S133.057,512,256,512
      s222.609-99.665,222.609-222.609H411.826z"/>
  </svg>
`;
export class TransistorSoftFilters extends HTMLElement {

  constructor() {
    super();
    const template = `
  <style>
    :host {
      display: block;
      position: relative;
      padding: 10px;
      overflow: hidden;
      box-shadow: 0px 1px 3px 0px rgb(0 0 0 / 20%), 0px 1px 1px 0px rgb(0 0 0 / 14%), 0px 2px 1px -1px rgb(0 0 0 / 12%);
      border-radius: 4px;
      color: rgba(0, 0, 0, 0.87);
      background-color: #fff;
    }
    h1 {
      font-size: 24px;
      font-family: "Roboto", "Helvetica", "Arial", sans-serif;
      font-weight: 400;
      line-height: 1.33;
      letter-spacing: 0;
    }

    div {
      margin: 5px 0px;
    }

    input[type=button] {
      border-radius: 3px;
    }

    select {
      width: 100%;
    }

    #delete {
      position: absolute;
      top: 30px;
      right: 10px;
      background: #ee0000;
      border-radius: 3px;
      border: none;
      height: 25px;
      color: white;
    }

    #delete:active {
      background: #aa0000;
    }

    .modal-buttons {
      display: flex;
      justify-content: end;
      flex-direction: row
    }
    .modal-buttons button {
      width: 80px;
      margin: 0px 20px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      flex-direction: row
    }

    #reload {
       width: 100%;
       background: #3f51b5;
       height: 40px;
       border: none;
       border-radius: 5px;
       color: white;
       font-size: 16px;
    }

    #reload svg {
       position: relative;
       width: 20px;
       height: 20px;
       fill: white;
       top: 3px;
    }



    #reload:active {
       background: #1f3195;
    }

    .watch-label {
      cursor: pointer;
      flex: 1;
      height: 30px;
      line-height: 30px;
    }

    .switch {
      position: relative;
      display: inline-block;
      cursor: pointer;
    }

    .switch-input {
      display: none;
    }

    .switch-label {
      display: block;
      width: 48px;
      height: 24px;
      text-indent: -150%;
      clip: rect(0 0 0 0);
      color: transparent;
      user-select: none;
    }

    .switch-label::before,
    .switch-label::after {
      content: "";
      display: block;
      position: absolute;
      cursor: pointer;
    }

    .switch-label::before {
      width: 100%;
      height: 100%;
      background-color: #dedede;
      border-radius: 9999em;
      -webkit-transition: background-color 0.25s ease;
      transition: background-color 0.25s ease;
    }

    .switch-label::after {
      top: 0;
      left: 0;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: #fff;
      box-shadow: 0 0 2px rgba(0, 0, 0, 0.45);
      -webkit-transition: left 0.25s ease;
      transition: left 0.25s ease;
    }

    .switch-input:checked + .switch-label::before {
      background-color: #3f51b5;
    }

    .switch-input:checked + .switch-label::after {
      left: 24px;
    }

  </style>
  <h1>Locations</h1>
  <button id="delete">DELETE</button>
  <transistorsoft-modal id="modal">
    <h1 slot="header">Delete device locations</h1>
    <div slot="message">
      <div style="text-align: left;">
        <div>
          <input type="radio" checked name="range" id="all" value="all">
          <label for="all">Delete all entries</label>
        </div>
        <div>
          <input type="radio" name="range" id="custom" value="custom">
          <label for="custom">Delete specific entries</label>
        </div>
        <div class="modal-buttons">
          <button id="ok">DELETE</button>
          <button id="cancel">CANCEL</button>
        </div>
      </div>

    </div>
  </transistorsoft-modal>
  <div id="companies-wrapper">
    <select id="companies"></select>
  </div>
  <div>
    <select id="devices"><option value="" disabled selected hidden>Choose Device</option></select>
  </div>
  <div style="height: 20px"></div>
  <div id="from">
    <span>From: </span>
    <div class="row">
      <input type="date"><input type="time">
    </div>
  </div>
  <div id="to">
    <span>To: </span>
    <div class="row">
      <input type="date"><input type="time">
    </div>
  </div>
  <div class="row">
    <button id="today">Today</button>
    <button id="month">Last month</button>
    <button id="year">Last year</button>
  </div>
  <div style="margin: 5px 0">
    <button id="reload">
      <span>${svgReload}RELOAD</span>
    </button>
  </div>
  <div class="row">
    <span class="watch-label" for="watch">Watch mode</span>
    <div class="switch">
      <input id="watch" type="checkbox" class="switch-input" />
      <label for="watch" class="switch-label">Switch</label>
    </div>
  </div>
`;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

    this._companies = [];
    this._devices = [];

    this.companies = this._companies;
    this.devices = this._devices;

    this.watchModeChangedEvent = new CustomEvent('watchmode-changed');
    this.fromChangedEvent = new CustomEvent('from-changed');
    this.toChangedEvent = new CustomEvent('to-changed');
    this.companyChangedEvent = new CustomEvent('company-changed');
    this.deviceChangedEvent = new CustomEvent('device-changed');

    this.shadowRoot.querySelector('#companies').addEventListener('change', () => {
      if (!this.ignoreCompanyChanged) {
        this.dispatchEvent(this.companyChangedEvent)
      }
    });

    this.shadowRoot.querySelector('#devices').addEventListener('change', () => {
      if (!this.ignoreDeviceChanged) {
        this.dispatchEvent(this.deviceChangedEvent);
      }
    });

    this.shadowRoot.querySelector('#watch').addEventListener('change', () => {
      if (!this.ignoreWatchModeChanged) {
        this.dispatchEvent(this.watchModeChangedEvent);
      }
    });

    this.shadowRoot.querySelector('#from [type=date]').addEventListener('change', () => {
      if (!this.ignoreFromChanged) {
        this.dispatchEvent(this.fromChangedEvent);
      }
    });

    this.shadowRoot.querySelector('#from [type=time]').addEventListener('change', () => {
      if (!this.ignoreFromChanged) {
        this.dispatchEvent(this.fromChangedEvent);
      }
    });

    this.shadowRoot.querySelector('#to [type=date]').addEventListener('change', () => {
      if (!this.ignoreToChanged) {
        this.dispatchEvent(this.toChangedEvent);
      }
    });

    this.shadowRoot.querySelector('#to [type=time]').addEventListener('change', () => {
      if (!this.ignoreToChanged) {
        this.dispatchEvent(this.toChangedEvent);
      }
    });

    this.shadowRoot.querySelector('#delete').addEventListener('click', () => {
      const modal = this.shadowRoot.querySelector('#modal');
      if ( new Date(this.from).toString() === 'Invalid Date'  || new Date(this.to).toString() === 'Invalid Date') {
        this.shadowRoot.querySelector('#all').checked = true;
        this.shadowRoot.querySelector('[for=custom]').innerText = 'Invalid range selected';
        this.shadowRoot.querySelector('#custom').disabled = true;
      } else {
        const message = `From ${this.from}Z to ${this.to}Z`;
        this.shadowRoot.querySelector('[for=custom]').innerText = message;
        this.shadowRoot.querySelector('#custom').disabled = false;
      }
      modal.showModal();
    });

    this.shadowRoot.querySelector('#cancel').addEventListener('click', () => {
      const modal = this.shadowRoot.querySelector('#modal');
      modal.hideModal();
    });

    this.shadowRoot.querySelector('#ok').addEventListener('click', () => {
      const modal = this.shadowRoot.querySelector('#modal');
      this.dispatchEvent(new CustomEvent('delete', { details: { range: this.shadowRoot.querySelector('#all').checked ? 'all' : 'custom' }}));
      modal.hideModal();
    });

    this.shadowRoot.querySelector('#today').addEventListener('click', () => {
      const today = new Date();
      today.setHours(0);
      today.setMinutes(0);
      today.setSeconds(0)
      today.setMilliseconds(0);

      const now = new Date();
      now.setHours(23);
      now.setMinutes(59);
      now.setSeconds(0)
      now.setMilliseconds(0);

      this.from = dateTimeToString(today);
      this.to = dateTimeToString(now);
      this.dispatchEvent(this.fromChangedEvent);
      this.dispatchEvent(this.toChangedEvent);
    });

    this.shadowRoot.querySelector('#month').addEventListener('click', () => {
      const monthAgo = new Date();
      monthAgo.setHours(0);
      monthAgo.setMinutes(0);
      monthAgo.setSeconds(0)
      monthAgo.setMilliseconds(0);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const now = new Date();
      now.setHours(23);
      now.setMinutes(59);
      now.setSeconds(0)
      now.setMilliseconds(0);

      this.from = dateTimeToString(monthAgo);
      this.to = dateTimeToString(now);
      this.dispatchEvent(this.fromChangedEvent);
      this.dispatchEvent(this.toChangedEvent);
    });

    this.shadowRoot.querySelector('#year').addEventListener('click', () => {
      const yearAgo = new Date();
      yearAgo.setHours(0);
      yearAgo.setMinutes(0);
      yearAgo.setSeconds(0)
      yearAgo.setMilliseconds(0);
      yearAgo.setMonth(yearAgo.getMonth() - 12);

      const now = new Date();
      now.setHours(23);
      now.setMinutes(59);
      now.setSeconds(0)
      now.setMilliseconds(0);

      this.from = dateTimeToString(yearAgo);
      this.to = dateTimeToString(now);
      this.dispatchEvent(this.fromChangedEvent);
      this.dispatchEvent(this.toChangedEvent);
    });

  }

  set companies(value) {
    this.ignoreCompanyChanged = true;
    this._companies = value;
    this.shadowRoot.querySelector('#companies').innerHTML = `
      <option value="" disabled selected hidden>Choose Company</option>
      ${this._companies.map( (company) => `<option value="${company.id}">${company.name}</option>`).join('\n')}
    ` ;
    const wrapperEl = this.shadowRoot.querySelector('#companies-wrapper');
    wrapperEl.style.display = value.length > 1 ? '' : 'none';
    this.ignoreCompanyChanged = false;
  }
  get companies() {
    return this._companies;
  }

  set company(value) {
    this.ignoreCompanyChanged = true;
    const el = this.shadowRoot.querySelector('#companies');
    el.value = value;
    this.ignoreCompanyChanged = false;
  }
  get company() {
    const el = this.shadowRoot.querySelector('#companies');
    return el.value;
  }

  set devices(value) {
    this.ignoreDeviceChanged = true;
    this._devices = value;
    this.shadowRoot.querySelector('#devices').innerHTML = `
      <option value="" disabled selected hidden>Choose Device</option>
      ${this._devices.map( (device) => `<option value="${device.id}">${device.name}</option>`).join('\n')}
    ` ;
    this.ignoreDeviceChanged = false;
  }

  get devices() {
    return this._devices;
  }

  set device(value) {
    this.ignoreDeviceChanged = true;
    const el = this.shadowRoot.querySelector('#devices');
    el.value = value;
    this.ignoreDeviceChanged = false;
  }

  get device() {
    const el = this.shadowRoot.querySelector('#devices');
    return el.value;
  }

  set from(value) {
    this.ignoreFromChanged = true;
    const dateEl = this.shadowRoot.querySelector('#from [type=date]');
    const timeEl = this.shadowRoot.querySelector('#from [type=time]');
    dateEl.value = value.substring(0, 10);
    timeEl.value = value.substring(11, 16);
    this.ignoreFromChanged = false;
  }

  get from() {
    const dateEl = this.shadowRoot.querySelector('#from [type=date]');
    const timeEl = this.shadowRoot.querySelector('#from [type=time]');
    return (`${dateEl.value}T${timeEl.value}`);
  }

  set to(value) {
    this.ignoreToChanged = true;
    const dateEl = this.shadowRoot.querySelector('#to [type=date]');
    const timeEl = this.shadowRoot.querySelector('#to [type=time]');
    dateEl.value = value.substring(0, 10);
    timeEl.value = value.substring(11, 16);
    this.ignoreToChanged = false;
  }

  get to() {
    const dateEl = this.shadowRoot.querySelector('#to [type=date]');
    const timeEl = this.shadowRoot.querySelector('#to [type=time]');
    return (`${dateEl.value}T${timeEl.value}`);
  }

  set watchMode(value) {
    this.ignoreWatchModeChanged = true;
    this.shadowRoot.querySelector('#watch').checked = value;
    this.ignoreWatchModeChanged = false;
  }

  get watchMode() {
    return this.shadowRoot.querySelector('#watch').checked;
  }






}
window.customElements.define('transistorsoft-filters', TransistorSoftFilters);
