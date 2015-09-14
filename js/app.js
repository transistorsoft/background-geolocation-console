/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

var React = require('react');

var Fluxxor = require('fluxxor');

var Router = require('react-router');
var Route = Router.Route;
var DefaultRoute = Router.DefaultRoute;
var RouteHandler = Router.RouteHandler;

var Viewport = require('./components/Viewport.react');

var actions = require('./actions/Actions');
var LocationsStore = require('./stores/LocationsStore');

var stores = {
  LocationsStore: new LocationsStore()
};

var flux = new Fluxxor.Flux(stores, actions);

flux.on("dispatch", function(type, payload) {
  if (console && console.log) {
    console.log("[Dispatch]", type, payload);
  }
});

var routes = (
  <Route handler={Viewport} path="/">
    <DefaultRoute handler={Viewport} />  
  </Route>
);

Router.run(routes, function (Handler) {
  React.render(<Handler flux={flux}/>, document.body);
});
