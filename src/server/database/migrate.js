/**
* Migrate records created from before Sequalize was introduced
*/

const path = require('path');
const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const sqlite3 = require('sqlite3').verbose();


const DB_FILE = path.resolve(__dirname, 'background-geolocation.db');
const LocationModel = require('./LocationModel.js');

let dbh;

if (!fs.existsSync(DB_FILE)) {
  // eslint-disable-next-line no-console
  console.log('- Failed to find background-geolocation.db: ', DB_FILE);
} else {
  dbh = new sqlite3.Database(DB_FILE);
  const query = 'SELECT * FROM locations';

  const onQuery = (err, rows) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.log('ERROR: ', err);
      return;
    }
    rows.forEach(row => {
      const { id } = row;
      // eslint-disable-next-line no-param-reassign
      delete row.id;
      LocationModel.update(row, { where: { id } });
    });
  };
  dbh.all(query, onQuery);
}
