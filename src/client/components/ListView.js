import React, {
  Component  
} from 'react';

import PropTypes from "prop-types"

import {connect} from 'react-redux';
import * as moment from 'moment';

import {
  Table, TableHead, TableRow, TableCell
} from 'react-toolbox';

import Styles from "../assets/styles/app.css";

import App from "./App";

/*
const sortByCaloriesAsc = (a, b) => {
  if (a.calories < b.calories) return -1;
  if (a.calories > b.calories) return 1;
  return 0;
};

const sortByCaloriesDesc = (a, b) => {
  if (a.calories > b.calories) return -1;
  if (a.calories < b.calories) return 1;
  return 0;
};
*/

class ListView extends Component {  

  constructor(props) {
    super(props);    
    this.state = {
      selected: [],
      sorted: 'asc'
    }
    this.data = [];

    App.getInstance().on('selectlocation', this.onSelectLocation.bind(this));
  }

  onSelectLocation(location) {
    if (!location) {
      this.setState({selected: []});
      return;
    }
    let record = this.data.find((rec) => {
      return rec.uuid === location.uuid;
    });
    if (record) {
      this.setState({
        selected: [this.data.indexOf(record)]
      });
    }
  }

  getSortedData() {
    const compare = this.state.sorted === 'asc' ? sortByCaloriesAsc : sortByCaloriesDesc;
    return data.sort(compare);
  }

  handleRowSelect(selected) {
    let record = this.data[selected[0]];
    App.getInstance().setLocation(record.data);
    //const sortedData = this.getSortedData();
    this.setState({ selected: selected });

  };

  handleSortClick() {
    const { sorted } = this.state;
    const nextSorting = sorted === 'asc' ? 'desc' : 'asc';
    this.setState({ sorted: nextSorting });
  }

  prepareData() {
    return (this.props.locations) ? this.props.locations.map((location) => {
      let event = location.event || '';
      switch(location.event) {
        case 'geofence':
          event = location.event + ': ' + location.geofence.action + ' ' + location.geofence.identifier;
          break;        
      }
      return {
        data: location,
        uuid: location.uuid,
        device_id: location.device_id,
        coordinate: location.latitude + ', ' + location.longitude,
        recorded_at: moment(new Date(location.recorded_at)).format("MM-DD HH:mm:ss:SSS"),
        is_moving: (location.is_moving) ? 'true' : 'false',
        accuracy: location.accuracy,
        speed: location.speed,
        event: event,
        activity: location.activity_type + ' (' + location.activity_confidence + '%)',
        battery_level: location.battery_level,
        battery_is_charging: location.battery_is_charging
      };
    }) : [];
  }

  render() {
    
    this.data = this.prepareData();

    return (
      <Table onRowSelect={this.handleRowSelect.bind(this)}>
        <TableHead>
          <TableCell>UUID</TableCell>
          <TableCell numeric>RECORDED AT</TableCell>
          <TableCell numeric>COORDINATE</TableCell>
          <TableCell numeric>ACCURACY</TableCell>
          <TableCell numeric>SPEED</TableCell>
          <TableCell numeric>EVENT</TableCell>
          <TableCell numeric>IS MOVING</TableCell>
          <TableCell numeric>ACTIVITY</TableCell>
          <TableCell numeric>BATTERY</TableCell>
        </TableHead>
        {this.data.map((item, idx) => (
          <TableRow key={idx} selected={this.state.selected.indexOf(idx) !== -1} onSelect={this.handleRowSelect.bind(this)}>
            <TableCell>{item.uuid}</TableCell>
            <TableCell numeric>{item.recorded_at}</TableCell>
            <TableCell numeric>{item.coordinate}</TableCell>
            <TableCell numeric>{item.accuracy}</TableCell>
            <TableCell numeric>{item.speed}</TableCell>
            <TableCell numeric><strong>{item.event}</strong></TableCell>
            <TableCell numeric>{item.is_moving}</TableCell>
            <TableCell numeric>{item.activity}</TableCell>
            <TableCell numeric className={(item.battery_is_charging) ? Styles.tableCellGreen : Styles.tableCellRed}>{item.battery_level*100}%</TableCell>
          </TableRow>
        ))}
      </Table>
    );
  }
}

ListView.propTypes = {
  selected: PropTypes.object
};

const mapStateToProps = function(store) {
  return {
    locations: store.locations
  };
};

export default connect(mapStateToProps)(ListView);
