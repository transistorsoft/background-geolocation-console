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

## Indexes

Please add Single field exemptions for device filter:

 * Collection: `Devices`
 * Field: `device_id`, `updated_at`
 * Query scope: `Collection group`

![Single field exemptions](./single-field-exemptions.png)


Please add Composite Index for device filter and sort:

![Composite index](./composite-index.png)

Those links may help, please change `[project-name]` to you application name in firstore:

https://console.firebase.google.com/v1/r/project/[project-name]/firestore/indexes?create_exemption=Clpwcm9qZWN0cy9nZW9sb2NhdGlvbi1jb25zb2xlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9EZXZpY2VzL2ZpZWxkcy9kZXZpY2VfaWQQAhoNCglkZXZpY2VfaWQQAQ

https://console.firebase.google.com/v1/r/project/[project-name]/firestore/indexes?create_composite=ClNwcm9qZWN0cy9nZW9sb2NhdGlvbi1jb25zb2xlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9EZXZpY2VzL2luZGV4ZXMvXxACGg0KCWRldmljZV9pZBABGg4KCnVwZGF0ZWRfYXQQAhoMCghfX25hbWVfXxAC

https://console.firebase.google.com/v1/r/project/[project-name]/firestore/indexes?create_exemption=Cltwcm9qZWN0cy9nZW9sb2NhdGlvbi1jb25zb2xlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9EZXZpY2VzL2ZpZWxkcy91cGRhdGVkX2F0EAIaDgoKdXBkYXRlZF9hdBAC

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

./src/server/firebase/check.js
```

# Migration from DB

```
./bin/migration.js
```