import React from 'react';
import { connect } from 'react-redux';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';

class CustomMarkers extends React.Component {
  constructor (props) {
    super(props);
    this.state = {
      label: '',
      positionHint: 'latitude, longitude',
      position: '',
      radius: '',
    };
  }

  onChangeLabel (value) {
    this.setState({
      label: value,
    });
  }

  onChangePosition (value) {
    this.setState({
      positionHint: (value.length > 0) ? '' : 'latitude, longitude',
      position: value,
    });
  }

  onChangeRadius (value) {
    this.setState({
      radius: value,
    });
  }

  onAdd = () => {
    let position = this.state.position;
    let latlng = position.replace(/\s+/, '').split(',');
    let radius = this.state.radius;

    this.props.onAddTestMarker({
      type: (!radius.length) ? 'location' : 'geofence',
      label: this.state.label,
      position: {
        lat: parseFloat(latlng[0], 10),
        lng: parseFloat(latlng[1], 10),
      },
      radius: parseInt(radius, 10),
    });
  }
  render () {
    return [
      <CardContent key='content'>
        <TextField fullWidth type='text' value={this.state.label} label='Label' onChange={this.onChangeLabel.bind(this)} />
        <TextField
          type='text'
          fullWidth
          value={this.state.position}
          label='Location'
          hint={this.state.positionHint}
          required
          onChange={this.onChangePosition.bind(this)}
        />
        <TextField
          type='text'
          fullWidth
          value={this.state.radius}
          label='Radius (for geofence circle)'
          onChange={this.onChangeRadius.bind(this)}
        />
      </CardContent>,
      <CardActions key='actions' disableSpacing>
        <Button fullWidth variant='contained' color='primary' style={{ width: '100%' }} onClick={this.onAdd}>
          Add Marker
        </Button>
      </CardActions>,
    ];
  }
};

export default connect(
  undefined,
  {
    onAddTestMarker: (data) => ({
      type: 'ADD_TEST_MARKER',
      data,
    }),
  })(CustomMarkers);
