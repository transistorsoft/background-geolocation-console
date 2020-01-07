import path from 'path'; import Sequelize from 'sequelize';


import { isPostgres } from '../libs/utils';

// ENVIRONMENT VARIABLES :
// PORT (optional, defaulted to 8080) : http port server will listen to
// DB_CONNECTION_URL (defaulted to "sqlite://db/background-geolocation.db") : connection url used to connect to a db
//    Currently, only postgresql & sqlite dialect are supported
//    Sample pattern for postgresql connection url : postgres://<username>:<password>@<hostname>:<port>/<dbname>

export default new Sequelize(
  isPostgres
    ? process.env.DATABASE_URL
    : {
      dialect: 'sqlite',
      storage: path.resolve(__dirname, 'db', 'background-geolocation.db'),
    },
);
