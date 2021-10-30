export class TransistorSoftCustomMarkers extends HTMLElement {

  constructor() {
    super();
    const template = `
  <style>
    :host {
      font-family: Roboto, sans-serif;
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
      font-weight: 400;
      line-height: 1.33;
      letter-spacing: 0;
    }

    div {
      margin: 10px 0px;
      display: flex;
      justify-content: space-between;
      flex-direction: row
    }

    label {
      display: inline-block;
      width: 50px;
    }

    #add {
      width: 100%;
      background: #3f51b5;
      height: 40px;
      border: none;
      border-radius: 5px;
      color: white;
      font-size: 16px;
    }

    #add:active {
      background: #1f3195;
    }

  </style>
  <h1>Custom Markers</h1>
    <div>
      <label for="label">Label</label>
      <input id="label"></input>
    </div>

    <div>
      <label for="location">Location</label>
      <input id="location"></input>
    </div>

    <div>
      <label for="radius">Radius</label>
      <input id="radius"></input>
    </div>

    <button id="add">ADD MARKER</button>

`;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

    this.shadowRoot.querySelector('#add').addEventListener('click', () => {
      const label = this.shadowRoot.querySelector('#label').value;
      const location = this.shadowRoot.querySelector('#location').value;
      const radius = +this.shadowRoot.querySelector('#radius').value || null;
      const [lat, lng] = location.split(',').map( (x) => +x);
      const type = !radius ? 'location' : 'geofence';
      this.dispatchEvent(new CustomEvent('add', { detail: { label, lat, lng, radius, type }}));
    });

  }
}
window.customElements.define('transistorsoft-custommarkers', TransistorSoftCustomMarkers);
