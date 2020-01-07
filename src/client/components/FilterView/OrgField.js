// @flow
import React from 'react';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import IconButton from '@material-ui/core/IconButton';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import InputAdornment from '@material-ui/core/InputAdornment';
import FormControl from '@material-ui/core/FormControl';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import { withStyles } from '@material-ui/core/styles';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import CloseIcon from '@material-ui/icons/Close';
import ListItemText from '@material-ui/core/ListItemText';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import WindowScroller from 'react-virtualized/dist/commonjs/WindowScroller';
import Grid from 'react-virtualized/dist/commonjs/Grid';
import DeviceUnknownIcon from '@material-ui/icons/DeviceUnknown';
import CloseRounded from '@material-ui/icons/CloseRounded';
import clx from 'classnames';

import type { Source, MaterialInputElement } from 'reducer/dashboard';

import RemoveAnimationProvider from '../RemoveAnimationProvider';

type Props = {
  onChange: (value: string) => any,
  source: Source[],
  value: ?string,
  fullScreen: string,
};
// const theme = useTheme();
const flex = { display: 'flex' };
const contentStyle = {
  minHeight: 400,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
};
const containerStyle = { flex: '1 auto', overflowY: 'auto' };
const styles = (theme: any) => ({
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
  selected: { backgroundColor: theme.palette.action.selected },
  item: {
    cursor: 'pointer',
    '&:hover': {
      verticalAlign: 'middle',
      lineHeight: '50px',
      cursor: 'pointer',
      backgroundColor: theme.palette.action.hover,
    },
  },
});

const OrgField = withStyles(styles)((props: Props) => {
  const {
    onChange, value, source: s, fullScreen, classes,
  } = props;
  const [dialogOpen, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState('');
  const isLong = s.length > 10;
  const handleChange = (ev: Event) => {
    setFilter(ev.target.value);
  };
  const onErase = () => {
    setFilter('');
  };
  const handleCancel = () => setOpen(false);
  const handleOpen = () => {
    if (!isLong) {
      return;
    }
    setOpen(true);
  };
  const val = filter.toLowerCase();
  const source = val
    ? s.filter((x: Source) => x.label && !!~x.label.toLowerCase().indexOf(val))
    : s;
  const handleOk = React.useCallback((index: number) => {
    setOpen(false);
    !!source.length && onChange(source[index].value);
  });
  const rowRenderer = ({
    key, rowIndex, style,
  }: any) => (
    <ListItem
      key={key}
      component='div'
      onClick={() => handleOk(rowIndex)}
      className={clx(classes.item, 'list-row-item', { [classes.selected]: value === source[rowIndex].value })}
      style={style}
    >
      <ListItemIcon>
        <DeviceUnknownIcon />
      </ListItemIcon>
      <ListItemText>{source[rowIndex].label}</ListItemText>
    </ListItem>
  );
  const contentRef = React.createRef();
  if (!s.length) {
    return null;
  }

  return [
    <Select
      key='select'
      autoWidth
      open={isLong ? false : undefined}
      onOpen={handleOpen}
      style={flex}
      label={`Companies (${s.length})`}
      onChange={({ target }: MaterialInputElement) => onChange(target.value)}
      value={value}
    >
      {s.map((x: Source) => (
        <MenuItem key={x.value} value={x.value}>
          {x.label}
        </MenuItem>
      ))}
    </Select>,
    <Dialog
      key='dialog'
      // disableBackdropClick
      // disableEscapeKeyDown
      // onEntering={handleEntering}
      aria-labelledby='filter-dialog-title'
      aria-describedby='filter-dialog-description'
      open={dialogOpen}
      fullWidth
      maxWidth='sm'
      fullScreen={fullScreen}
      onClose={handleCancel}
      scroll='paper'
      className='org-token-dialog'
    >
      <DialogTitle id='confirmation-dialog-title'>
        Org selector
        <IconButton
          aria-label='close'
          className={classes.closeButton}
          onClick={handleCancel}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers style={contentStyle}>
        <RemoveAnimationProvider>
          <FormControl>
            <InputLabel htmlFor='filter'>Company Filter</InputLabel>
            <Input
              id='filter'
              autoFocus
              fullWidth
              margin='dense'
              value={filter}
              onChange={handleChange}
              endAdornment={(
                <InputAdornment position='end'>
                  <IconButton
                    aria-label='toggle password visibility'
                    onClick={onErase}
                    onMouseDown={onErase}
                  >
                    <CloseRounded />
                  </IconButton>
                </InputAdornment>
              )}
            />
          </FormControl>
          <div style={containerStyle} ref={contentRef}>
            <WindowScroller scrollElement={contentRef.current}>
              {({
                isScrolling,
                registerChild,
                onChildScroll,
                scrollTop,
              }: any) => (
                <AutoSizer>
                  {({ width, height }: any) => (
                    <div ref={registerChild}>
                      <Grid
                        // autoWidth
                        autoContainerWidth
                        cellRenderer={rowRenderer}
                        columnWidth={500}
                        columnCount={1}
                        height={height}
                        overscanColumnCount={2}
                        overscanRowCount={2}
                        rowHeight={50}
                        rowCount={source.length}
                        scrollTop={scrollTop}
                        width={width}
                        isScrolling={isScrolling}
                        onScroll={onChildScroll}
                        filter={filter}
                        // scrollToIndex={scrollToIndex}
                      />
                    </div>
                  )}
                </AutoSizer>
              )}
            </WindowScroller>
          </div>
        </RemoveAnimationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color='primary'>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>,
  ];
});

export default OrgField;
