
var React = require('react');

var injectTapEventPlugin = require("react-tap-event-plugin");

var mui = require('material-ui'),
  ThemeManager = new mui.Styles.ThemeManager(),
  FlatButton = mui.FlatButton,
  AppBar = mui.AppBar;
  
injectTapEventPlugin();

import View from "react-flexbox";

var Header = React.createClass({
  childContextTypes: {
    muiTheme: React.PropTypes.object
  },
  getChildContext: function() {
    return {
      muiTheme: ThemeManager.getCurrentTheme()
    };
  },
  /**
   * @return {object}
   */
  render: function() {
    return (
      <View row className="header">
        <AppBar
          title="Background Geolocation Console"
          iconElementRight={<a href="http://transistorsoft.com" target="_blank"><img style={{width:'180', marginTop:'-15'}} src="images/transistor-logo.svg" /></a>}
        />
      </View>
    );
  }
});

module.exports = Header;
