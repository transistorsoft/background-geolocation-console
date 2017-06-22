// @flow
import React from 'react';

import { AppBar, Card } from 'react-toolbox';

import Styles from '../assets/styles/app.css';
import _ from 'lodash';

import { connect } from 'react-redux';
import { type Location, unselectLocation } from '~/reducer/dashboard';
import { type GlobalState } from '~/reducer/state';

type StateProps = {|
  location: ?Location,
|};
type DispatchProps = {|
  onClose: () => any,
|};

type Props = {| ...StateProps, ...DispatchProps |};

const LocationView = ({ location, onClose }: Props) =>
  <div className='filterView'>
    <AppBar title='Location' rightIcon='close' onRightIconClick={onClose} />
    <div className={Styles.content}>
      <Card style={{ marginBottom: '10px' }}>
        <div className={Styles.content}>
          <pre style={{ fontSize: '12px' }}>{JSON.stringify(location, null, 2)}</pre>
        </div>
      </Card>
    </div>
  </div>;

const mapStateToProps = (state: GlobalState): StateProps => ({
  location: state.dashboard.isWatching
    ? state.dashboard.currentLocation
    : _.find(state.dashboard.locations, { uuid: state.dashboard.selectedLocationId }),
});
const mapDispatchToProps: DispatchProps = {
  onClose: unselectLocation,
};

export default connect(mapStateToProps, mapDispatchToProps)(LocationView);
