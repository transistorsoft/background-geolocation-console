import React from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';

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
