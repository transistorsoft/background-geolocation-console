var React = require('react');
import View from "react-flexbox";

var Header = require('./Header.react');
var Map = require('./Map.react');


var Viewport = React.createClass({
  className: "viewport",

  render: function() {

    return (
      <View column height="100vh">
        <View column auto>
          <View height="70px"><Header height="70px" /></View>
        </View>
        <View><Map flux={this.props.flux} /></View>
      </View>
    );
  }
});

module.exports = Viewport;