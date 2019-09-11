import React from 'react';
import PropTypes from 'prop-types';
import {
  makeStyles,
  AppBar,
  Tabs,
  Tab,
  Typography,
  Box
 } from '@material-ui/core';

type Props = {|
  children: boolean,
|};

const TabPanel = (({ children, value, index, ...other }): Props) => (
  <Typography
    component='div'
    role='tabpanel'
    hidden={value !== index}
    id={`nav-tabpanel-${index}`}
    aria-labelledby={`nav-tab-${index}`}
    {...other}
  >
    {children}
  </Typography>
);

export default TabPanel;
