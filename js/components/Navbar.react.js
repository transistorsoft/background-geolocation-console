
var React = require('react');

var injectTapEventPlugin = require("react-tap-event-plugin");

var mui = require('material-ui'),
  ThemeManager = new mui.Styles.ThemeManager(),
  FlatButton = mui.FlatButton;


injectTapEventPlugin();

import View from "react-flexbox";

var Navbar = React.createClass({
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
      <View>
  	  	
      </View>
    );
  }
});

module.exports = Navbar;
