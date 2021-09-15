module.exports = {
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "esmodules": true
        },
        "modules": false,
        "useBuiltIns": false
      }
    ],
    "@babel/preset-react"
  ],
  "plugins": [
    ["babel-plugin-transform-flow-strip-types"],
    ['@babel/plugin-proposal-class-properties'],
    ["transform-define", {
      "process.env.FIREBASE_URL": process.env.FIREBASE_URL,
      "process.env.GOOGLE_ANALYTICS_ID": process.env.GOOGLE_ANALYTICS_ID,
      "process.env.GOOGLE_MAPS_API_KEY": process.env.GOOGLE_MAPS_API_KEY,
      "process.env.NODE_ENV": process.env.NODE_ENV,
      "process.env.PURE_CHAT_ID": process.env.PURE_CHAT_ID,
      "process.env.SHARED_DASHBOARD": process.env.SHARED_DASHBOARD,
    }]
  ]
}
