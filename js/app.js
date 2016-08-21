/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

var React = require('react');
var ReactDOM = require('react-dom');
var Fluxxor = require('fluxxor');
var Router = require('react-router').Router
var Route = require('react-router').Route
var Link = require('react-router').Link
import { hashHistory } from 'react-router'

var Viewport = require('./components/Viewport.react');

var actions = require('./actions/Actions');

// Stores
var LocationsStore = require('./stores/LocationsStore'),
    DevicesStore   = require('./stores/DevicesStore');

var stores = {
  LocationsStore: new LocationsStore(),
  DevicesStore: new DevicesStore()
};

var flux = new Fluxxor.Flux(stores, actions);

const createFluxComponent = (Component, props) => {
  return <Component {...props} flux={flux} />;
};

var routes = (
  <Router createElement={createFluxComponent} history={hashHistory}>
    <Route path="/" component={Viewport} flux={flux}>
      <Route path="*" component={Viewport} flux={flux}/>
    </Route>
  </Router>
);



ReactDOM.render(routes, document.getElementById('app'));

