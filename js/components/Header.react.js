
var React = require('react');

var injectTapEventPlugin = require("react-tap-event-plugin");

import {FlatButton, AppBar} from 'material-ui';
  
injectTapEventPlugin();

import View from "react-flexbox";

var Header = React.createClass({  
  /**
   * @return {object}
   */
  render: function() {
    return (
      <View className="header">
        <AppBar
          title="Background Geolocation Console"
          iconElementRight={<a href="http://transistorsoft.com" target="_blank"><img style={{width:'180px', marginTop:'-15px'}} src="images/transistor-logo.svg" /></a>}
        />
      </View>
    );
  }
});

module.exports = Header;
