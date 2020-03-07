# Main things

1. The service account will register user org and sign JWT key (server-side)
2. Firebase rules will share their documents through JWT (client-side will load data from firebase)

# First

Create account on [console.firebase](https://console.firebase.google.com/) and the project realtime database.

Please add to environment variable your firebase url `export FIREBASE_URL=https://YOUR-PROJECT-DATABASE.firebaseio.com`

# [Service Account](https://console.cloud.google.com/iam-admin/serviceaccounts?authuser=0)

Please add Service Account with [Datastore Role] and do not forget save json his key as `export FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMII...=\n-----END PRIVATE KEY-----\n`

![Service Account](./service-account.png)

# Rules

Open Rules tab in Database section. Link will looks like
`https://console.firebase.google.com/project/[project-name]/database/firestore/rules`.

Copy and paste then:

## Cloud Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /Org/{token}/{document=**} {
     allow read, write, update, delete: if request.auth.token.org == token;
    }
  }
}
```

# Self check

```
export export GOOGLE_MAPS_API_KEY=AIz...Nkg && \
  export SHARED_DASHBOARD=1 && \
  export ADMIN_TOKEN=admin && \
  export PASSWORD=qwerty && \
  export FIREBASE_URL=https://geolocation-console.firebaseio.com && \
  export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMI...bNw==\n-----END PRIVATE KEY-----\n" && \
  export FIREBASE_PROJECT_ID=geolocation-console && \
  export FIREBASE_CLIENT_EMAIL=geolocation-console@appspot.gserviceaccount.com

./src/server/firebase/run.js
```

# Migration from DB

```
./bin/migration.js
```