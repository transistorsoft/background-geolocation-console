// @flow
import React from 'react';
import clsx from 'classnames';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import logo from '../assets/images/transistor-logo.svg';

const style = { 'justifyContent': 'space-between' };
type Props = {| classes: {| appBar: string |} |};

const HeaderView = ({ classes, open, setOpen, children }: Props) =>
  <AppBar
    position='static'
    className={clsx(classes.appBar, {
      [classes.appBarShift]: open,
    })}
  >
    <Toolbar style={style}>
      <IconButton
        edge='start'
        className={clsx(classes.menuButton, open && classes.hide)}
        color='inherit' onClick={() => setOpen(true)}
        aria-label='menu'
      >
        <MenuIcon />
      </IconButton>
      <Typography variant='h6'>
        Background Geolocation Console
      </Typography>
      <Link edge='end' href='http://transistorsoft.com'>
        <img width="180" style={{ marginRight: '-20px' }} src={logo} />
      </Link>
    </Toolbar>
    {children}
  </AppBar>;

export default HeaderView;
