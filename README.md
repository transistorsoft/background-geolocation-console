# Background Geolocation Console

> A simple server & web app for field-testing & analysis of the Background Geolocation plugin

## Running

You must have [npm](https://www.npmjs.org/) installed on your computer.
From the root project directory run these commands from the command line:

    npm install

This will install all dependencies.

To build the project, first run this command:

    npm start

This will perform an initial build and start a watcher process that will update bundle.js with any changes you wish to make.  This watcher is based on [Browserify](http://browserify.org/) and [Watchify](https://github.com/substack/watchify), and it transforms React's JSX syntax into standard JavaScript with [Reactify](https://github.com/andreypopp/reactify).

To run the app in your browser, boot the web server

    node server.js

Now visit [http://localhost:8080](http://localhost:8080)

## Credit

Chris Scott of [Transistor Software](http://transistorsoft.com)

## License

BSD-licensed.
