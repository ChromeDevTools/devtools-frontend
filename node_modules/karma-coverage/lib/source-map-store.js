var istanbulLibSourceMaps = require('istanbul-lib-source-maps')

var cache = {}

function get (basePath, opts) {
  if (!cache[basePath]) {
    cache[basePath] = istanbulLibSourceMaps.createSourceMapStore(opts)
  }
  return cache[basePath]
}

module.exports = {
  get: get
}
