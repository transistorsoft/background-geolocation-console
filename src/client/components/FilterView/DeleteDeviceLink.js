// @flow
import React from 'react';
import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/Delete';
import { connect } from 'react-redux';
import format from 'date-fns/format';
import ConfirmationDialog, { type Result } from '../ConfirmationDialog';
import { type GlobalState } from '~/reducer/state';
import { deleteActiveDevice } from '~/reducer/dashboard';

type StateProps = {|
  isVisible: boolean,
|};
type DispatchProps = {|
  deleteDevice: () => any,
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

const DeleteDeviceLink = ({ isVisible, startDate, endDate, deleteDevice }: Props) => {
  const [open, setOpen] = React.useState(false);

  if (!isVisible) {
    return null;
  }

  const onClose = (result: Result) => {
    setOpen(false);
    result && deleteDevice();
  };
  const onClick = (e: Event) => {
    e.preventDefault();
    setOpen(true);
  };

  return [
    <Button
      key='button'
      style={style}
      type='button'
      onClick={onClick}
    >
      <DeleteIcon />
    </Button>,
    <ConfirmationDialog
      key='confirmation'
      open={open}
      onClose={onClose}
      title='Delete device confirmation'
    >
      Delete device and all
      locations between {format(new Date(startDate), 'MM-dd')}
      and {format(new Date(endDate), 'MM-dd')}?
    </ConfirmationDialog>,
  ];
};

const mapStateToProps = (state: GlobalState): StateProps => ({
  isVisible: state.dashboard.devices.length > 0,
  startDate: state.dashboard.startDate,
  endDate: state.dashboard.endDate,
});

const mapDispatchToProps: DispatchProps = {
  deleteDevice: deleteActiveDevice,
};

export default connect(mapStateToProps, mapDispatchToProps)(DeleteDeviceLink);
