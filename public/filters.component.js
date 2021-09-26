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

    #delete {
      position: absolute;
      top: 30px;
      right: 10px;
      background: red;
    }
  </style>
  <h1>Locations</h1>
  <input type=button id="delete" value="DELETE"></input>
  <div>
    <select><option value="" disabled selected hidden>Choose Company</option></select>
  </div>
  <div>
    <select><option value="" disabled selected hidden>Choose Device</option></select>
  </div>
  <div>
    <span>From: </span><br><input type="date"><input type="time">
  </div>
  <div>
    <span>To: </span><br/><input type="date"><input type="time">
  </div>
  <div>
    <input type="checkbox"></input><label>Watch mode</label>
  </div>
`;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

  }
}
window.customElements.define('transistorsoft-filters', TransistorSoftFilters);
