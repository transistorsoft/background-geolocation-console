
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
          iconElementRight={<FlatButton label="Transistor Software" />}
        />
      </View>
    );
  }
});

module.exports = Header;
