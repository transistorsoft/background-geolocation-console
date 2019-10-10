// @flow
import React, { Component } from 'react';
import { Select, MenuItem } from '@material-ui/core';
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
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import WindowScroller from 'react-virtualized/dist/commonjs/WindowScroller';
import ListVirtualized from 'react-virtualized/dist/commonjs/List';
import DeviceUnknownIcon from '@material-ui/icons/DeviceUnknown';
import CloseRounded from '@material-ui/icons/CloseRounded';
import RemoveAnimationProvider from '../RemoveAnimationProvider';
import type { Source, MaterialInputElement } from '~/reducer/dashboard';

type Props = {
  onChange: (value: string) => any,
  source: Source[],
  value: ?string,
  fullScreen: string,
};
// const theme = useTheme();
const flex = { display: 'flex' };
const contentStyle = { minHeight: 400, position: 'relative', display: 'flex', flexDirection: 'column' };
const rowStyle = { verticalAlign: 'middle', lineHeight: '50px', cursor: 'pointer' };
const containerStyle = { flex: '1 auto', 'overflowY': 'auto' };

class CompanyTokenField extends Component<Props> {
  state = { open: false, filter: '' };

  handleChange = (ev: Event) => {
    this.scrollToIndex = 0;
    this.setState({ scrollToIndex: 0, filter: ev.target.value })
    ;
  }

  onErase = () => {
    this.setState({ filter: '', scrollToIndex: 0 });
  }

  handleCancel = () => this.setState({ open: false });

  handleOpen = () => {
    if (!this.isLong) {
      return;
    }
    setTimeout(
      () => {
        this.forceUpdate();
        this.scrollerRef.forceUpdate();
      },
      500
    );
    this.setState({ open: true });
  }

  handleOk = (index: number) => {
    this.setState({ open: false });
    this.source.length && this.props.onChange(this.source[index].value);
  };

  rowRenderer = ({ index, isScrolling, isVisible, key, style }: any) => {
    return (
      <ListItem
        key={key}
        onClick={() => this.handleOk(index)}
        style={{ ...rowStyle, ...style }}
      >
        <ListItemIcon>
          <DeviceUnknownIcon />
        </ListItemIcon>
        <ListItemText>
          {this.source[index].label}
        </ListItemText>
      </ListItem>
    );
  };

  render () {
    const { onChange, value, source, fullScreen } = this.props;
    const { open, filter } = this.state;
    const val = filter.toLowerCase();
    this.source = val ? source.filter((x: Source) => x.label && !!~x.label.toLowerCase().indexOf(val)) : source;
    this.isLong = source.length > 10;

    if (!filter && !this.source.length) {
      return null;
    }

    return [
      <Select
        key='select'
        autoWidth
        open={this.isLong ? false : undefined}
        onOpen={this.handleOpen}
        style={flex}
        label={`Users (${source.length})`}
        onChange={({ target }: MaterialInputElement) => onChange(target.value)}
        value={value}
      >
        {source.map((x: Source) => (<MenuItem key={x.value} value={x.value}>{x.label}</MenuItem>))}
      </Select>,
      <Dialog
        key='dialog'
        // disableBackdropClick
        // disableEscapeKeyDown
        // onEntering={handleEntering}
        aria-labelledby='filter-dialog-title'
        aria-describedby='filter-dialog-description'
        open={open}
        fullWidth
        maxWidth='sm'
        fullScreen={fullScreen}
        onClose={this.handleCancel}
        scroll='paper'
      >
        <DialogTitle id='confirmation-dialog-title'>Company selector</DialogTitle>
        <DialogContent
          dividers
          style={contentStyle}
        >
          <RemoveAnimationProvider>
            <FormControl>
              <InputLabel htmlFor='filter'>Company Filter</InputLabel>
              <Input
                id='filter'
                autoFocus
                fullWidth
                margin='dense'
                value={filter}
                onChange={this.handleChange}
                endAdornment={
                  <InputAdornment position='end'>
                    <IconButton
                      aria-label='toggle password visibility'
                      onClick={this.onErase}
                      onMouseDown={this.onErase}
                    >
                      <CloseRounded />
                    </IconButton>
                  </InputAdornment>
                }
              />
            </FormControl>
            <div style={containerStyle} ref={(ref: any) => (this.contentRef = ref)}>
              <WindowScroller
                scrollElement={this.contentRef}
                ref={(ref: any) => (this.scrollerRef = ref)}
              >
                {({ isScrolling, registerChild, onChildScroll, scrollTop }: any) => (
                  <AutoSizer>
                    {({ width, height }: any) => (
                      <div ref={registerChild}>
                        <List>
                          <ListVirtualized
                            autoHeight
                            height={height}
                            isScrolling={isScrolling}
                            onScroll={onChildScroll}
                            overscanRowCount={2}
                            rowCount={this.source.length}
                            rowHeight={50}
                            filter={filter}
                            rowRenderer={this.rowRenderer}
                            scrollTop={scrollTop}
                            // scrollToIndex={scrollToIndex}
                            width={width}
                          />
                        </List>
                      </div>
                    )}
                  </AutoSizer>
                )}
              </WindowScroller>
            </div>
          </RemoveAnimationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={this.handleCancel} color='primary'>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>,
    ];
  }
}

export default CompanyTokenField;
