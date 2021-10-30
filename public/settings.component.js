export class TransistorSoftMapSettings extends HTMLElement {

  constructor() {
    super();
    const template = `
  <style>
    :host {
      display: block;
      padding: 10px;
      overflow: hidden;
      box-shadow: 0px 1px 3px 0px rgb(0 0 0 / 20%), 0px 1px 1px 0px rgb(0 0 0 / 14%), 0px 2px 1px -1px rgb(0 0 0 / 12%);
      border-radius: 4px;
      color: rgba(0, 0, 0, 0.87);
      background-color: #fff;
      font-family: Roboto, sans-serif;
    }
    h1 {
      font-size: 24px;
      font-weight: 400;
      line-height: 1.33;
      letter-spacing: 0;
    }

    div {
      margin: 5px 0px;

    }
  </style>
  <h1>Map</h1>
    <div>
      <input type="checkbox" id="hideMarkers" ></input>
      <label for="hideMarkers">Hide Markers</label>
    </div>

    <div>
      <input type="checkbox" id="hidePolyline" ></input>
      <label for="hidePolyline">Hide Polyline</label>
    </div>

    <div>
      <input type="checkbox" id="hideGeofences" ></input>
      <label for="hideGeofences">Hide Geofences </label>
    </div>

    <div>
      <input type="checkbox" id="disableClustering" ></input>
      <label for="disableClustering">Disable Clustering</label>
    </div>
`;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

    this.settingsChangedEvent = new CustomEvent('change');

    this.shadowRoot.querySelectorAll('[type=checkbox]').forEach( (element) => {
      element.addEventListener('change', () => {
        if (!this.ignoreEvents) {
          this.dispatchEvent(this.settingsChangedEvent);
          console.info('changed!');
        }
      });
    });
  }


  set showMarkers(value) {
    this.ignoreEvents = true;
    this.shadowRoot.querySelector('#hideMarkers').checked = !value;
    this.ignoreEvents = false;
  }

  get showMarkers() {
    return !this.shadowRoot.querySelector('#hideMarkers').checked;
  }

  set showPolyline(value) {
    this.ignoreEvents = true;
    this.shadowRoot.querySelector('#hidePolyline').checked = !value;
    this.ignoreEvents = false;
  }

  get showPolyline() {
    return !this.shadowRoot.querySelector('#hidePolyline').checked;
  }

  set showGeofences(value) {
    this.ignoreEvents = true;
    this.shadowRoot.querySelector('#hideGeofences').checked = !value;
    this.ignoreEvents = false;
  }

  get showGeofences() {
    return !this.shadowRoot.querySelector('#hideGeofences').checked;
  }

  set useClustering(value) {
    this.ignoreEvents = true;
    this.shadowRoot.querySelector('#disableClustering').checked = !value;
    this.ignoreEvents = false;
  }

  get useClustering() {
    return !this.shadowRoot.querySelector('#disableClustering').checked;
  }



}
window.customElements.define('transistorsoft-mapsettings', TransistorSoftMapSettings);
