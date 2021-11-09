import './modal.component.js';
export class TransistorSoftCompany extends HTMLElement {
  constructor() {
    super();

    this._company = '';
    this._companies = [];



    const template = `
  <style>
    .form > div {
      margin: 10px 0;
    }

    #search {
      width: 382px;
      margin-bottom: 3px;
    }

    #items {
      border: 1px solid black;
      border-radius: 3px;
      width: 380px;
      height: 200px;
      overflow-y: scroll;
    }
    #items > div {
      height: 20px;
      cursor: pointer;
    }
    #items > div:hover {
        background: #eee;
    }

    #items > div.selected {
        background: #ccc;
    }

    #company {
      width: 100%;


  </style>
  <button id="company"></button>
  <transistorsoft-modal>
    <h1 slot="header">Search a company</h1>
    <div slot="message">
      <input id="search" type="search"></input>
      <div id="items">

      </div>
    </div>
  </transistorsoft-modal>
`;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

    this.shadowRoot.querySelector('#company').addEventListener('click', () => {
      this.shadowRoot.querySelector('transistorsoft-modal').showModal();
    });

    this.shadowRoot.querySelector('#search').addEventListener('change', () => {
      this.updateSearch();
    });

    this.shadowRoot.querySelector('#items').addEventListener('mousedown', (e) => {
      const row = e.target.closest('div[data-id]');
      if (row) {
        const id = row.getAttribute('data-id');
        this.company = this.companies.filter( (x) => x.id.toString() === id)[0].id;
        this.dispatchEvent(new CustomEvent('change'));
        this.hideModal();
      }
    }, true);

    this.shadowRoot.querySelector('#search').addEventListener('keyup', () => {
      this.updateSearch();
    });

    // this.shadowRoot.querySelector('#ok').addEventListener('click', () => {
      // const login = this.shadowRoot.querySelector('#name').value;
      // const password = this.shadowRoot.querySelector('#password').value;
      // if (login && password) {
        // this.dispatchEvent(new CustomEvent('submit', { detail: { login, password }}));
      // }
    // });
  }

  hideModal() {
    this.shadowRoot.querySelector('transistorsoft-modal').hideModal();
  }

  updateSearch() {
    console.info('update')
    const search = this.shadowRoot.querySelector('#search').value;
    const items = this.companies.filter( (x) => !search ? true : x.name.toLowerCase().indexOf(search.toLowerCase()) !== -1).slice(0, 100);
    const divContent = items.map( (item) => `
      <div data-id="${item.id}" class="${item.id.toString() === this.company ? 'selected' : ''}">${item.name}</div>
    `).join('');
    this.shadowRoot.querySelector('#items').innerHTML = divContent;
  }

  get company() {
    return this._company;
  }

  set company(value) {
    const item = this._companies.filter( (x) => x.id === value)[0];
    this._company = item ? item.id : '';
    this.shadowRoot.querySelector('#company').innerText = item ? item.name : 'Select a company ...';
    this.updateSearch();
  }

  get companies() {
    return this._companies;
  }

  set companies(value) {
    this._companies = value;
    this.company = this._company;
    this.updateSearch();
  }

}

window.customElements.define('transistorsoft-company', TransistorSoftCompany);
