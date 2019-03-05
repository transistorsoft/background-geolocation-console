# Background Geolocation Console

> A simple Node server & web app with SQLite database for field-testing & analysis of the [Background Geolocation plugin](https://github.com/transistorsoft/cordova-background-geolocation-lt).

## Install

You must have [npm](https://www.npmjs.org/) installed on your computer.
From the root project directory run these commands from the command line:

```bash
$ npm install
```

## Running

```bash
$ npm run server
```

A browser window will automatically launch the front-end web app.

## Configure The Sample App

The Background Geolocation [Sample App](https://github.com/transistorsoft/cordova-background-geolocation-SampleApp) is perfect for use with this web-application.  To configure the app, simply edit `Settings->url` and set it to `http://<your.ip.ad.dress>:9000/locations`.

You should also configure `Settings->autoSync` to `false` while out field-testing as well, so that the app doesn't try syncing each recorded location to the server running on your `localhost`.  Once you return after a test and you're back on your office Wifi, click the **[Sync]** button on the `Settings` screen to upload the cached locations to the **Background Geolocation Console** server.

## Running on Heroku

You can deploy easily the app on Heroku by pushing the code to your heroku git repository.  

Before this, you will need to create 2 environment variables (either in the heroku dashboard, or by executing `heroku config:set <VARIABLE_NAME>=<VARIABLE_VALUE>`) :  
- `NPM_CONFIG_PRODUCTION = false` : It will tell heroku to install `devDependencies` (and not only `dependencies`), required to build browserify's `bundle.min.js` file
- `GMAP_API_KEY = <PUT YOUR KEY HERE>` : A Google Maps API v3 allowed for your heroku domain (see https://console.developers.google.com)
- Optionally, `DB_CONNECTION_URL = postgres://<username>:<password>@<hostname>:<port>/<dbname>` if you want to persist locations
  into a postgresql db (instead of a sqlite db which will be deleted after every heroku shutdown)

And to reference `heroku/nodejs` buildpack (either in the heroku dashboard, or by executing `heroku buildpacks:add --index 1 heroku/nodejs`)

## Credit

Chris Scott of [Transistor Software](http://transistorsoft.com)

## License

Copyright 2017, Transistor Software

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

