// @flow
import React from 'react';
import { ThemeProvider } from '@material-ui/styles';
import { createMuiTheme } from '@material-ui/core';

export const removeAnimationTheme = createMuiTheme({
  transitions: {
    create: () => 'none',
  },
});
type Props = {|
  children: any,
|};

const RemoveAnimationProvider = ({ children }: Props) => (
  <ThemeProvider theme={removeAnimationTheme}>
    {children}
  </ThemeProvider>
);

export default RemoveAnimationProvider;
