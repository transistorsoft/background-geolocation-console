// @flow
import React from 'react';
import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/Delete';
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
const style = {
  position: 'absolute',
  top: -20,
  right: 0,
  color: 'red',
  textTransform: 'none',
  // float: 'right',
};

const DeleteDeviceLink = ({ isVisible, onClick }: Props) => {
  if (!isVisible) {
    return null;
  }
  return (
    <Button
      style={style}
      onClick={(e: Event) => {
        e.preventDefault();
        if (confirm('Delete device and all its locations?')) {
          onClick();
        }
      }}
    >
      <DeleteIcon />
    </Button>
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
