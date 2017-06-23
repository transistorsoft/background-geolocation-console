import React, {
  Component  
} from 'react';

import {
  AppBar,
  Button,
  Navigation,
  Link,
  FontIcon,
} from 'react-toolbox';

import Styles from "../assets/styles/app.css";

export default class HeaderView extends Component {  

  constructor(props) {
    super(props);    
  }

  render() {
    return (
      <AppBar title="Consola de Verificador ONP" leftIcon="menu" className={Styles.cabecera}>
        <Navigation type='horizontal'>                
          <Link href="https://www.onp.gob.pe/" label=""><img className={Styles.logo} src="assets/images/LogoONP.png" /></Link>
        </Navigation>
      </AppBar>
    );
  }
}
