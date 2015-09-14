var React = require('react');
var Map = require('./Map.react');
import View from "react-flexbox";

var Workspace = React.createClass({
  
  className: "workspace",

	render: function() {
		return (
			<View>
				<Map flux={this.props.flux} />
			</View>
		);
	}
});

module.exports = Workspace;