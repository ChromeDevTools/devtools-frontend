// Report Creator
// ==============
//
// Wrapper of Istanbul's report creator to allow registering
// custom reporters

// Dependencies
// ------------
var istanbulReports = require('istanbul-reports')

var customReporterMap = {}

function register (reporter) {
  var registeredType = reporter.TYPE
  if (!registeredType) {
    throw new Error('Registering a custom reporter requires a type!')
  }

  customReporterMap[registeredType] = reporter
  return registeredType
}

function create (type, opts) {
  var Reporter = customReporterMap[type]
  if (Reporter) {
    return new Reporter(opts)
  }

  // fallback to istanbul's report creator if reporter isn't found
  return istanbulReports.create(type, opts)
}

function reset () {
  customReporterMap = {}
}

module.exports = {
  create: create,
  register: register,
  reset: reset
}
