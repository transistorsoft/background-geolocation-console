// @flow
import React from 'react';
import Button from '@material-ui/core/Button';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Dialog from '@material-ui/core/Dialog';
import WarningIcon from '@material-ui/icons/Warning';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useTheme } from '@material-ui/core/styles';

export type Result = {| value: any |};

type Props = {|
  children: any,
  onClose: (?Result) => {},
  open: boolean,
  title: any,

  dlgContentProps?: any,
  onOpen?: (Result) => {},
  onEntering?: () => {},
  value?: any,
|};

export default function ConfirmationDialog({
  onClose,
  open,
  children,
  value = undefined,
  onOpen = undefined,
  title = 'Confirm?',
  dlgContentProps = {},
  ...other
}: Props) {
  const handleCancel = () => {
    onClose();
  };
  const handleEntering = () => {
    onOpen && onOpen({ value: value || true });
  };
  const handleOk = () => {
    onClose({ value: value || true });
  };
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      // disableBackdropClick
      // disableEscapeKeyDown
      fullScreen={fullScreen}
      onEntering={handleEntering}
      aria-labelledby='confirmation-dialog-title'
      aria-describedby='alert-dialog-description'
      open={open}
      onClose={handleCancel}
      {...other}
    >
      <DialogTitle id='confirmation-dialog-title'>{title}</DialogTitle>
      <DialogContent {...dlgContentProps}>
        <WarningIcon
          color='error'
          fontSize='large'
          style={{ float: 'left', marginRight: theme.spacing(2) }}
        />
        {typeof children === 'string' ? (
          <DialogContentText id='alert-dialog-description'>
            {children}
          </DialogContentText>
        ) : (
          children
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color='primary'>
          Cancel
        </Button>
        <Button onClick={handleOk} color='primary' autoFocus>
          Ok
        </Button>
      </DialogActions>
    </Dialog>
  );
}
