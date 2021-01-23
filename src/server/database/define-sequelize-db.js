import path from 'path'; import Sequelize from 'sequelize';

import {
  isPostgres, pgConnectionString, firebaseURL,
} from '../config.js';

export default !firebaseURL || isPostgres
  ? new Sequelize(
    isPostgres
      ? pgConnectionString
      : {
        dialect: 'sqlite',
        storage: path.resolve('.', 'src/server/database/db', 'background-geolocation.db'),
      },
  )
  : null;
