// @flow
import React from 'react';
import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/Delete';
import RadioGroup from '@material-ui/core/RadioGroup';
import Radio from '@material-ui/core/Radio';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { connect } from 'react-redux';
import format from 'date-fns/format';

import { type GlobalState } from 'reducer/state';
import { deleteActiveDevice } from 'reducer/dashboard';

import ConfirmationDialog, { type Result } from '../ConfirmationDialog';
import RemoveAnimationProvider from '../RemoveAnimationProvider';


type StateProps = {|
  isVisible: boolean,
  startDate: Date,
  endDate: Date,
|};
type DispatchProps = {|
  deleteDevice: (filter?: { startDate: Date, endDate: Date }) => any,
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
const DeleteDeviceLink = ({
  isVisible,
  startDate,
  endDate,
  deleteDevice,
}: Props) => {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('true');
  const radioGroupRef = React.useRef(null);

  if (!isVisible) {
    return null;
  }

  const handleEntering = () => {
    if (radioGroupRef.current != null) {
      radioGroupRef.current.focus();
    }
  };

  const onClose = (result?: Result) => {
    setOpen(false);
    result && deleteDevice(value ? { startDate, endDate } : undefined);
  };
  const onClick = (e: Event) => {
    e.preventDefault();
    setOpen(true);
  };
  const handleChange = (e: { target: HTMLInputElement }) => {
    setValue(e.target.value);
  };

  return [
    <Button key='button' style={style} type='button' onClick={onClick}>
      <DeleteIcon />
    </Button>,
    <ConfirmationDialog
      key='confirmation'
      open={open}
      onClose={onClose}
      title='Delete device locations'
      onEntering={handleEntering}
    >
      <RemoveAnimationProvider>
        <RadioGroup
          ref={radioGroupRef}
          aria-label='delete-locations-options'
          name='delete-locations-options'
          value={value}
          onChange={handleChange}
        >
          <FormControlLabel value='' control={<Radio />} label='all' />
          <FormControlLabel
            value='true'
            control={<Radio />}
            label={`between ${format(
              new Date(startDate),
              'MM-dd',
            )} and ${format(new Date(endDate), 'MM-dd')}`}
          />
        </RadioGroup>
      </RemoveAnimationProvider>
    </ConfirmationDialog>,
  ];
};

const mapStateToProps = (state: GlobalState): StateProps => ({
  isVisible: state.dashboard.devices.length > 0,
  startDate: state.dashboard.startDate,
  endDate: state.dashboard.endDate,
});

const mapDispatchToProps: DispatchProps = { deleteDevice: deleteActiveDevice };

export default connect(mapStateToProps, mapDispatchToProps)(DeleteDeviceLink);
