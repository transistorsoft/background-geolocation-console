
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
  </style>
  <h1>Map</h1>
    <div>
      <input type="checkbox" id="hideMarkers" checked></input>
      <label for="hideMarkers">Hide Markers</label>
    </div>

    <div>
      <input type="checkbox" id="hidePolyline" checked></input>
      <label for="hidePolyline">Hide Polyline</label>
    </div>

    <div>
      <input type="checkbox" id="hideGeofences" checked></input>
      <label for="hideGeofences">Hide Geofences </label>
    </div>

    <div>
      <input type="checkbox" id="disableClustering" checked></input>
      <label for="disableClustering">Disable Clustering</label>
    </div>
`;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

  }
}
window.customElements.define('transistorsoft-mapsettings', TransistorSoftMapSettings);
