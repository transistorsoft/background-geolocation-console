const template = `
      <style>
        :host {
          display: block;
          box-sizing: border-box;
          overflow-y: scroll;
          overflow-x: scroll;
          font-family: Roboto, sans-serif;
        }

      table {
        font-size: 13px;
        table-layout: fixed;
        border-collapse: collapse;
        width: 1280px;
        position: relative;
      }

      thead th {
        text-align: center;
        color: rgba(0, 0, 0, 0.54);
        font-size: 12px;
        font-weight: 500;
        height: 48px;
        line-height: 24px;
        text-overflow: ellipsis;
        position: sticky;
      }

      ${[180,80,80,80,90,90,80,90,180,80,140,80].map( (width, index) => (
        `thead th:nth-child(${index + 1}) { width: ${width}px; } `
      )).join('\n')}

      tbody tr {
        color: rgba(0, 0, 0, 0.87);
        height: 48px;
      }

      tbody tr:hover {
        background: #eee;
      }

      tbody tr.selected {
        background: #ccc;
      }

      tbody tr td {
        text-align: center;
        height: 48px;
        position: relative;
      }

      tbody tr td span {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translateX(-55%) translateY(-50%);
        width: 90%;
        display: block;
      }

      .red {
        background-color: #FE381E;
        color: #fff;
      }
      .green {
        background-color: #16BE42;
        color: #fff;
      }
      #warning {
        position: absolute;
        width: 100%;
        text-align: center;
        font-weight: bold;
        left: 0%;
        top: -2px;
      }

      </style>
      <table>
        <thead>
          <tr>
            <th>UUID</th>
            <th>RECORDED AT</th>
            <th>AGE (ms)</th>
            <th>CREATED AT</th>
            <th>COORDINATE</th>
            <th>ACCURACY (m)</th>
            <th>SPEED (m/s)</th>
            <th>ODOMETER (m)</th>
            <th class="event">EVENT</th>
            <th>IS MOVING</th>
            <th>ACTIVITY</th>
            <th>BATTERY</th>
          </tr>
        </thead>
        <tbody>

        </tbody>
      </table>
      <div id="warning" style="visibility: hidden;"><span>You are in the Watch mode. Only the latest location is being displayed here</span></div>
`;
export class TransistorSoftList extends HTMLElement {
  constructor() {
    super();

    this._currentLocation = null;
    this._watchMode = false;
    this._locations = [];
    this._selected = null;

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = template;

    this.warningEl = this.shadowRoot.querySelector('#warning');

    this.selectionChangeEvent = new CustomEvent('selectionchange');

    shadowRoot.querySelector('tbody').addEventListener('click', (e) => {
      const tr = e.target.closest('tr');
      if (tr) {
        const uuid = tr.getAttribute('data-row-id');
        this.onSelectLocation(uuid);
      }
    }, true);

  }

  set locations(value) {
    this._locations = value;
    this.renderList();
    this.updateSelection();
  }

  get locations() {
    return this._locations;
  }

  set selected(uuid) {
    this._selected = uuid;
    this.updateSelection();
  }

  get selected() {
    return this._selected;
  }

  get watchMode() {
    return this._watchMode;
  }

  set watchMode(value) {
    this._watchMode = value;
    this.renderList();
    this.updateSelection();
    this.warningEl.style.visibility = value ? '' : 'hidden';
  }

  get currentLocation() {
    return this._currentLocation;
  }

  set currentLocation(value) {
    this.renderList();
    this._currentLocation = value;
  }

  onSelectLocation(uuid) {
    console.info(`Location selected: ${uuid}`);
    this.selected = uuid;
    this.dispatchEvent(this.selectionChangeEvent);
  }

  renderList() {

    const format = function(x) {
      const date = new Date(x);
      return date.toLocaleDateString('en-US', {month: 'numeric', day: 'numeric'}) + ' ' + (date.toTimeString('en-US').split(' ').shift()) + '.' + date.getMilliseconds();
    }

    const getRowData = function(location) {
      let event = location.event || '';
      if (location.extras) {
        // Analyze location.extras for helpful event information.
        if (location.extras.event) {
          // eg: extras: {event: "background-fetch"}
          event = location.extras.event;
        } else if (location.extras.getCurrentPosition) {
          // eg: extras: {getCurrentPosition: true}
          event = 'getCurrentPosition';
        }
      }

      switch (location.event) {
        case 'geofence':
          event = `${location.event
      }: ${
        location.geofence
          ? `${location.geofence.action} ${location.geofence.identifier}`
          : 'empty'}`;
          break;
        default:
      }
      return {
        uuid: location.uuid,
        device_id: +location.device_id,
        company_id: location.company_id,
        coordinate:
        `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        recorded_at: format(new Date(location.recorded_at)),
        age: location.age || '',  // <-- Older versions of the bg-geo SDK don't provide location.age
        created_at: format(new Date(location.created_at)),
        is_moving: location.is_moving ? 'true' : 'false',
        accuracy: location.accuracy,
        speed: location.speed,
        odometer: location.odometer,
        event,
        activity: `${location.activity_type} (${location.activity_confidence}%)`,
        battery_level: `${(location.battery_level * 100).toFixed(0)}%`,
        battery_is_charging: location.battery_is_charging,
      }
    };

    const ids = (items) => JSON.stringify( items.map( (item) => item.uuid));

    const itemsToDisplay = this.watchMode ? [this.currentLocation] : this.locations;

    if (ids(itemsToDisplay) === this.previousItemsToDisplay) {
      // exactly same data; nothing to update here
      return;
    }
    this.previousItemsToDisplay = ids(itemsToDisplay);



  const rowsHtml = `
        ${itemsToDisplay.map(function(location) {
          const item = getRowData(location);
          return `
            <tr data-row-id="${item.uuid}">
              <td>${item.uuid}</td>
              <td>${item.recorded_at}</td>
              <td>${item.age}</td>
              <td>${item.created_at}</td>
              <td>${item.coordinate}</td>
              <td>${item.accuracy}</td>
              <td>${item.speed}</td>
              <td>${item.odometer}</td>
              <td>
                <strong>${item.event}</strong>
              </td>
              <td>${item.is_moving}</td>
              <td>${item.activity}</td>
              <td>
              <span class="${item.battery_is_charging ? 'green' : 'red'}">
                ${item.battery_level}
              </span>
              </td>
            </tr>
          `;
        }).join('')}
  `;

  this.shadowRoot.querySelector('tbody').innerHTML = rowsHtml;


  }

  updateSelection() {
    const selected = this.shadowRoot.querySelectorAll('tr.selected');
    for (let tr of selected) {
      tr.classList.remove('selected');
    }

    if (this.selected) {
      const tr = this.shadowRoot.querySelector(`tr[data-row-id="${this.selected}"]`);
      if (tr) {
        tr.classList.add('selected');
        // scroll into view
        const hostRect = this.shadowRoot.host.getBoundingClientRect();
        const trRect = tr.getBoundingClientRect();
        const shouldScrollDown = trRect.bottom < hostRect.top;
        const shouldScrollUp = trRect.top > hostRect.bottom;
        if (shouldScrollDown) {
          tr.scrollIntoView();
        }
        if (shouldScrollUp) {
          tr.scrollIntoView();
        }
      }
    }
  }
}
window.customElements.define('transistorsoft-list', TransistorSoftList);
