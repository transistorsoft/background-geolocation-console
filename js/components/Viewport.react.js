var React = require('react');
import View from "react-flexbox";

import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

var Header = require('./Header.react');
var Map = require('./Map.react');


var Viewport = React.createClass({
  className: "viewport",

  render: function() {

    return (
      <MuiThemeProvider>
        <View style={{flexDirection: 'column'}}>
          <Header />
          <Map flux={this.props.flux} />
        </View>
      </MuiThemeProvider>
    );
  }
});

module.exports = Viewport;