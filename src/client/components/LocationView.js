import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { AppBar, Card } from 'react-toolbox';

import App from './App';
import Styles from '../assets/styles/app.css';

class LocationView extends Component {
  constructor (props) {
    super(props);

    this.state = {};
  }

  onClickClose () {
    App.getInstance().setLocation(null);
  }

  render () {
    return (
      <div className='filterView'>
        <AppBar title='Location' rightIcon='close' onRightIconClick={this.onClickClose.bind(this)} />
        <div className={Styles.content}>
          <Card style={{ marginBottom: '10px' }}>
            <div className={Styles.content}>
              <pre style={{ fontSize: '12px' }}>{JSON.stringify(this.props.location, null, 2)}</pre>
            </div>
          </Card>
        </div>
      </div>
    );
  }
}

LocationView.propTypes = {
  location: PropTypes.object,
  onClose: PropTypes.func,
};

export default LocationView;
