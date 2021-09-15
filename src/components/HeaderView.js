// @flow
import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import Link from '@material-ui/core/Link';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import MenuIcon from '@material-ui/icons/Menu';
import clsx from 'classnames';
import React from 'react';

import logo from '../assets/images/transistor-logo.svg';

const style = { justifyContent: 'space-between' };
const margin = { marginRight: '-20px' };
type Props = {|
  classes: {|
    appBar: string,
    appBarShift: string,
    appBarWithLocationShift: string,
    appBarBothShift: string,
    menuButton: string,
    hide: string,
  |},
  setOpen: (open: boolean) => any,
  open: boolean,
  children: any,
  location: any,
|};

const HeaderView = ({
  classes, open, setOpen, children, location,
}: Props) => (
  <AppBar
    position='static'
    className={clsx(classes.appBar, {
      [classes.appBarShift]: open && !location,
      [classes.appBarWithLocationShift]: !open && !!location,
      [classes.appBarBothShift]: open && !!location,
    })}
  >
    <Toolbar style={style}>
      <IconButton
        edge='start'
        className={clsx(classes.menuButton, open && classes.hide)}
        color='inherit'
        onClick={() => setOpen(true)}
        aria-label='menu'
      >
        <MenuIcon />
      </IconButton>
      <Typography variant='h6'>Background Geolocation Console</Typography>
      <Link edge='end' href='http://transistorsoft.com'>
        <img width='180' style={margin} src={logo} alt='' />
      </Link>
    </Toolbar>
    {children}
  </AppBar>
);

export default HeaderView;
