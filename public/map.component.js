import MarkerClusterer from './MarkerClusterer.js';
import { COLORS } from './utils.js';

export class TransistorSoftMap extends HTMLElement {

  // attributes:

  constructor() {
    super();

    // default properties
    this._locations = [];
    this._selected = null;
    this._showPolyline = true;
    this._showMarkers = true;
    this._showGeofenceHits = true;
    this._useClustering = true;

    this._currentLocation = null;
    this._watchMode = false;
    this._showGeofenceHits = true;

    // internal properties
    this.motionChangePolylines = [];
    this.markers = [];
    this.geofenceHitMarkers = [];
    this.selectedMarker = null;

    // bind handlers to this
    this.onBoundChange = this.onBoundChange.bind(this);
    this.onSelectLocation = this.onSelectLocation.bind(this);
    this.onClusterClick = this.onClusterClick.bind(this);

    this.selectionChangeEvent = new CustomEvent('selectionchange');


    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `
      <style> :host { display: block } </style>
      <div style="width: 100%; height: 100%; "></div>
      `;

    this.gmap = new google.maps.Map(shadowRoot.querySelector('div'), {
      center: { lat: -34.397, lng: 150.644 },
      zoom: 8,
    });

    this.onMapLoaded();

  }

  connectedCallback() {

  }

  // properties
  set locations(value) {
    this._locations = value;
    this.renderMarkers();
  }
  get locations() {
    return this._locations;
  }

  set watchMode(value) {
    this._watchMode = value;
    this.renderMarkers();
  }

  get watchMode() {
    return this._watchMode;
  }

  set currentLocation(value) {
    this._currentLocation = value;
  }
  get currentLocation() {
    return this._currentLocation;
  }

  set showMarkers(value) {
    this._showMarkers = value;
    this.renderMarkers();
  }
  get showMarkers() {
    return this._showMarkers;
  }

  set showGeofenceHits(value) {
    this._showGeofenceHits = value;
    this.renderMarkers();
  }
  get showGeofenceHits() {
    return this._showGeofenceHits;
  }

  set showPolyline(value) {
    this._showPolyline = value;
    this.renderMarkers();
  }
  get showPolyline() {
    return this._showPolyline;
  }

  set useClustering(value) {
    this._useClustering = value;
    this.renderMarkers();
  }
  get useClustering() {
    return this._useClustering;
  }

  set selected(value) {
    this._selected = value;
    this.renderMarkers();
  }

  get selected() {
    return this._selected;
  }

  fitBounds() {
    const locations = this.locations;
    if (locations.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((location) => {
        bounds.extend(new google.maps.LatLng(location.latitude, location.longitude));
      });
      this.gmap.fitBounds(bounds);
    } else if (locations.length === 1) {
      const [location] = locations;
      this.gmap.setCenter(new google.maps.LatLng(location.latitude, location.longitude));
    }
  }

  onBoundChange() {
    console.time('onBoundChange');

    // const bound = this.gmap.getBounds();

    // this.markers
      // .filter((x) => !!x.getMap())
      // .forEach((x) => {
        // x.setVisible(bound.contains(x.getPosition()));
      // });

    console.timeEnd('onBoundChange');

  }

  onMapLoaded() {
    // Route polyline
    const seq = {
      repeat: '50px',
      icon: {
        path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
        scale: 1,
        fillOpacity: 0,
        strokeColor: COLORS.white,
        strokeWeight: 1,
        strokeOpacity: 1,
      },
    };

    this.polyline = new google.maps.Polyline({
      map: this.gmap,
      zIndex: 1,
      geodesic: true,
      strokeColor: COLORS.polyline_color,
      strokeOpacity: 0.6,
      strokeWeight: 8,
      icons: [seq],
    });

    // Blue current location marker
    this.currentLocationMarker = new google.maps.Marker({
      zIndex: 10,
      map: this.gmap,
      title: 'Current Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: COLORS.blue,
        fillOpacity: 1,
        strokeColor: COLORS.white,
        strokeOpacity: 1,
        strokeWeight: 6,
      },
    });
    // Light blue location accuracy circle
    this.locationAccuracyCircle = new google.maps.Circle({
      map: this.gmap,
      zIndex: 9,
      fillColor: COLORS.light_blue,
      fillOpacity: 0.4,
      strokeOpacity: 0,
    });

    google.maps.event.addListener(this.gmap, 'bounds_changed', this.onBoundChange);

    this.renderMarkers();

  }

  onClusterClick(cluster) {
    const markers = cluster.getMarkers();
    markers.forEach((x) => x.setMap(this.gmap) && x.setVisible(true));
    cluster.remove();
  }

  buildLocationIcon(location, options = {}) {
    let anchor;
    let fillColor = COLORS.polyline_color;
    let scale = options.scale || 2;
    let path = google.maps.SymbolPath.FORWARD_CLOSED_ARROW;

    if (location.geofence) {
      path = google.maps.SymbolPath.FORWARD_CLOSED_ARROW;
      anchor = new google.maps.Point(0, 2.6);
      scale = 3;
      switch (location.geofence.action) {
        case 'ENTER':
          fillColor = COLORS.green;
          break;
        case 'EXIT':
          fillColor = COLORS.red;
          break;
        case 'DWELL':
          fillColor = COLORS.gold;
          break;
        default:
      }
    }
    let fillOpacity = 1;

    if (location.event === 'motionchange') {
      if (!location.is_moving) {
        anchor = undefined;
        path = google.maps.SymbolPath.CIRCLE;
        scale = 10;
        fillOpacity = 0.7;
        fillColor = COLORS.red;
      } else {
        path = google.maps.SymbolPath.FORWARD_OPEN_ARROW;
        fillColor = COLORS.green;
        scale = 3;
        fillOpacity = 1;
      }
    }
    if (options.selected) {
      scale *= 2;
    }

    return {
      path,
      rotation: location.heading,
      scale,
      anchor,
      fillColor: options.fillColor || fillColor,
      fillOpacity: options.fillOpacity || fillOpacity,
      strokeColor: options.strokeColor || COLORS.black,
      strokeWeight: options.strokeWeight || 1,
      strokeOpacity: options.strokeOpacity || 1,
    };
  }

  fitBoundsIfPostponed () {
    if (this.postponedFitBoundsPayload) {
      this.fitBounds(this.postponedFitBoundsPayload);
      this.postponedFitBoundsPayload = null;
    }
  }

  cleanClustering () {
    !!this.markerCluster && this.markerCluster.clearMarkers();
    this.markerCluster = null;
  }

  clustering () {
    const { useClustering, showMarkers } = this;
    if (
      !showMarkers ||
      !useClustering ||
      !this.gmap
    ) {
      return;
    }
    console.time('clustering');
    this.markerCluster = new MarkerClusterer(
      this.gmap,
      this.markers,
      {
        maxZoom: 19,
        ignoreHidden: true,
        zoomOnClick: false,
        minimumClusterSize: 7,
        gridSize: 33,
        imagePath: '/images/m',
      },
    );
    google.maps.event.addListener(this.markerCluster, 'click', this.onClusterClick);
    console.timeEnd('clustering');
  }

  // ensures that selected location is properly displayed
  // previous marker is set to default icon, new marker or nothing is set to
  // selected icon
  updateSelectedLocation () {
    const selected = this.locations.filter( (x) => x.uuid === this.selected)[0];
    if (this.selectedMarker) {
      this.selectedMarker.setIcon(this.buildLocationIcon(this.selectedMarker.location));
      this.selectedMarker.setZIndex(1);
    }
    if (!selected) {
      this.selectedMarker = null;
      return;
    }

    let marker = this.markers.find((x) => x.location.uuid === selected.uuid);

    if (!marker) {
      marker = this.geofenceHitMarkers.find((x) => x.location && x.location.uuid === selected.uuid);
    }

    if (marker) {
      this.selectedMarker = marker;
      // marker.setFillColor('#000000');
      marker.setZIndex(100);
      marker.setIcon(
        this.buildLocationIcon(selected, {
          strokeColor: COLORS.red,
          strokeWeight: 2,
          selected: true,
        }),
      );
    }
  }

  buildMotionChangePolyline (stationaryPosition, movingPosition) {
    const { showPolyline } = this;
    const seq = {
      repeat: '25px',
      icon: {
        path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
        scale: 1,
        fillColor: COLORS.white,
        fillOpacity: 0,
        strokeColor: COLORS.white,
        strokeWeight: 1,
        strokeOpacity: 1,
      },
    };
    return new google.maps.Polyline({
      map: showPolyline ? this.gmap : null,
      zIndex: 1001,
      geodesic: true,
      strokeColor: COLORS.green,
      fillColor: COLORS.red,
      icons: [seq],
      strokeOpacity: 1,
      strokeWeight: 8,
      path: [stationaryPosition, movingPosition],
    });
  }

  buildGeofenceMarker (location, options) {
    const { geofence } = location;
    let circle = this.geofenceMarkers[geofence.identifier];
    if (!circle) {
      let center;
      let radius = 200;
      // Detect polygon geofence:
      if (geofence.extras && geofence.extras.vertices && (geofence.extras.vertices.length > 0)) {
        const coords = geofence.extras.vertices.map((vertex) => {
          return {lat: vertex[0], lng: vertex[1]};
        });
        const bounds = new google.maps.LatLngBounds();
        for (var i=0; i < coords.length; i++) {
          bounds.extend(coords[i]);
        }
        center = bounds.getCenter();
        radius = google.maps.geometry.spherical.computeDistanceBetween(center, bounds.getNorthEast());
        this.geofenceHitMarkers.push(new google.maps.Polygon({
          map: options.map,
          getCenter: () => {
            return center;
          },
          getRadius: () => { return radius; },
          paths: coords,
          geodesic: true,
          strokeColor: COLORS.polyline_color,
          strokeOpacity: 0.8,
          strokeWeight: 5,
          fillColor: COLORS.green,
          fillOpacity: 0.2
        }));

        circle = new google.maps.Circle({
          zIndex: 2000,
          fillOpacity: 0,
          strokeColor: COLORS.black,
          strokeWeight: 1,
          strokeOpacity: 1,
          radius: radius,
          center: center,
          map: options.map,
        });
      } else {
        if (geofence.extras && geofence.extras.center) {
          center = new google.maps.LatLng(geofence.extras.center.latitude, geofence.extras.center.longitude);
          radius = geofence.extras.radius;
          if (typeof radius === 'string') {
            radius = parseInt(radius, 10);
          }
        } else {
          center = new google.maps.LatLng(location.latitude, location.longitude);
        }
        circle = new google.maps.Circle({
          zIndex: 2000,
          fillOpacity: 0,
          strokeColor: COLORS.black,
          strokeWeight: 1,
          strokeOpacity: 1,
          radius: radius,
          center: center,
          map: options.map,
        });
      }
    }
    this.geofenceMarkers[geofence.identifier] = circle;
    this.geofenceHitMarkers.push(circle);
    let color;
    if (geofence.action === 'ENTER') {
      color = COLORS.green;
    } else if (geofence.action === 'DWELL') {
      color = COLORS.gold;
    } else {
      color = COLORS.red;
    }
    const circleLatLng = circle.getCenter();
    const locationLatLng = new google.maps.LatLng(location.latitude, location.longitude);

    const heading = google.maps.geometry.spherical.computeHeading(circleLatLng, locationLatLng);
    const circleEdgeLatLng = google.maps.geometry.spherical.computeOffset(circleLatLng, circle.getRadius(), heading);

    const geofenceEdgeMarker = new google.maps.Marker({
      zIndex: 2000,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 5,
        fillColor: color,
        fillOpacity: 0.7,
        strokeColor: COLORS.black,
        strokeWeight: 1,
        strokeOpacity: 1,
      },
      map: options.map,
      position: circleEdgeLatLng,
    });
    this.geofenceHitMarkers.push(geofenceEdgeMarker);

    const locationMarker = this.buildLocationMarker(location, {
      showHeading: true,
      zIndex: 2000,
      map: options.map,
      fillColor: color,
    });
    this.geofenceHitMarkers.push(locationMarker);

    const polyline = new google.maps.Polyline({
      map: options.map,
      zIndex: 2000,
      strokeColor: COLORS.black,
      strokeOpacity: 1,
      strokeWeight: 1,
      path: [circleEdgeLatLng, locationMarker.getPosition()],
    });
    this.geofenceHitMarkers.push(polyline);
  }

  onSelectLocation(uuid) {
    console.info(`Location selected: ${uuid}`);
    this.selected = uuid;
    this.dispatchEvent(this.selectionChangeEvent);
  }

  // Build a bread-crumb location marker.
  buildLocationMarker (location, options = {}) {
    const { onSelectLocation } = this;
    const zIndex = options.zIndex || 1;
    const marker = new google.maps.Marker({
      zIndex,
      icon: this.buildLocationIcon(location, options),
      location,
      map: options.map,
      position: new google.maps.LatLng(location.latitude, location.longitude),
    });

    marker.addListener('click', () => onSelectLocation(location.uuid));
    return marker;
  }

  clearMarkers () {
    this.markers.forEach((marker) => {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    });
    this.markers = [];

    this.geofenceMarkers = {};
    this.geofenceHitMarkers.forEach((marker) => {
      marker.setMap(null);
    });
    this.geofenceHitMarkers = [];

    this.polyline.setPath([]);
    this.motionChangePolylines.forEach((polyline) => {
      polyline.setMap(null);
    });
    this.motionChangePolylines = [];
  }

  renderMarkers () {

    // do not call more often than once a second
    if (this._latestTimeOfRenderMarkers && this._latestTimeOfRenderMarkers + 1 * 1000 > new Date().getTime()) {
      setTimeout( () => this.renderMarkers(), 100);
      return;
    }



    // allow to assign properties all together before rendering
    if (!this._avoidImmediate) {
      setTimeout( () => this.renderMarkers(), 1);
      this._avoidImmediate = true;
      return;
    }

    // reset delay/buffering flags
    this._latestTimeOfRenderMarkers = new Date().getTime();
    this._avoidImmediate = false;

    // calculate update flags, which properties changed since last render

    const updateFlags = this.lastProps ? {
      needsMarkersRedraw: this.lastProps.locations !== JSON.stringify(this.locations.map( (x) => x.uuid)),
      needsShowMarkersUpdate: this.lastProps.showMarkers !== this.showMarkers || this.lastProps.useClustering !== this.useClustering,
      needsShowPolylineUpdate: this.lastProps.showPolyline !== this.showPolyline,
      needsShowGeofenceHitsUpdate: this.lastProps.showGeofenceHits !== this.showGeofenceHits
    } : {
      needsMarkersRedraw: true,
      needsTestMarkersRedraw: true,
      needsShowMarkersUpdate: true,
      needsShowPolylineUpdate: true,
      needsShowGeofenceHitsUpdate: true
    };

    this.lastProps = {
      locations: JSON.stringify(this.locations.map( (x) => x.uuid)),
      showMarkers: this.showMarkers,
      useClustering: this.useClustering,
      showPolyline: this.showPolyline,
      showGeofenceHits: this.showGeofenceHits
    }

    console.time('renderMarkers');
    const {
      currentLocation,
      watchMode,
      locations,
      showGeofenceHits,
      showMarkers,
      showPolyline
    } = this;

    if (updateFlags.needsMarkersRedraw) {
      this.clearMarkers();
      this.cleanClustering();

      const { length } = locations;
      console.info(`draw markers: ${length}`);

      this.polyline.setMap(showPolyline ? this.gmap : null);

      let motionChangePosition = null;
      let searchingForMotionChange = false;

      for (let n = length - 1; n > 0; n--) {
        const location = locations[n];
        const latLng = new google.maps.LatLng(location.latitude, location.longitude);
        if (location.geofence) {
          this.buildGeofenceMarker(location, { map: showGeofenceHits ? this.gmap : null });
        } else {
          const marker = this.buildLocationMarker(location, { map: showMarkers ? this.gmap : null });
          this.markers.push(marker);
        }
        this.polyline.getPath().push(latLng);

        if (location.event === 'motionchange') {
          if (!location.is_moving) {
            searchingForMotionChange = true;
            motionChangePosition = latLng;
          } else if (searchingForMotionChange) {
            searchingForMotionChange = false;
            this.motionChangePolylines.push(this.buildMotionChangePolyline(motionChangePosition, latLng));
          }
        }
      }
      this.clustering();
    } else {
      // keep existing markers - just update their visibility
      console.time('renderMarkers: Visibility');
      if (updateFlags.needsShowMarkersUpdate) {

        this.markers.forEach((marker) => {
          marker.setMap(showMarkers ? this.gmap : null);
        });

        if (showMarkers) {
          if (this.useClustering) {
            if (!this.markerCluster) {
              this.clustering();
            }
          } else {
            this.cleanClustering();
            this.markers.forEach((marker) => {
              marker.setMap(this.gmap) && marker.setVisible(true);
            });
          }
        }
      }
      if (updateFlags.needsShowPolylineUpdate) {
        this.polyline.setMap(showPolyline ? this.gmap : null);
        this.motionChangePolylines.forEach((polyline) => {
          polyline.setMap(showPolyline ? this.gmap : null);
        });
      }
      if (updateFlags.needsShowGeofenceHitsUpdate) {
        this.geofenceHitMarkers.forEach(marker => {
          marker.setMap(showGeofenceHits ? this.gmap : null);
        });
      }
      console.timeEnd('renderMarkers: Visibility');
    }

    // handle current location
    if (watchMode && currentLocation) {
      console.time('renderMarkers: Current Location');
      const latLng = new google.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
      this.gmap.setCenter(latLng);
      this.currentLocationMarker.setMap(this.gmap);
      this.locationAccuracyCircle.setMap(this.gmap);
      this.currentLocationMarker.setPosition(latLng);
      this.locationAccuracyCircle.setCenter(latLng);
      this.locationAccuracyCircle.setRadius(currentLocation.accuracy);
      console.timeEnd('renderMarkers: Current Location');
    } else {
      this.currentLocationMarker.setMap(null);
      this.locationAccuracyCircle.setMap(null);
    }

    // draw selectedMarker
    console.time('renderMarkers: Selected Location');
    this.updateSelectedLocation();

    console.timeEnd('renderMarkers: Selected Location');
    console.timeEnd('renderMarkers');
  }

  // add a single test marker
  addTestMarker (record) {
    const position = new google.maps.LatLng(record.lat, record.lng);
    if (record.type === 'location') {
      // eslint-disable-next-line no-new
      new google.maps.Marker({
        position: position,
        map: this.gmap,
        label: record.label,
      });
    } else if (record.type === 'geofence') {
      new google.maps.Circle({
        zIndex: 2000,
        fillOpacity: 0,
        strokeColor: '#ff0000',
        strokeWeight: 1,
        strokeOpacity: 1,
        radius: record.radius,
        center: position,
        map: this.gmap,
      });
    }
    // arbitrarily center on first marker.
    this.gmap.setCenter(position);
  }

}
window.customElements.define('transistorsoft-map', TransistorSoftMap);
