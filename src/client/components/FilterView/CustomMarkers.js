import React from 'react';
import { connect } from 'react-redux';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';

class CustomMarkers extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      label: '',
      positionHint: 'latitude, longitude',
      position: '',
      radius: '',
    };
  }

  onChangeLabel = value => {
    this.setState({ label: value });
  };

  onChangePosition = value => {
    this.setState({
      positionHint: value.length > 0 ? '' : 'latitude, longitude',
      position: value,
    });
  };

  onChangeRadius = value => {
    this.setState({ radius: value });
  };

  onAdd = () => {
    const {
      position, radius, label,
    } = this.state;
    const latlng = position.replace(/\s+/, '').split(',');
    const { onAddTestMarker } = this.props;

    onAddTestMarker({
      type: !radius.length ? 'location' : 'geofence',
      label,
      position: {
        lat: parseFloat(latlng[0], 10),
        lng: parseFloat(latlng[1], 10),
      },
      radius: parseInt(radius, 10),
    });
  };

  render() {
    const {
      label, position, positionHint, radius,
    } = this.state;
    const { classes } = this.props;
    return (
      <Card>
        <CardHeader
          className={classes.header}
          key='header'
          title='Custom Markers'
        />
        <CardContent>
          <TextField
            fullWidth
            type='text'
            value={label}
            label='Label'
            onChange={e => this.onChangeLabel(e.target.value)}
          />
          <TextField
            type='text'
            fullWidth
            value={position}
            label='Location'
            hint={positionHint}
            required
            onChange={e => this.onChangePosition(e.target.value)}
          />
          <TextField
            type='text'
            fullWidth
            value={radius}
            label='Radius (for geofence circle)'
            onChange={e => this.onChangeRadius(e.target.value)}
          />
        </CardContent>
        <CardActions disableSpacing>
          <Button
            fullWidth
            variant='contained'
            color='primary'
            style={{ width: '100%' }}
            onClick={this.onAdd}
          >
            Add Marker
          </Button>
        </CardActions>
      </Card>
    );
  }
}

export default connect(undefined, {
  onAddTestMarker: data => ({
    type: 'ADD_TEST_MARKER',
    value: { data },
  }),
})(CustomMarkers);
