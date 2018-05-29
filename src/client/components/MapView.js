// @flow

import React, { Component } from 'react';
import _ from 'lodash';
import { createSelector } from 'reselect';

import { connect } from 'react-redux';
import { type Location, clickMarker } from '~/reducer/dashboard';
import { type GlobalState } from '~/reducer/state';

import GoogleMap from 'google-map-react';

import Styles from '../assets/styles/app.css';
import { COLORS, MAX_POINTS } from '~/constants';
import { changeTabBus, type ChangeTabPayload, fitBoundsBus, type FitBoundsPayload } from '~/globalBus';

const API_KEY = process.env.GMAP_API_KEY || 'AIzaSyA9j72oZA5SmsA8ugu57pqXwpxh9Sn4xuM';

declare var google: any;
type StateProps = {|
  showMarkers: boolean,
  showPolyline: boolean,
  showGeofenceHits: boolean,
  isWatching: boolean,
  testMarkers: Object,
  currentLocation: ?Location,
  locations: Location[],
  selectedLocation: ?Location,
  isActiveTab: boolean,
|};

type DispatchProps = {|
  onSelectLocation: string => any,
|};

type Props = {| ...StateProps, ...DispatchProps |};

type State = {|
  center: {| lat: number, lng: number |},
  zoom: number,
|};

class MapView extends Component {
  props: Props;
  previousLocations: Location[] = [];
  motionChangePolylines: any = [];
  selectedMarker: any = null;
  geofenceMarkers: any = {};
  geofenceHitMarkers: any = [];
  markers: any = [];
  gmap: any = null;
  polyline: any = null;
  currentLocationMarker: any = null;
  locationAccuracyCircle: any = null;
  state: State = {
    center: { lat: -25.363882, lng: 131.044922 },
    zoom: 18,
  };
  updateFlags = {
    needsMarkersRedraw: true,
    needsTestMarkersRedraw: true,
    needsShowMarkersUpdate: true,
    needsShowPolylineUpdate: true,
    needsShowGeofenceHitsUpdate: true,
  };
  postponedFitBoundsPayload: ?FitBoundsPayload = null;

  componentWillMount () {
    fitBoundsBus.subscribe(this.fitBounds);
    changeTabBus.subscribe(this.changeTab);
  }

  componentWillUnmount () {
    fitBoundsBus.unsubscribe(this.fitBounds);
    changeTabBus.unsubscribe(this.changeTab);
  }

  changeTab = (payload: ChangeTabPayload) => {
    if (this.props.isActiveTab) {
      setTimeout(() => this.fitBoundsIfPostponed(), 1);
    }
  };

  fitBoundsIfPostponed () {
    if (this.postponedFitBoundsPayload) {
      this.fitBounds(this.postponedFitBoundsPayload);
      this.postponedFitBoundsPayload = null;
    }
  }

  // Fit Bounds, postpone if gmap is not ready, also postpone if tab is not active
  fitBounds = (payload: FitBoundsPayload) => {
    if (!this.props.isActiveTab) {
      this.postponedFitBoundsPayload = payload;
      return;
    }
    if (this.gmap) {
      if (this.props.locations.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        this.props.locations.forEach(function (location: Location) {
          bounds.extend(new google.maps.LatLng(location.latitude, location.longitude));
        });
        this.gmap.fitBounds(bounds);
      } else if (this.props.locations.length === 1) {
        const location = this.props.locations[0];
        this.gmap.setCenter(new google.maps.LatLng(location.latitude, location.longitude));
      }
    } else {
      setTimeout(() => this.fitBounds(payload), 1000);
    }
  };

  onMapLoaded = (event: any) => {
    this.gmap = event.map;
    // Route polyline
    let seq = {
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

    this.renderMarkers();
  };

  // ensures that selected location is properly displayed
  // previous marker is set to default icon, new marker or nothing is set to
  // selected icon
  updateSelectedLocation () {
    const location = this.props.selectedLocation;
    if (this.selectedMarker) {
      this.selectedMarker.setIcon(this.buildLocationIcon(this.selectedMarker.location));
      this.selectedMarker.setZIndex(1);
    }
    if (!location) {
      this.selectedMarker = null;
      return;
    }
    let marker = this.markers.find((marker: any) => {
      return marker.location.uuid === location.uuid;
    });
    if (!marker) {
      marker = this.geofenceHitMarkers.find((marker: any) => {
        return marker.location && marker.location.uuid === location.uuid;
      });
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
        })
      );
    }
  }

  renderMarkers () {
    console.time('renderMarkers');
    const { locations, isWatching, currentLocation, showPolyline, showMarkers, showGeofenceHits, testMarkers } = this.props;

    // if locations have not changed - do not clear markers
    // just update current location, selected location and handle visibility of markers
    if (this.updateFlags.needsTestMarkersRedraw && testMarkers.length) {
      this.renderTestMarkers(testMarkers);
    }
    if (this.updateFlags.needsMarkersRedraw) {
      this.clearMarkers();

      const length = locations.length;
      console.info('draw markers: ' + length);

      this.polyline.setMap(showPolyline ? this.gmap : null);

      let motionChangePosition = null;
      let searchingForMotionChange = false;

      // Iterate in reverse order to create polyline points from oldest->latest.
      // We DO NOT want this.props.locations.reverse()!!!
      for (var n = length - 1; n > 0; n--) {
        let location = locations[n];
        let latLng = new google.maps.LatLng(location.latitude, location.longitude);
        if (location.geofence) {
          this.buildGeofenceMarker(location, {
            map: showGeofenceHits ? this.gmap : null,
          });
        } else {
          let marker = this.buildLocationMarker(location, {
            map: showMarkers ? this.gmap : null,
          });
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
      let latLng = new google.maps.LatLng(currentLocation.latitude, currentLocation.longitude);
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
  renderTestMarkers(testMarkers) {
    // 37.33313411,-122.05283635
    for (let n=0,len=testMarkers.length;n<len;n++) {
      let record = testMarkers[n];
      if (record.type === 'location') {
        new google.maps.Marker({
          position: record.position,
          map: this.gmap,
          label: record.label
        });
      } else if (record.type === 'geofence') {
        new google.maps.Circle({
          zIndex: 2000,
          fillOpacity: 0,
          strokeColor: '#ff0000',
          strokeWeight: 1,
          strokeOpacity: 1,
          radius: record.radius,
          center: record.position,
          map: this.gmap
        });
      }
    }
    // arbitrarily center on first marker.
    let first = testMarkers[0];
    this.gmap.setCenter(first.position);
  }

  buildMotionChangePolyline (stationaryPosition: any, movingPosition: any) {
    const { showPolyline } = this.props;
    let seq = {
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
    let geofence = location.geofence;
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
        radius: radius,
        center: center,
        map: options.map,
      });
      this.geofenceMarkers[geofence.identifier] = circle;
      this.geofenceHitMarkers.push(circle);
    }
    var color;
    if (geofence.action === 'ENTER') {
      color = COLORS.green;
    } else if (geofence.action === 'DWELL') {
      color = COLORS.gold;
    } else {
      color = COLORS.red;
    }
    let circleLatLng = circle.getCenter();
    let locationLatLng = new google.maps.LatLng(location.latitude, location.longitude);

    const heading = google.maps.geometry.spherical.computeHeading(circleLatLng, locationLatLng);
    let circleEdgeLatLng = google.maps.geometry.spherical.computeOffset(circleLatLng, circle.getRadius(), heading);

    var geofenceEdgeMarker = new google.maps.Marker({
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

    var locationMarker = this.buildLocationMarker(location, {
      showHeading: true,
      zIndex: 2000,
      map: options.map,
      fillColor: color,
    });
    this.geofenceHitMarkers.push(locationMarker);

    var polyline = new google.maps.Polyline({
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
  buildLocationMarker (location: Location, options: any) {
    const { onSelectLocation } = this.props;
    options = options || {};
    let zIndex = options.zIndex || 1;
    let marker = new google.maps.Marker({
      zIndex: zIndex,
      icon: this.buildLocationIcon(location, options),
      location: location,
      map: options.map,
      position: new google.maps.LatLng(location.latitude, location.longitude),
    });

    marker.addListener('click', () => onSelectLocation(location.uuid));
    return marker;
  }

  buildLocationIcon (location: Location, options: any) {
    options = options || {};
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
      path: path,
      rotation: location.heading,
      scale: scale,
      anchor: anchor,
      fillColor: options.fillColor || fillColor,
      fillOpacity: options.fillOpacity || fillOpacity,
      strokeColor: options.strokeColor || COLORS.black,
      strokeWeight: options.strokeWeight || 1,
      strokeOpacity: options.strokeOpacity || 1,
    };
  }

  clearMarkers () {
    this.markers.forEach((marker: any) => {
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

  componentWillUpdate (nextProps: Props) {
    // If the map was rendered - decide how we can only partially update markers
    // to significantly speed up the update
    if (this.gmap) {
      this.updateFlags = {
        needsMarkersRedraw: nextProps.locations !== this.props.locations,
        needsTestMarkersRedraw: nextProps.testMarkers !== this.props.testMarkers,
        needsShowMarkersUpdate: nextProps.showMarkers !== this.props.showMarkers,
        needsShowPolylineUpdate: nextProps.showPolyline !== this.props.showPolyline,
        needsShowGeofenceHitsUpdate: nextProps.showGeofenceHits !== this.props.showGeofenceHits,
      };
    }
  }

  render () {
    if (this.gmap) {
      this.renderMarkers();
    }
    // protects us from rendering the google map while the tab is not active
    // because of display: none this leads to improper size calculations, so
    // later FitToBounds or setMapCenter do not work
    if (!this.props.isActiveTab && !this.gmap) {
      return null;
    }

    return (
      <div className={Styles.map}>
        <GoogleMap
          yesIWantToUseGoogleMapApiInternals={true}
          bootstrapURLKeys={{
            key: API_KEY,
            libraries: 'geometry',
          }}
          className='map'
          center={this.state.center}
          zoom={15}
          onGoogleApiLoaded={this.onMapLoaded}
        />
      </div>
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
  ({ locations, selectedLocationId }: LocationArgs) => _.find(locations, { uuid: selectedLocationId })
);

const nthItem = function (n: number) {
  return function (candidate: Location, index: number) {
    return candidate.event || index % n === 0;
  };
};
const filteredLocationSelector = createSelector(
  [
    (state: GlobalState) => ({
      locations: state.dashboard.locations,
      length: state.dashboard.locations.length,
    }),
  ],
  ({ locations, length }: { locations: Location[], length: number }) =>
    length < MAX_POINTS ? locations : locations.filter(nthItem(Math.floor(length / MAX_POINTS) + 1))
);

const mapStateToProps = function (state: GlobalState) {
  const { dashboard } = state;
  return {
    locations: filteredLocationSelector(state),
    showMarkers: dashboard.showMarkers,
    showPolyline: dashboard.showPolyline,
    showGeofenceHits: dashboard.showGeofenceHits,
    isWatching: dashboard.isWatching,
    currentLocation: dashboard.currentLocation,
    selectedLocation: selectedLocationSelector(state),
    isActiveTab: state.dashboard.activeTab === 'map',
    testMarkers: dashboard.testMarkers,
  };
};

const mapDispatchToProps = {
  onSelectLocation: clickMarker,
};

export default connect(mapStateToProps, mapDispatchToProps)(MapView);
