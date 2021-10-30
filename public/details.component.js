export class TransistorSoftDetails extends HTMLElement {
  constructor() {
    super();
    const template = `
  <style>
    :host {
      display: block;
      padding: 10px;
      font-family: Roboto, sans-serif;
    }
    pre { font-size: 12px; line-height: 1.4; }
  </style>
  <pre></pre>
`;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;
  }
  set record(value) {
    this._record = value;
    this.shadowRoot.querySelector('pre').innerText = JSON.stringify(value, null, 2);
  }
  get record() {
    return this._record;
  }
}
window.customElements.define('transistorsoft-details', TransistorSoftDetails);
