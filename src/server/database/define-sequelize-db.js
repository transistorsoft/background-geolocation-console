var Sequelize   = require('sequelize');
var path        = require("path");

// ENVIRONMENT VARIABLES :
// PORT (optional, defaulted to 8080) : http port server will listen to
// DB_CONNECTION_URL (defaulted to "sqlite://db/background-geolocation.db") : connection url used to connect to a db
//    Currently, only postgresql & sqlite dialect are supported
//    Sample pattern for postgresql connection url : postgres://<username>:<password>@<hostname>:<port>/<dbname>

var sequelize = new Sequelize(process.env.DB_CONNECTION_URL || { dialect: "sqlite", storage: path.resolve(__dirname, "background-geolocation.db") });

module.exports = sequelize;
