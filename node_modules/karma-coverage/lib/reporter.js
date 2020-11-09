// Coverage Reporter
// Part of this code is based on [1], which is licensed under the New BSD License.
// For more information see the See the accompanying LICENSE-istanbul file for terms.
//
// [1]: https://github.com/gotwarlost/istanbul/blob/master/lib/command/check-coverage.js
// =====================
//
// Generates the report

// Dependencies
// ------------

var path = require('path')
var istanbulLibCoverage = require('istanbul-lib-coverage')
var istanbulLibReport = require('istanbul-lib-report')
var minimatch = require('minimatch')

var globalSourceMapStore = require('./source-map-store')
var globalCoverageMap = require('./coverage-map')
var reports = require('./report-creator')
const hasOwnProperty = Object.prototype.hasOwnProperty

// TODO(vojta): inject only what required (config.basePath, config.coverageReporter)
var CoverageReporter = function (rootConfig, helper, logger, emitter) {
  var log = logger.create('coverage')

  // Instance variables
  // ------------------

  this.adapters = []

  // Options
  // -------

  var config = rootConfig.coverageReporter || {}
  var basePath = rootConfig.basePath
  var reporters = config.reporters
  var sourceMapStore = globalSourceMapStore.get(basePath)
  var includeAllSources = config.includeAllSources === true

  if (config.watermarks) {
    config.watermarks = helper.merge({}, istanbulLibReport.getDefaultWatermarks(), config.watermarks)
  }

  if (!helper.isDefined(reporters)) {
    reporters = [config]
  }

  var coverageMaps

  function normalize (key) {
    // Exclude keys will always be relative, but covObj keys can be absolute or relative
    var excludeKey = path.isAbsolute(key) ? path.relative(basePath, key) : key
    // Also normalize for files that start with `./`, etc.
    excludeKey = path.normalize(excludeKey)

    return excludeKey
  }

  function getTrackedFiles (coverageMap, patterns) {
    var files = []

    coverageMap.files().forEach(function (key) {
      // Do any patterns match the resolved key
      var found = patterns.some(function (pattern) {
        return minimatch(normalize(key), pattern, { dot: true })
      })

      // if no patterns match, keep the key
      if (!found) {
        files.push(key)
      }
    })

    return files
  }

  function overrideThresholds (key, overrides) {
    var thresholds = {}

    // First match wins
    Object.keys(overrides).some(function (pattern) {
      if (minimatch(normalize(key), pattern, { dot: true })) {
        thresholds = overrides[pattern]
        return true
      }
    })

    return thresholds
  }

  function checkCoverage (browser, coverageMap) {
    var defaultThresholds = {
      global: {
        statements: 0,
        branches: 0,
        lines: 0,
        functions: 0,
        excludes: []
      },
      each: {
        statements: 0,
        branches: 0,
        lines: 0,
        functions: 0,
        excludes: [],
        overrides: {}
      }
    }

    var thresholds = helper.merge({}, defaultThresholds, config.check)

    var globalTrackedFiles = getTrackedFiles(coverageMap, thresholds.global.excludes)
    var eachTrackedFiles = getTrackedFiles(coverageMap, thresholds.each.excludes)
    var globalResults = istanbulLibCoverage.createCoverageSummary()
    var eachResults = {}
    globalTrackedFiles.forEach(function (f) {
      var fileCoverage = coverageMap.fileCoverageFor(f)
      var summary = fileCoverage.toSummary()
      globalResults.merge(summary)
    })
    eachTrackedFiles.forEach(function (f) {
      var fileCoverage = coverageMap.fileCoverageFor(f)
      var summary = fileCoverage.toSummary()
      eachResults[f] = summary
    })

    var coverageFailed = false

    function check (name, thresholds, actuals) {
      var keys = [
        'statements',
        'branches',
        'lines',
        'functions'
      ]

      keys.forEach(function (key) {
        var actual = actuals[key].pct
        var actualUncovered = actuals[key].total - actuals[key].covered
        var threshold = thresholds[key]

        if (threshold < 0) {
          if (threshold * -1 < actualUncovered) {
            coverageFailed = true
            log.error(browser.name + ': Uncovered count for ' + key + ' (' + actualUncovered +
              ') exceeds ' + name + ' threshold (' + -1 * threshold + ')')
          }
        } else {
          if (actual < threshold) {
            coverageFailed = true
            log.error(browser.name + ': Coverage for ' + key + ' (' + actual +
              '%) does not meet ' + name + ' threshold (' + threshold + '%)')
          }
        }
      })
    }

    check('global', thresholds.global, globalResults.toJSON())

    eachTrackedFiles.forEach(function (key) {
      var keyThreshold = helper.merge(thresholds.each, overrideThresholds(key, thresholds.each.overrides))
      check('per-file' + ' (' + key + ') ', keyThreshold, eachResults[key].toJSON())
    })

    return coverageFailed
  }

  // Generate the output path from the `coverageReporter.dir` and
  // `coverageReporter.subdir` options.
  function generateOutputPath (basePath, browserName, dir = 'coverage', subdir) {
    if (subdir && typeof subdir === 'function') {
      subdir = subdir(browserName)
    }
    if (browserName) {
      browserName = browserName.replace(':', '')
    }

    let outPutPath = path.join(dir, subdir || browserName)
    outPutPath = path.resolve(basePath, outPutPath)

    return helper.normalizeWinPath(outPutPath)
  }

  this.onRunStart = function (browsers) {
    coverageMaps = Object.create(null)

    // TODO(vojta): remove once we don't care about Karma 0.10
    if (browsers) {
      browsers.forEach(this.onBrowserStart.bind(this))
    }
  }

  this.onBrowserStart = function (browser) {
    var startingMap = {}
    if (includeAllSources) {
      startingMap = globalCoverageMap.get()
    }

    coverageMaps[browser.id] = istanbulLibCoverage.createCoverageMap(startingMap)
  }

  this.onBrowserComplete = function (browser, result) {
    var coverageMap = coverageMaps[browser.id]

    if (!coverageMap) return
    if (!result || !result.coverage) return

    coverageMap.merge(result.coverage)
  }

  this.onSpecComplete = function (browser, result) {
    var coverageMap = coverageMaps[browser.id]

    if (!coverageMap) return
    if (!result.coverage) return

    coverageMap.merge(result.coverage)
  }

  let checkedCoverage = {}
  let promiseComplete = null

  this.executeReport = async function (reporterConfig, browser) {
    const results = { exitCode: 0 }
    const coverageMap = coverageMaps[browser.id]
    if (!coverageMap) {
      return
    }

    const mainDir = reporterConfig.dir || config.dir
    const subDir = reporterConfig.subdir || config.subdir
    const outputPath = generateOutputPath(basePath, browser.name, mainDir, subDir)
    const remappedCoverageMap = await sourceMapStore.transformCoverage(coverageMap)

    const options = helper.merge(config, reporterConfig, {
      dir: outputPath,
      subdir: '',
      browser: browser,
      emitter: emitter,
      coverageMap: remappedCoverageMap
    })

    // If config.check is defined, check coverage levels for each browser
    if (hasOwnProperty.call(config, 'check') && !checkedCoverage[browser.id]) {
      checkedCoverage[browser.id] = true
      var coverageFailed = checkCoverage(browser, remappedCoverageMap)
      if (coverageFailed && results) {
        results.exitCode = 1
      }
    }

    const context = istanbulLibReport.createContext(options)
    const report = reports.create(reporterConfig.type || 'html', options)

    // // If reporting to console or in-memory skip directory creation
    const toDisk = !reporterConfig.type || !reporterConfig.type.match(/^(text|text-summary|in-memory)$/)

    if (!toDisk && reporterConfig.file === undefined) {
      report.execute(context)
      return
    }

    helper.mkdirIfNotExists(outputPath, function () {
      log.debug('Writing coverage to %s', outputPath)
      report.execute(context)
    })
    return results
  }

  this.onRunComplete = function (browsers) {
    checkedCoverage = {}
    let results = { exitCode: 0 }

    const promiseCollection = reporters.map(reporterConfig =>
      Promise.all(browsers.map(async (browser) => {
        const res = await this.executeReport(reporterConfig, browser)
        if (res && res.exitCode === 1) {
          results = res
        }
      })))
    promiseComplete = Promise.all(promiseCollection).then(() => results)
    return promiseComplete
  }

  this.onExit = async function (done) {
    const results = await promiseComplete
    if (results && results.exitCode === 1) {
      done(results.exitCode)
      return
    }
    if (typeof config._onExit === 'function') {
      config._onExit(done)
    } else {
      done()
    }
  }
}

CoverageReporter.$inject = ['config', 'helper', 'logger', 'emitter']

// PUBLISH
module.exports = CoverageReporter
