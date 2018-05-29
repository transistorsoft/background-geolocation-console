import React from 'react';


import { connect } from 'react-redux';

import Styles from '~/assets/styles/app.css';

import { AppBar, Button, DatePicker, TimePicker, Switch, Checkbox, Card, Input } from 'react-toolbox';

class CustomMarkers extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      label: '',
      positionHint: 'latitude, longitude',
      position: '',
      radius: ''
    };
  }

  onChangeLabel(value) {
    this.setState({
      label: value
    });
  }

  onChangePosition(value) {                            
    this.setState({
      positionHint: (value.length > 0) ? '' : 'latitude, longitude',
      position: value
    });
  }

  onChangeRadius(value) {
    this.setState({
      radius: value
    });
  }

  onAdd() {
    let position = this.state.position;
    let latlng = position.replace(/\s+/, '').split(',');
    let radius = this.state.radius;
    
    this.props.onAddTestMarker({
      type: (!radius.length) ? 'location' : 'geofence',
      label: this.state.label,
      position: {
        lat: parseFloat(latlng[0], 10),
        lng: parseFloat(latlng[1], 10)
      },
      radius: parseInt(radius, 10)
    });
  }
  render() {
    return (
      <div className={Styles.content}>
        <h3>Custom Markers</h3>
        <Input type="text" value={this.state.label} label="Label" onChange={this.onChangeLabel.bind(this)} />
        <Input type="text" value={this.state.position} label="Location" hint={this.state.positionHint} required onChange={this.onChangePosition.bind(this)} />
        <Input type="text" value={this.state.radius} label="Radius (for geofence circle)" onChange={this.onChangeRadius.bind(this)} />
        <Button label="Add Marker" raised primary style={{width: '100%'}} onMouseUp={this.onAdd.bind(this)} />            
      </div>
    );
  }
};

function mapStateToProps(state, ownProps) {
  return {};
}

function mapDispatchToProps(dispatch) {
  return {
    onAddTestMarker: (marker) => {
      dispatch({
        type: 'ADD_TEST_MARKER',
        data: marker
      });
    }
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CustomMarkers);


