export class TransistorSoftMap extends HTMLElement {

  // properties:   hidemarkers hidepolygons hidegeofences noclustering maxmarkers

  // attributes:
  // markers - JSON of markers
  // selectedMarker - a currently selected marker or null

  constructor() {
    super();
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `<div style="width:400px; height: 400px;"></div>`;
    this.gmap = new google.maps.Map(shadowRoot.querySelector('div'), {
      center: { lat: -34.397, lng: 150.644 },
      zoom: 8,
    });
  }


}
window.customElements.define('transistorsoft-map', TransistorSoftMap);
