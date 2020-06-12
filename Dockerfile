FROM node:12.18.0

EXPOSE 9000
WORKDIR /usr/src

COPY package*.json ./

RUN apt-get update && \
  apt-get install -y sqlite3 libsqlite3-dev && \
  npm i

COPY . .

ENV TZ=UTC
ENV NODE_PATH=./src/client/
ENV DYNO=1

# By default console will use SqlLite file storage
# NB!: It will clean on conatiner re-creation
#      add volume or setup Postgres/Firebase ENV
ENV DATABASE_URL=
# For Postgres SQL
# ENV DATABASE_URL=postgres://<username>:<password>@<hostname>:<port>/<dbname>
# Google Maps API Key for map
ENV GOOGLE_MAPS_API_KEY=AI...vNkg
# Do you use it for a lot of organisation or users?
ENV SHARED_DASHBOARD=
# Manage them in one account? http://host:9000/admin256
ENV ADMIN_TOKEN=
# Do you need auth?
ENV PASSWORD=

# Firebase way as example
# ENV FIREBASE_URL=https://geolocation-console.firebaseio.com
# ENV FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEv...Nw==\n-----END PRIVATE KEY-----
# ENV FIREBASE_PROJECT_ID=geolocation-console
# ENV FIREBASE_CLIENT_EMAIL=geolocation-console@appspot.gserviceaccount.com

RUN ./node_modules/.bin/webpack -p --progress && \
    NPM_CONFIG_PRODUCTION=true npm prune --production && \
    npm i sqlite3

ENV NPM_CONFIG_PRODUCTION=true
ENV NODE_ENV=production

CMD ["node", "./bin/server.js"]
