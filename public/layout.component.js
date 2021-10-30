// We just need to support a simple tabs switch
// Not a full component for tabs switching
const template = `
      <style>
        :host {
          display: block;
          position: relative;
          font-family: Roboto, sans-serif;
        }
        .headers {
          height: 42px;
          background: #3f51b5;
          color: white;
          white-space: nowrap;
        }
        .items {
          position: absolute;
          top: 42px;
          bottom: 0px;
          width: 100%;
        }
        .items > * {
          position: absolute;
          width: 100%;
          height: 100%;
          left: 0%;
        }
        ::slotted(*) {
          width: 100%;
          height: 100%;
        }
        .header {
          cursor: pointer;
          text-align: center;
          width: 100px;
          height: 37px;
          line-height: 37px;
          display: inline-block;
          border-bottom: 3px solid transparent;
        }
        .selected {
          border-bottom: 3px solid red;
        }
      </style>
      <div class="headers">
        <div data-tab="map" class="header">Map</div>
        <div data-tab="list" class="header">List</div>
        <div data-tab="split" class="header">Map and List</div>
      </div>
      <div class="items">
        <div data-content="map"><slot name="map"></slot></div>
        <div data-content="list"><slot name="list"></slot></div>
      </div>
`;

export class TransistorSoftLayout extends HTMLElement {

  constructor() {
    super();

    this._activeTab = 'map';

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

    this.shadowRoot.querySelector('.headers').addEventListener('click', (e) => {
      const headerEl = e.target.closest('.header');
      if (headerEl) {
        const tab = headerEl.getAttribute('data-tab')  ;
        this.activeTab = tab;
      }
    }, true);

    this.onSelectTab();

  }

  get activeTab() {
    return this._activeTab;
  }

  set activeTab(value) {
    this._activeTab = value;
    this.onSelectTab();
  }

  onSelectTab() {
    const selectedTabs = this.shadowRoot.querySelectorAll('.header.selected');
    for (var t of selectedTabs) {
      t.classList.remove('selected');
    }
    const selectedTab = this.shadowRoot.querySelector(`.header[data-tab="${this.activeTab}"]`);
    selectedTab.classList.add('selected');

    const mapEl = this.shadowRoot.querySelector('[data-content=map]');
    const listEl = this.shadowRoot.querySelector('[data-content=list]');

    if (this.activeTab === 'map') {
      mapEl.style.visibility = '';
      listEl.style.visibility = 'hidden';
      mapEl.zIndex = 100;
      listEl.zIndex = 0;

      mapEl.style.left = '0%';
      mapEl.style.width = '100%';
      listEl.style.left = '0%';
      listEl.style.width = '100%';
    }
    if (this.activeTab === 'list') {
      mapEl.style.visibility = 'hidden';
      listEl.style.visibility = '';
      mapEl.zIndex = 0;
      listEl.zIndex = 100;

      mapEl.style.left = '0%';
      mapEl.style.width = '100%';
      listEl.style.left = '0%';
      listEl.style.width = '100%';
    }
    if (this.activeTab === 'split') {
      mapEl.style.visibility = '';
      listEl.style.visibility = '';

      mapEl.style.left = '0%';
      mapEl.style.width = '50%';
      listEl.style.left = '50%';
      listEl.style.width = '50%';


    }




  }

}
window.customElements.define('transistorsoft-layout', TransistorSoftLayout);
