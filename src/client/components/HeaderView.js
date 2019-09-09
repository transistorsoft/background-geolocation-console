// @flow
import React from 'react';
import { AppBar } from 'react-toolbox/lib/app_bar';
import { Navigation } from 'react-toolbox/lib/navigation';
import { Link } from 'react-toolbox/lib/link';
import Styles from '../assets/styles/app.css';
import logo from '../assets/images/transistor-logo.svg';

const HeaderView = () =>
  <AppBar title='Background Geolocation Console' leftIcon='menu'>
    <Navigation type='horizontal'>
      <Link href='http://transistorsoft.com' label=''>
        <img className={Styles.logo} src={logo} />
      </Link>
    </Navigation>
  </AppBar>;
export default HeaderView;
