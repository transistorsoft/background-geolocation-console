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
      background: red;
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
       width: 20px;
       height: 20px;
       fill: white;
    }



    #reload:active {
       background: #1f3195;
    }

    .watch-label {
      height: 30px;
      line-height: 30px;
    }

    .switch {
      position: relative;
      display: inline-block;
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
  <input type=button id="delete" value="DELETE"></input>
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
  <div>
    <input type="button" value="Today">
    <input type="button" value="Last week">
    <input type="button" value="Last 1000 points">
  </div>
  <div style="margin: 5px 0">
    <button id="reload">
      ${svgReload}<span>RELOAD</span>
    </button>
  </div>
  <div class="row">
    <span class="watch-label">Watch mode</span>
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

  }

  set companies(value) {
    this._companies = value;
    this.shadowRoot.querySelector('#companies').innerHTML = `
      <option value="" disabled selected hidden>Choose Company</option>
      ${this._companies.map( (company) => `<option value="${company.id}">${company.name}</option>`).join('\n')}
    ` ;
    const wrapperEl = this.shadowRoot.querySelector('#companies-wrapper');
    wrapperEl.style.display = value.length > 1 ? '' : 'none';
  }
  get companies() {
    return this._companies;
  }

  set company(value) {
    const el = this.shadowRoot.querySelector('#companies');
    el.value = value;
  }
  get company() {
    const el = this.shadowRoot.querySelector('#companies');
    return el[el.selectedIndex].value;
  }

  set devices(value) {
    this._devices = value;
    this.shadowRoot.querySelector('#devices').innerHTML = `
      <option value="" disabled selected hidden>Choose Device</option>
      ${this._devices.map( (device) => `<option value="${device.id}">${device.name}</option>`).join('\n')}
    ` ;
  }

  get devices() {
    return this._devices;
  }

  set device(value) {
    const el = this.shadowRoot.querySelector('#devices');
    el.value = value;
  }

  get device() {
    const el = this.shadowRoot.querySelector('#devices');
    return el[el.selectedIndex].value;
  }

  set from(value) {
    const dateEl = this.shadowRoot.querySelector('#from [type=date]');
    const timeEl = this.shadowRoot.querySelector('#from [type=time]');
    const asString = new Date(value).toISOString();
    dateEl.value = asString.substring(0, 10);
    timeEl.value = asString.substring(11, 16);
  }

  get from() {
    const dateEl = this.shadowRoot.querySelector('#from [type=date]');
    const timeEl = this.shadowRoot.querySelector('#from [type=time]');
    return new Date(`${dateEl.value}T${timeEl.value}Z`);
  }

  set to(value) {
    const dateEl = this.shadowRoot.querySelector('#to [type=date]');
    const timeEl = this.shadowRoot.querySelector('#to [type=time]');
    const asString = new Date(value).toISOString();
    dateEl.value = asString.substring(0, 10);
    timeEl.value = asString.substring(11, 16);
  }

  get to() {
    const dateEl = this.shadowRoot.querySelector('#from [type=date]');
    const timeEl = this.shadowRoot.querySelector('#from [type=time]');
    return new Date(`${dateEl.value}T${timeEl.value}Z`);
  }

  set watchMode(value) {
    this.shadowRoot.querySelector('#watch').checked = value;
  }

  get watchMode() {
    return this.shadowRoot.querySelector('#watch').checked;
  }






}
window.customElements.define('transistorsoft-filters', TransistorSoftFilters);
