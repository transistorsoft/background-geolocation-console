var React = require('react');

var Header = require('./Header.react');
var Workspace = require('./Workspace.react');
var Map = require('./Map.react');
var Navbar = require('./Navbar.react');
import View from "react-flexbox";

var Viewport = React.createClass({
  className: "viewport",

  render: function() {

    return (
      <View column height="100vh">
        <View column auto>
          <View className="green" height="70px"><Header height="70px" /></View>
        </View>
        <View className="red"><Map flux={this.props.flux} /></View>
      </View>

      /*
      <View column className={this.className} height="800px">
        <Header height="70px" />
        <View row>
          <Map flux={this.props.flux} />

        </View>
      </View>
      */
    );
  }
});

module.exports = Viewport;