class TransistorSoftModal extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.shadowRoot.innerHTML = `
		<style>
			/* The Modal (background) */
			.modal {
				display: none;
				position: fixed;
				z-index: 1;
				padding-top: 100px;
				left: 0;
				top: 0;
				width: 100%;
				height: 100%;
				overflow: auto;
				background-color: rgba(0,0,0,0.4);
			}

			/* Modal Content */
			.modal-content {
				position: relative;
				background-color: #fefefe;
				margin: auto;
				padding: 12px;
				border: 1px solid #888;
				width: 400px;
				text-align: center;
				box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0,0.19);
				-webkit-animation-name: animatetop;
				-webkit-animation-duration: 0.4s;
				animation-name: animatetop;
	 			animation-duration: 0.4s;
        font-family: Roboto, sans-serif;
			}

			/* Add Animation */
			@-webkit-keyframes animatetop {
				from {top:-300px; opacity:0}
				to {top:0; opacity:1}
			}

			@keyframes animatetop {
				from {top:-300px; opacity:0}
				to {top:0; opacity:1}
			}

			.modal-body {padding: 2px 16px; margin: 20px 2px}

		</style>
		<div class="modal">
			<div class="modal-content">
				<div class="modal-header">
					<slot name="header"><h3>Default Heading</h3></slot>
				</div>
				<div class="modal-body">
					<slot name="message">Default Text</slot>
				</div>
			</div>
		</div>
		`
	}

	connectedCallback() {
		this.modal = this.shadowRoot.querySelector(".modal");
    this.modal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideModal();
      }
    } , true);

    document.addEventListener('keydown',  (evt) => {
      evt = evt || window.event;
      if (evt.keyCode == 27) {
        this.hideModal();
      }
    }, true);
  }

	showModal() {
		this.modal.style.display = 'block';
	}

	hideModal() {
		this.modal.style.display = 'none';
	}
}
customElements.define('transistorsoft-modal',TransistorSoftModal);
