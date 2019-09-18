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
