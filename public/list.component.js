export function updateComponent(gridEl, locations) {
  const format = function(x) {
    const date = new Date(x);
    return date.toISOString().substring(5, 23).replace('T', ' ').replace('.', ':')
  }

  const getRowData = function(location) {
    let event = location.event || '';
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

  const html = `
      <div className="list">
        <div className = "header">
          <span>UUID</span>
          <span>RECORDED AT</span>
          <span>CREATED AT</span>
          <span>COORDINATE</span>
          <span>ACCURACY</span>
          <span>SPEED</span>
          <span>ODOMETER</span>
          <span>EVENT</span>
          <span>IS MOVING</span>
          <span>ACTIVITY</span>
          <span>BATTERY</span>
        </div>
        <div className="rows">
        ${locations.map(function(location) {
          const item = getRowData(location);
          return `
            <div>
              <span>${item.uuid}</span>
              <span>${item.recorded_at}</span>
              <span>${item.created_at}</span>
              <span>${item.coordinate}</span>
              <span>${item.accuracy}</span>
              <span>${item.speed}</span>
              <span>${item.odometer}</span>
              <span>
                <strong>${item.event}</strong>
              </span>
              <span>${item.is_moving}</span>
              <span>${item.activity}</span>
              <span class="
                ${item.battery_is_charging
                ? 'tableCellGreen'
                : 'tableCellRed'}
              ">${item.battery_level}</span>
            </div>
          `;
        }).join('')}
  `;
  gridEl.innerHTML = html;
}
