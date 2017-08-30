// @flow
import React from 'react';
import Link from 'react-toolbox/lib/link';
import { connect } from 'react-redux';
import { type GlobalState } from '~/reducer/state';
import { deleteActiveDevice } from '~/reducer/dashboard';

type StateProps = {|
  isVisible: boolean,
|};
type DispatchProps = {|
  onClick: () => any,
|};
type Props = {| ...StateProps, ...DispatchProps |};

const DeleteDeviceLink = ({ isVisible, onClick }: Props) => {
  if (!isVisible) {
    return null;
  }
  return (
    <Link
      style={{
        position: 'relative',
        top: -72,
        right: -60,
        colord: 'red',
      }}
      href='#'
      onClick={(e: Event) => {
        e.preventDefault();
        if (confirm('Delete device and all its locations?')) {
          onClick();
        }
      }}
      label='Delete'
      active
    />
  );
};

const mapStateToProps = function (state: GlobalState): StateProps {
  return {
    isVisible: state.dashboard.devices.length > 0,
  };
};

const mapDispatchToProps: DispatchProps = {
  onClick: deleteActiveDevice,
};

export default connect(mapStateToProps, mapDispatchToProps)(DeleteDeviceLink);
