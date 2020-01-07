/* eslint-disable no-console */
// @flow
/* eslint-disable camelcase */

import React, { Component } from 'react';
import { createSelector } from 'reselect';
import GoogleMap from 'google-map-react';
import { connect } from 'react-redux';

import {
  type Location, type Marker, clickMarker,
} from 'reducer/dashboard';
import { type GlobalState } from 'reducer/state';
import {
  changeTabBus, fitBoundsBus, type FitBoundsPayload,
} from 'globalBus';

import { COLORS, MAX_POINTS } from '../constants';

import MarkerClusterer from './MarkerClusterer';

const API_KEY = window.GOOGLE_MAPS_API_KEY || 'AIzaSyA9j72oZA5SmsA8ugu57pqXwpxh9Sn4xuM';

declare var google: any;
type StateProps = {|
  currentLocation: ?Location,
  enableClustering: boolean,
  isActiveTab: boolean,
  isWatching: boolean,
  locations: Location[],
  selectedLocation: ?Location,
  showGeofenceHits: boolean,
  showMarkers: boolean,
  showPolyline: boolean,
  testMarkers: Object,
|};

type DispatchProps = {|
  onSelectLocation: string => any,
|};

type Props = {|
  ...StateProps,
  ...DispatchProps,
  open: boolean,
|};

type MapState = {|
  center: {| lat: number, lng: number |},
  zoom?: number,
|};

class MapView extends Component<Props, MapState> {
  previousLocations: Location[] = [];
  motionChangePolylines: any = [];
  selectedMarker: any = null;
  geofenceMarkers: any = {};
  geofenceHitMarkers: any = [];
  markers: Marker[] = [];
  gmap: any = null;
  polyline: any = null;
  currentLocationMarker: any = null;
  locationAccuracyCircle: any = null;
  updateFlags = {
    needsMarkersRedraw: true,
    needsTestMarkersRedraw: true,
    needsShowMarkersUpdate: true,
    needsShowPolylineUpdate: true,
    needsShowGeofenceHitsUpdate: true,
  };
  postponedFitBoundsPayload: ?FitBoundsPayload = null;

  constructor(props: Props, context: any) {
    super(props, context);

    this.state = {
      center: { lat: -25.363882, lng: 131.044922 },
      // zoom: 18,
    };
  }

  componentDidMount () {
    fitBoundsBus.subscribe(this.fitBounds);
    changeTabBus.subscribe(this.changeTab);
  }

  componentWillUnmount () {
    fitBoundsBus.unsubscribe(this.fitBounds);
    changeTabBus.unsubscribe(this.changeTab);
  }

  changeTab = () => {
    const { isActiveTab } = this.props;
    if (isActiveTab) {
      setTimeout(() => this.fitBoundsIfPostponed(), 1);
    }
  };

  // Fit Bounds, postpone if gmap is not ready, also postpone if tab is not active
  fitBounds = (payload: FitBoundsPayload) => {
    const { isActiveTab, locations } = this.props;
    if (!isActiveTab) {
      this.postponedFitBoundsPayload = payload;
      return;
    }
    if (this.gmap) {
      if (locations.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        locations.forEach((location: Location) => {
          bounds.extend(new google.maps.LatLng(location.latitude, location.longitude));
        });
        this.gmap.fitBounds(bounds);
      } else if (locations.length === 1) {
        const [location] = locations;
        this.gmap.setCenter(new google.maps.LatLng(location.latitude, location.longitude));
      }
    } else {
      setTimeout(() => this.fitBounds(payload), 1000);
    }
  };

  onBoundChange = () => {
    console.time('onBoundChange');
    const bound = this.gmap.getBounds();
    this.markers
      .filter((x: Marker) => !!x.getMap()/* && !!x.getVisible() */)
      .forEach((x: Marker) => {
        x.setVisible(bound.contains(x.getPosition()));
        // x.setMap(
        //   bound.contains(x.getPosition())
        //     ? this.gmap
        //     : null
        // );
      });
    // const gridSize = this.gmap.getDiv().offsetWidth / 10;
    // this.markerCluster && this.markerCluster.setGridSize(gridSize);
    console.timeEnd('onBoundChange');
  }

  onMapLoaded = (event: any) => {
    this.gmap = event.map;
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
  };

  onClusterClick = (cluster: any) => {
    const markers = cluster.getMarkers();
    markers.forEach((x: Marker) => x.setMap(this.gmap) && x.setVisible(true));
    cluster.remove();
  };


  buildLocationIcon = (location: Location, options: any = {}) => {
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
  }

  clustering () {
    const { enableClustering, showMarkers } = this.props;
    if (
      !showMarkers ||
      !enableClustering ||
      !this.gmap
      // this.markers.filter((x: Marker) => !!x.getMap()).length < maxMarkersWithoutClustering
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
    const { selectedLocation: location } = this.props;
    if (this.selectedMarker) {
      this.selectedMarker.setIcon(this.buildLocationIcon(this.selectedMarker.location));
      this.selectedMarker.setZIndex(1);
    }
    if (!location) {
      this.selectedMarker = null;
      return;
    }
    let marker = this.markers.find((x: any) => x.location.uuid === location.uuid);
    if (!marker) {
      marker = this.geofenceHitMarkers.find((x: any) => x.location && marker.location.uuid === location.uuid);
    }
    if (marker) {
      this.selectedMarker = marker;
      // marker.setFillColor('#000000');
      marker.setZIndex(100);
      marker.setIcon(
        this.buildLocationIcon(location, {
          strokeColor: COLORS.red,
          strokeWeight: 2,
          selected: true,
        }),
      );
    }
  }

  buildMotionChangePolyline (stationaryPosition: any, movingPosition: any) {
    const { showPolyline } = this.props;
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

  buildGeofenceMarker (location: Location, options: any) {
    const { geofence } = location;
    let circle = this.geofenceMarkers[geofence.identifier];
    if (!circle) {
      let center;
      let radius = 200;
      // If the geofence contains information about its center & radius in #extras...
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
        radius,
        center,
        map: options.map,
      });
      this.geofenceMarkers[geofence.identifier] = circle;
      this.geofenceHitMarkers.push(circle);
    }
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

  // Build a bread-crumb location marker.
  buildLocationMarker (location: Location, options: any = {}) {
    const { onSelectLocation } = this.props;
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
    this.markers.forEach((marker: Marker) => {
      google.maps.event.clearInstanceListeners(marker);
      marker.setMap(null);
    });
    this.markers = [];

    this.geofenceMarkers = {};
    this.geofenceHitMarkers.forEach((marker: any) => {
      marker.setMap(null);
    });
    this.geofenceHitMarkers = [];

    this.polyline.setPath([]);
    this.motionChangePolylines.forEach((polyline: any) => {
      polyline.setMap(null);
    });
    this.motionChangePolylines = [];
  }

  UNSAFE_shouldComponentUpdate (nestState: StateProps, nextProps: Props) {
    const {
      locations, testMarkers, showMarkers, enableClustering, showPolyline, showGeofenceHits,
    } = this.props;
    // If the map was rendered - decide how we can only partially update markers
    // to significantly speed up the update
    // const previous = this.updateFlags;
    if (this.gmap) {
      this.updateFlags = {
        needsMarkersRedraw: nextProps.locations !== locations,
        needsTestMarkersRedraw: nextProps.testMarkers !== testMarkers,
        needsShowMarkersUpdate: nextProps.showMarkers !== showMarkers ||
          nextProps.enableClustering !== enableClustering,
        needsShowPolylineUpdate: nextProps.showPolyline !== showPolyline,
        needsShowGeofenceHitsUpdate: nextProps.showGeofenceHits !== showGeofenceHits,
      };
      const result = Object.keys(this.updateFlags)
        .find((x: string) => !!this.updateFlags[x]);
      return !!result;
    }
    return false;
  }


  renderMarkers () {
    console.time('renderMarkers');
    const {
      currentLocation,
      isWatching,
      locations,
      showGeofenceHits,
      showMarkers,
      showPolyline,
      testMarkers,
    } = this.props;

    // if locations have not changed - do not clear markers
    // just update current location, selected location and handle visibility of markers
    if (this.updateFlags.needsTestMarkersRedraw && testMarkers.length) {
      this.renderTestMarkers(testMarkers);
    }
    if (this.updateFlags.needsMarkersRedraw) {
      this.clearMarkers();
      this.cleanClustering();

      const { length } = locations;
      console.info(`draw markers: ${length}`);

      this.polyline.setMap(showPolyline ? this.gmap : null);

      let motionChangePosition = null;
      let searchingForMotionChange = false;

      // Iterate in reverse order to create polyline points from oldest->latest.
      // We DO NOT want this.props.locations.reverse()!!!
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
      if (this.updateFlags.needsShowMarkersUpdate) {
        this.markers.forEach((marker: any) => {
          marker.setMap(showMarkers ? this.gmap : null);
        });
      }
      if (this.updateFlags.needsShowPolylineUpdate) {
        this.polyline.setMap(showPolyline ? this.gmap : null);
        this.motionChangePolylines.forEach((polyline: any) => {
          polyline.setMap(showPolyline ? this.gmap : null);
        });
      }
      if (this.updateFlags.needsShowGeofenceHitsUpdate) {
        this.geofenceHitMarkers.forEach((marker: any) => {
          marker.setMap(showGeofenceHits ? this.gmap : null);
        });
      }
      console.timeEnd('renderMarkers: Visibility');
    }
    // handle current location
    if (isWatching && currentLocation) {
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

  /**
  * Render manually added test markers
  {
    type: 'location|geofence'
    position: {
      lat: Float,
      lng: Float
    },
    radius: Number (present only when type: "geofence")
  }
  */
  renderTestMarkers (testMarkers: any) {
    // 37.33313411,-122.05283635
    for (let n = 0, len = testMarkers.length; n < len; n++) {
      const record = testMarkers[n];
      if (record.type === 'location') {
        // eslint-disable-next-line no-new
        new google.maps.Marker({
          position: record.position,
          map: this.gmap,
          label: record.label,
        });
      } else if (record.type === 'geofence') {
        // eslint-disable-next-line no-new
        new google.maps.Circle({
          zIndex: 2000,
          fillOpacity: 0,
          strokeColor: '#ff0000',
          strokeWeight: 1,
          strokeOpacity: 1,
          radius: record.radius,
          center: record.position,
          map: this.gmap,
        });
      }
    }
    // arbitrarily center on first marker.
    const first = testMarkers[0];
    this.gmap.setCenter(first.position);
  }

  render () {
    const { isActiveTab } = this.props;
    const { center } = this.state;

    if (this.gmap) {
      this.renderMarkers();
    }
    // protects us from rendering the google map while the tab is not active
    // because of display: none this leads to improper size calculations, so
    // later FitToBounds or setMapCenter do not work
    if (!isActiveTab && !this.gmap) {
      return null;
    }

    return (
      <GoogleMap
        yesIWantToUseGoogleMapApiInternals
        bootstrapURLKeys={{
          key: API_KEY,
          libraries: 'geometry',
        }}
        className='map'
        center={center}
        zoom={15}
        onGoogleApiLoaded={this.onMapLoaded}
      />
    );
  }
}

type LocationArgs = {
  locations: Location[],
  selectedLocationId: ?string,
};
const selectedLocationSelector = createSelector(
  [
    (state: GlobalState) => ({
      locations: state.dashboard.locations,
      selectedLocationId: state.dashboard.selectedLocationId,
    }),
  ],
  ({ locations, selectedLocationId }: LocationArgs) => locations &&
    locations.find((x: Location) => x.uuid === selectedLocationId),
);

const nthItem = (n: number) => (candidate: Location, index: number) => candidate.event || index % n === 0;
const filteredLocationSelector = createSelector(
  [
    (state: GlobalState) => ({
      locations: state.dashboard.locations,
      length: state.dashboard.locations.length,
    }),
  ],
  ({ locations, length }: { locations: Location[], length: number }) => (
    length < MAX_POINTS ? locations : locations.filter(nthItem(Math.floor(length / MAX_POINTS) + 1))
  ),
);

const mapStateToProps = (state: GlobalState) => {
  const { dashboard } = state;
  return {
    locations: filteredLocationSelector(state),
    showMarkers: dashboard.showMarkers,
    enableClustering: dashboard.enableClustering,
    showPolyline: dashboard.showPolyline,
    showGeofenceHits: dashboard.showGeofenceHits,
    isWatching: dashboard.isWatching,
    currentLocation: dashboard.currentLocation,
    selectedLocation: selectedLocationSelector(state),
    isActiveTab: state.dashboard.activeTab === 'map',
    testMarkers: dashboard.testMarkers,
  };
};

const mapDispatchToProps = { onSelectLocation: clickMarker };

export default connect(mapStateToProps, mapDispatchToProps)(MapView);
