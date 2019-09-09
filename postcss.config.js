// could not migrate to webpack 4
// https://github.com/react-toolbox/react-toolbox/issues/1893
// guide
// https://github.com/react-toolbox/react-toolbox/wiki/Migrating-from-version-2.0-to-3.0

module.exports = {
  plugins: {
    'postcss-cssnext': {},
    // 'postcss-preset-env': {
    //   // stage: 0,
    //   features: {
    //     'custom-properties': {
    //       preserve: false, // returns calculated values instead of variable names
    //       // variables: reactToolboxVariables,
    //     },
    //     'color-mod-function': true, // if you use a stage later than 0
    //   },
    // },
    // 'postcss-calc': {},
    'postcss-modules-values': {},
    'postcss-color-mod-function': {},
  },
};
