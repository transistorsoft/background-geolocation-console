// @flow
import React from 'react';

import { AppBar, Navigation, Link } from 'react-toolbox';

import Styles from '../assets/styles/app.css';

const HeaderView = () =>
  <AppBar title='Background Geolocation Console' leftIcon='menu'>
    <Navigation type='horizontal'>
      <Link href='http://transistorsoft.com' label=''>
        <img className={Styles.logo} src='assets/images/transistor-logo.svg' />
      </Link>
    </Navigation>
  </AppBar>;
export default HeaderView;
