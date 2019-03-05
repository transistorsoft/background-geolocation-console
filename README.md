# Background Geolocation Console

> A simple Node server & web app with SQLite database for field-testing & analysis of the [Background Geolocation plugin](https://github.com/transistorsoft/cordova-background-geolocation-lt).

![Screenshot of console web front-end](https://cdn-images-1.medium.com/max/1600/1*LQjGoP0SgXOrqJvjy58EkQ.png)

You may read the news about this [application in our article on Medium](https://medium.com/@transistorsoft/background-geolocation-console-45796532c2ee).

## Install

You must have [npm](https://www.npmjs.org/) installed on your computer.
From the root project directory run these commands from the command line:

```bash
npm install
```

## Running

```bash
npm run server
```

If you are in an environment that supports opening a web browser, a browser window will automatically launch the front-end web app at the end of the server startup procedure.

## Configure The Sample App

The Background Geolocation [Sample App](https://github.com/transistorsoft/cordova-background-geolocation-SampleApp) is perfect for use with this web-application.  To configure the app, determine your IP address and pick a unique console username, then simply edit `Settings->url` and set it to `http://<your.ip.ad.dress>:9000/locations/<your-console-username>`.

You may also want to configure `Settings->autoSync` to `false` while out field-testing as well, so that the app doesn't try syncing each recorded location to a possibly unreachable server running on your `localhost`.  Once you return after a test and you're back on your office Wifi, click the **[Sync]** button on the `Settings` screen to upload the cached locations to the **Background Geolocation Console** server.

## Configure Your Own App

As you integrate the background-geolocation plugin with your app, you may find it useful to post locations to the test console to verify your integration.

If you want to post to the tracking console in your own app, it’s very easy: The plugin contains a helper method [#transistorTrackerParams](https://transistorsoft.github.io/react-native-background-geolocation-android/classes/_react_native_background_geolocation_android_.backgroundgeolocation.html#transistortrackerparams) to compose a params config suitable for consumption by the server:

```javascript
//
// Configure the BackgroundGeolocation plugin to post to this console
// after modifying the #url / #params below, visit in your browser:
// http://<your.ip.ad.dress>:9000/<your-console-username
//
let username = 'your-custom-username';
BackgroundGeolocation.ready({
  url: 'http://<your-ip-address>/locations/' + <your-console-username>,
  params: BackgroundGeolocation.transistorTrackerParams()
}, (state) => {
  BackgroundGeolocation.start();
});
```

## Running on Heroku

You can deploy easily the app on Heroku by pushing the code to your heroku git repository.  

Before this, you will need to create 2 environment variables (either in the heroku dashboard, or by executing `heroku config:set <VARIABLE_NAME>=<VARIABLE_VALUE>`) :  

- `NPM_CONFIG_PRODUCTION = false` : It will tell heroku to install `devDependencies` (and not only `dependencies`), required to build browserify's `bundle.min.js` file
- `GMAP_API_KEY = <PUT YOUR KEY HERE>` : A Google Maps API v3 allowed for your heroku domain (see <https://console.developers.google.com>)
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
