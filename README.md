# Background Geolocation Console

> A simple Node server & web app with SQLite database for field-testing & analysis of the [Background Geolocation plugin](https://github.com/transistorsoft/cordova-background-geolocation-lt).

![](https://dl.dropboxusercontent.com/u/2319755/cordova-background-geolocaiton/background-geolocation-console-map.png)

![](https://dl.dropboxusercontent.com/u/2319755/cordova-background-geolocaiton/background-geolocation-console-grid.png)

## Running

You must have [npm](https://www.npmjs.org/) installed on your computer.
From the root project directory run these commands from the command line:

    npm install

This will install all dependencies.

To build the project, first run this command:

    npm start

This will perform an initial build of the Javascript and boot the web-server on port `8080`

Now visit [http://localhost:8080](http://localhost:8080)

## Running on Heroku

You can deploy easily the app on Heroku by pushing the code to your heroku git repository.

Before this, you will need to create 2 environment variables :
- `NPM_CONFIG_PRODUCTION = false` : It will tell heroku to install `devDependencies` (and not only `dependencies`), required to build browserify's `bundle.min.js` file
- `GMAP_API_KEY = <PUT YOUR KEY HERE>` : A Google Maps API v3 allowed for your heroku domain (see https://console.developers.google.com)

And to reference both `heroku/nodejs` and `https://github.com/weibeld/heroku-buildpack-run.git` buildpacks (either in the heroku dashboard, or by executing `heroku buildpacks:add --index 1 heroku/nodejs && heroku buildpacks:add --index 2 https://github.com/weibeld/heroku-buildpack-run.git`)

## Configure The Sample App

The Background Geolocation [Sample App](https://github.com/transistorsoft/cordova-background-geolocation-SampleApp) is perfect for use with this web-application.  To configure the app, simply edit `Settings->url` and set it to `http://<your.ip.ad.dress>:8080/locations`.

![](https://dl.dropboxusercontent.com/u/2319755/cordova-background-geolocaiton/settings-url.png)

You should also configure `Settings->autoSync` to `false` while out field-testing as well, so that the app doesn't try syncing each recorded location to the server running on your `localhost`.  Once you return after a test and you're back on your office Wifi, click the **[Sync]** button on the `Settings` screen to upload the cached locations to the **Background Geolocation Console** server.

## Credit

Chris Scott of [Transistor Software](http://transistorsoft.com)

## License

BSD-licensed.
