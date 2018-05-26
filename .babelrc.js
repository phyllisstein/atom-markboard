module.exports = {
  presets: [
    ['@babel/env', {
      targets: {
        electron: '1.7.11',
      },
      loose: true,
      exclude: [
        'transform-async-to-generator',
        'transform-regenerator',
      ],
      useBuiltIns: 'usage',
    }],
  ],
  plugins: [
    ['module:fast-async', {
      compiler: {
        lazyThenables: true,
        parser: {
          sourceType: 'module',
        },
        promises: true,
        wrapAwait: true,
      },
      useRuntimeModule: true,
    }],
    'transform-promise-to-bluebird',
  ],
}
