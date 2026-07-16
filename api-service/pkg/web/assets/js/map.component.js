import MarkerClusterer from './MarkerClusterer.js';
import { COLORS } from './utils.js';


function waitForGoogleMaps() {
	if (window.google && window.google.maps && typeof window.google.maps.importLibrary === 'function') {
		return Promise.resolve();
	}
	if (!window.__googleMapsReady) {
		window.__googleMapsReady = new Promise((resolve) => {
			const check = () => {
				if (window.google && window.google.maps && typeof window.google.maps.importLibrary === 'function') {
					resolve();
				} else {
					setTimeout(check, 50);
				}
			};
			check();
		});
	}
	return window.__googleMapsReady;
}

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

		this.pendingLocations = [];
		this.centeredOnce = false;
		this.userAdjustedView = false;
		this.updatingView = false;
		this.postponedFitBounds = false;

		const shadowRoot = this.attachShadow({mode: 'open'});
		shadowRoot.innerHTML = `
		  <style> :host { display: block } </style>
		  <div class="map-root" style="width: 100%; height: 100%; "></div>
		  `;
		this.mapContainer = shadowRoot.querySelector('.map-root');

	waitForGoogleMaps().then(() => this.initializeMap());

	}

  connectedCallback() {

  }

  // properties
	set locations(value) {
		this._locations = Array.isArray(value) ? value : [];
		if (!this.gmap) {
			this.pendingLocations = this._locations;
			this.postponedFitBounds = true;
			return;
		}
		this.renderMarkers();
		this.fitBounds(!this.userAdjustedView);
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
		if (this.gmap) {
			this.renderMarkers();
		}
	}
  get showMarkers() {
    return this._showMarkers;
  }

	set showGeofenceHits(value) {
		this._showGeofenceHits = value;
		if (this.gmap) {
			this.renderMarkers();
		}
	}
  get showGeofenceHits() {
    return this._showGeofenceHits;
  }

	set showPolyline(value) {
		this._showPolyline = value;
		if (this.gmap) {
			this.renderMarkers();
		}
	}
  get showPolyline() {
    return this._showPolyline;
  }

	set useClustering(value) {
		this._useClustering = value;
		if (this.gmap) {
			this.renderMarkers();
		}
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

	fitBounds(force = false) {
		if (!this.gmap) {
			this.postponedFitBounds = true;
			return;
		}
		if (!force && this.userAdjustedView) {
			return;
		}
		const locations = this.locations || [];
		if (locations.length === 0) {
			return;
		}
		if (locations.length > 1) {
			this.startProgrammaticViewChange();
			const bounds = new google.maps.LatLngBounds();
			locations.forEach((location) => {
				bounds.extend(new google.maps.LatLng(location.latitude, location.longitude));
			});
			this.gmap.fitBounds(bounds);
		} else if (locations.length === 1) {
			const [location] = locations;
			this.startProgrammaticViewChange();
			this.gmap.setCenter(new google.maps.LatLng(location.latitude, location.longitude));
		}
	}

	async initializeMap() {
		if (!this.mapContainer) {
			return;
		}
	try {
			const { Map } = await google.maps.importLibrary('maps');
			await google.maps.importLibrary('geometry');
			this.gmap = new Map(this.mapContainer, {
				center: { lat: -34.397, lng: 150.644 },
				zoom: 8,
				// Show the on-screen +/- zoom buttons (don't rely on scroll/keyboard).
				zoomControl: true,
				zoomControlOptions: {
					position: google.maps.ControlPosition.RIGHT_BOTTOM,
				},
			});
		} catch (err) {
			console.error('initializeMap failed', err);
			return;
		}
	this.onMapLoaded();
	this.gmap.addListener('zoom_changed', () => {
		if (!this.updatingView) {
			this.userAdjustedView = true;
		}
	});
	this.gmap.addListener('dragstart', () => {
		if (!this.updatingView) {
			this.userAdjustedView = true;
		}
	});
		if (this.pendingLocations && this.pendingLocations.length) {
			this.locations = this.pendingLocations;
			this.pendingLocations = [];
		} else {
			this.centerToUserOrFallback();
		}
		this.fitBoundsIfPostponed();
	}

	centerToUserOrFallback() {
		if (this.centeredOnce || !this.gmap) {
			return;
		}
		this.centeredOnce = true;
		const fallback = { lat: 40.7128, lng: -74.0060 };
	const applyCenter = (coords, zoom = 12) => {
		this.startProgrammaticViewChange();
		this.gmap.setCenter(coords);
		this.gmap.setZoom(zoom);
	};
		if (this.locations && this.locations.length > 0) {
			this.fitBounds();
			return;
		}
		if (!navigator.geolocation) {
			applyCenter(fallback, 4);
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(position) => {
				applyCenter({ lat: position.coords.latitude, lng: position.coords.longitude }, 12);
			},
			() => applyCenter(fallback, 4),
			{ timeout: 5000 }
		);
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

    const heading = resolveHeading(location);

    const icon = {
      path,
      scale,
      anchor,
      fillColor: options.fillColor || fillColor,
      fillOpacity: options.fillOpacity || fillOpacity,
      strokeColor: options.strokeColor || COLORS.black,
      strokeWeight: options.strokeWeight || 1,
      strokeOpacity: options.strokeOpacity || 1,
    };
    if (heading !== null) {
      icon.rotation = heading;
    }
    return icon;
  }

	fitBoundsIfPostponed () {
		if (this.postponedFitBounds) {
			this.postponedFitBounds = false;
			this.fitBounds(true);
		}
	}

	resetView() {
		this.userAdjustedView = false;
		this.centeredOnce = false;
		this.fitBounds(true);
	}

	startProgrammaticViewChange() {
		if (!this.gmap) {
			return;
		}
		this.updatingView = true;
		google.maps.event.addListenerOnce(this.gmap, 'idle', () => {
			this.updatingView = false;
		});
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
        imagePath: '/dashboard/assets/images/m',
      },
    );
    google.maps.event.addListener(this.markerCluster, 'click', this.onClusterClick);
    console.timeEnd('clustering');
  }

  // ensures that selected location is properly displayed
  // previous marker is set to default icon, new marker or nothing is set to
  // selected icon
  updateSelectedLocation () {
    const selected = this.getSelectedLocation();
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
      marker.setZIndex(100);
      marker.setIcon(
        this.buildLocationIcon(selected, {
          strokeColor: COLORS.red,
          strokeWeight: 2,
          selected: true,
        }),
      );
      this.centerOnLocation(selected);
    }
  }

  getSelectedLocation () {
    const selected = String(this.selected || '').trim();
    if (!selected) {
      return null;
    }
    return this.locations.find((location) => {
      const uuid = String(location?.uuid || '').trim();
      const id = String(location?.id || '').trim();
      return uuid === selected || id === selected;
    }) || null;
  }

  centerOnLocation (location) {
    if (!this.gmap || !location) {
      return;
    }
    const latLng = new google.maps.LatLng(location.latitude, location.longitude);
    this.startProgrammaticViewChange();
    this.gmap.panTo(latLng);
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
    const location = (this.locations || []).find((loc) => loc.uuid === uuid) || null;
    this.dispatchEvent(new CustomEvent('locationselect', {
      detail: { uuid, location },
      bubbles: true,
    }));
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
		if (!this.gmap) {
			return;
		}
		if (!this.gmap) {
			return;
		}

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

	if (!watchMode && updateFlags.needsMarkersRedraw) {
		this.fitBounds();
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

    // handle current location marker (watch mode uses real-time currentLocation, otherwise latest point)
    const latestLocation = locations.length > 0 ? locations[0] : null;
    const locationToShow = watchMode ? currentLocation : latestLocation;

	if (locationToShow) {
		console.time('renderMarkers: Current Location');
		const latLng = new google.maps.LatLng(locationToShow.latitude, locationToShow.longitude);
		if (watchMode) {
			this.startProgrammaticViewChange();
			this.gmap.setCenter(latLng);
		}
      this.currentLocationMarker.setMap(this.gmap);
      this.locationAccuracyCircle.setMap(this.gmap);
      this.currentLocationMarker.setPosition(latLng);
      this.locationAccuracyCircle.setCenter(latLng);
      if (locationToShow.accuracy) {
      	this.locationAccuracyCircle.setRadius(locationToShow.accuracy);
      }
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

function resolveHeading(location) {
  if (!location) {
    return null;
  }
  const coords = normalizeCoords(location.coords);
  const nestedCoords = normalizeCoords(location.location?.coords);
  const candidates = [
    location.heading,
    location.bearing,
    location.course,
    location.direction,
    coords?.heading,
    coords?.bearing,
    coords?.course,
    coords?.direction,
    location.location?.heading,
    location.location?.bearing,
    location.location?.course,
    location.location?.direction,
    nestedCoords?.heading,
    nestedCoords?.bearing,
    nestedCoords?.course,
    nestedCoords?.direction,
    location.extras?.heading,
    location.extras?.bearing,
    location.extras?.course,
    location.extras?.direction,
  ];
  for (const value of candidates) {
    const heading = toFiniteNumber(value);
    if (heading !== null) {
      const normalized = normalizeHeading(maybeConvertRadians(heading));
      if (normalized >= 0) {
        return normalized;
      }
    }
  }
  return null;
}

function normalizeCoords(coords) {
  if (!coords) {
    return null;
  }
  if (typeof coords === 'string') {
    try {
      const parsed = JSON.parse(coords);
      return typeof parsed === 'object' && parsed ? parsed : null;
    } catch {
      return null;
    }
  }
  return coords;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  let num = null;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    num = trimmed === '' ? NaN : parseFloat(trimmed);
  } else {
    num = Number(String(value).trim());
  }
  if (!Number.isFinite(num)) {
    return null;
  }
  return num;
}

function maybeConvertRadians(value) {
  if (Math.abs(value) <= Math.PI * 2) {
    return value * (180 / Math.PI);
  }
  return value;
}

function normalizeHeading(value) {
  if (!Number.isFinite(value)) {
    return -1;
  }
  if (value < 0) {
    return -1;
  }
  let heading = value % 360;
  if (heading < 0) {
    return -1;
  }
  return heading;
}

window.customElements.define('transistorsoft-map', TransistorSoftMap);
