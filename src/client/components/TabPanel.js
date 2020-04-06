// @flow
import React from 'react';
import Typography from '@material-ui/core/Typography';

type Props = {|
  children: any,
  value: number,
  index: number,
  className: any,
|};

const TabPanel = ({
  children, value, index, className,
}: Props) => (
  <Typography
    component='div'
    role='tabpanel'
    hidden={value !== index}
    id={`nav-tabpanel-${index}`}
    aria-labelledby={`nav-tab-${index}`}
    className={className}
  >
    {children}
  </Typography>
);

export default TabPanel;
