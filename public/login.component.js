import './modal.component.js';
export class TransistorSoftLogin extends HTMLElement {
  constructor() {
    super();
    const template = `
  <style>
    .form {
      text-align: left;
    }

    .form > div {
      margin: 10px 0;
    }

    .form label {
      width: 100px;
      display: inline-block;
    }

    .form input {
      height: 20px;
      width: 250px;
    }

    .modal-buttons {

    }

    .modal-buttons button {
      width: 100%;
      height: 30px;
      background: #3f51b5;
      color: white;
      border: none;
      border-radius: 3px;
    }

    .modal-buttons button:active {
      width: 100%;
      height: 30px;
      background: #1f3195;
    }

  </style>
  <button id="login">LOGIN</button>
  <transistorsoft-modal>
    <h1 slot="header">Sign in</h1>
    <div slot="message">
      <div class="form">
        <div>
          <label for="name">Name:</label>
          <input type="text" id="name">
        </div>
        <div>
          <label for="password">Password:</label>
          <input type="password" id="password">
        </div>
        <div class="modal-buttons">
          <button id="ok">LOGIN</button>
        </div>
      </div>
    </div>

    </div>
  </transistorsoft-modal>
`;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

    this.shadowRoot.querySelector('#login').addEventListener('click', () => {
      this.shadowRoot.querySelector('transistorsoft-modal').showModal();
    });

    this.shadowRoot.querySelector('#ok').addEventListener('click', () => {
      const name = this.shadowRoot.querySelector('#name').value;
      const password = this.shadowRoot.querySelector('#password').value;
      if (name && password) {
        this.dispatchEvent(new CustomEvent('submit', { detail: { name, password }}));
      }
    });
  }
}

window.customElements.define('transistorsoft-login', TransistorSoftLogin);
