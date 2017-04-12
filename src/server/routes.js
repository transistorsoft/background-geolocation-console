var fs          = require("fs");
var Device      = require('./models/Device.js');
var Location    = require('./models/Location.js');
var colors = require('colors');

var Routes = function(app) {
  /**
  * GET /devices
  */
  app.get('/devices', function(req, res) {
    console.log("GET /devices\n".green);
    Device.all(req.query, function(rs) {
      res.send(rs);
    })
  });

  /**
  * GET /locations
  */
  app.get('/locations', function(req, res) {
    console.log("GET /locations %s".green, JSON.stringify(req.query));

    Location.all(req.query, function(rs) {
      res.send(rs);
    });
  });

  /**
  * POST /locations
  */
  app.post('/locations', function (req, res) {
    var auth = req.get('Authorization');

    console.log("POST /locations\n%s".green, JSON.stringify(req.headers, null, 2));
    console.log("Authorization: %s".green, auth);
    console.log("%s\n".yellow, JSON.stringify(req.body, null, 2))
          
    try {
      Location.create(req.body);
    } catch(e) {
      console.log(e.message);
    }
    res.send({success: true});
    //res.status(401).send("Unauthorized");
    //res.status(403).send("Forbidden");
    //res.status(201).send({success: true});
    //res.status(201).send({success: true});
    //res.status(427).send("Too many requests");
    //res.status(500).send("Internal Server Error");
    //res.status(404).send("Not Found");
    //res.status(408).send("Timeout");
  });

  app.post('/locations_template', function (req, res) {
    console.log("POST /locations_template\n%s\n".green, JSON.stringify(req.body, null, 2));
    res.set('Retry-After', 5);
    res.send({success: true});
    //res.status(401).send("Unauthorized");
  });

  app.post('/configure', function(req, res) {
    console.log('/configure');

    var response = {
      "access_token":"e7ebae5e-4bea-4d63-8f28-8a104acd2f4c",   
      "token_type":"Bearer",   
      "expires_in":3600,   
      "refresh_token":"2a69e1cd-d7db-44f6-87fc-3d66c4505ee4",   
      "scope":"openid+email+profile+phone+address+group"   
    };

    res.send(response);
  });

  /**
  * Fetch iOS simulator city_drive route
  */
  app.get('/data/city_drive', function(req, res) {
    console.log('GET /data/city_drive.json'.green);
    fs.readFile('./data/city_drive.json', 'utf8', function (err,data) {
      res.send(data);
    });
  });
}

module.exports = Routes;

