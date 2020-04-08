// Coverage Preprocessor
// =====================
//
// Depends on the the reporter to generate an actual report

// Dependencies
// ------------

const { createInstrumenter } = require('istanbul-lib-instrument')
const minimatch = require('minimatch')
const path = require('path')
const globalSourceMapStore = require('./source-map-store')
const globalCoverageMap = require('./coverage-map')

// Regexes
// -------

const coverageObjRegex = /\{.*"path".*"fnMap".*"statementMap".*"branchMap".*\}/g

// Preprocessor creator function
function createCoveragePreprocessor (logger, basePath, reporters = [], coverageReporter = {}) {
  const log = logger.create('preprocessor.coverage')

  // Options
  // -------

  function isConstructor (Func) {
    try {
      // eslint-disable-next-line
      new Func()
    } catch (err) {
      // error message should be of the form: "TypeError: func is not a constructor"
      // test for this type of message to ensure we failed due to the function not being
      // constructable
      if (/TypeError.*constructor/.test(err.message)) {
        return false
      }
    }
    return true
  }

  function getCreatorFunction (Obj) {
    if (Obj.Instrumenter) {
      return function (opts) {
        return new Obj.Instrumenter(opts)
      }
    }
    if (typeof Obj !== 'function') {
      // Object doesn't have old instrumenter variable and isn't a
      // constructor, so we can't use it to create an instrumenter
      return null
    }
    if (isConstructor(Obj)) {
      return function (opts) {
        return new Obj(opts)
      }
    }
    return Obj
  }

  const instrumenters = { istanbul: createInstrumenter }
  const instrumenterOverrides = coverageReporter.instrumenter || {}
  const { includeAllSources = false, useJSExtensionForCoffeeScript = false } = coverageReporter

  Object.entries(coverageReporter.instrumenters || {}).forEach(([literal, instrumenter]) => {
    const creatorFunction = getCreatorFunction(instrumenter)
    if (creatorFunction) {
      instrumenters[literal] = creatorFunction
    }
  })

  const sourceMapStore = globalSourceMapStore.get(basePath)

  const instrumentersOptions = Object.keys(instrumenters).reduce((memo, key) => {
    memo[key] = {}

    if (coverageReporter.instrumenterOptions) {
      memo[key] = coverageReporter.instrumenterOptions[key]
    }

    return memo
  }, {})

  // if coverage reporter is not used, do not preprocess the files
  if (!reporters.includes('coverage')) {
    log.info('coverage not included in reporters %s', reporters)
    return function (content, _, done) {
      done(content)
    }
  }
  log.debug('coverage included in reporters %s', reporters)

  // check instrumenter override requests
  function checkInstrumenters () {
    const keys = Object.keys(instrumenters)
    return Object.values(instrumenterOverrides).some(literal => {
      const notIncluded = !keys.includes(String(literal))
      if (notIncluded) {
        log.error('Unknown instrumenter: %s', literal)
      }
      return notIncluded
    })
  }

  if (checkInstrumenters()) {
    return function (content, _, done) {
      return done(1)
    }
  }

  return function (content, file, done) {
    log.debug('Processing "%s".', file.originalPath)

    const jsPath = path.resolve(file.originalPath)
    // 'istanbul' is default instrumenters
    const instrumenterLiteral = Object.keys(instrumenterOverrides).reduce((res, pattern) => {
      if (minimatch(file.originalPath, pattern, { dot: true })) {
        return instrumenterOverrides[pattern]
      }
      return res
    }, 'istanbul')

    const instrumenterCreator = instrumenters[instrumenterLiteral]
    const constructOptions = instrumentersOptions[instrumenterLiteral] || {}
    let options = Object.assign({}, constructOptions)
    let codeGenerationOptions = null
    options.autoWrap = options.autoWrap || !options.noAutoWrap

    if (file.sourceMap) {
      log.debug('Enabling source map generation for "%s".', file.originalPath)
      codeGenerationOptions = Object.assign({}, {
        format: {
          compact: !constructOptions.noCompact
        },
        sourceMap: file.sourceMap.file,
        sourceMapWithCode: true,
        file: file.path
      }, constructOptions.codeGenerationOptions || {})
      options.produceSourceMap = true
    }

    options = Object.assign({}, options, { codeGenerationOptions: codeGenerationOptions })

    const instrumenter = instrumenterCreator(options)
    instrumenter.instrument(content, jsPath, function (err, instrumentedCode) {
      if (err) {
        log.error('%s\n  at %s', err.message, file.originalPath)
        done(err.message)
      } else {
        // Register the incoming sourceMap for transformation during reporting (if it exists)
        if (file.sourceMap) {
          sourceMapStore.registerMap(jsPath, file.sourceMap)
        }

        // Add merged source map (if it merged correctly)
        const lastSourceMap = instrumenter.lastSourceMap()
        if (lastSourceMap) {
          log.debug('Adding source map to instrumented file for "%s".', file.originalPath)
          file.sourceMap = lastSourceMap
          instrumentedCode += '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,'
          instrumentedCode += Buffer.from(JSON.stringify(lastSourceMap)).toString('base64') + '\n'
        }

        if (includeAllSources) {
          let coverageObj
          // Check if the file coverage object is exposed from the instrumenter directly
          if (instrumenter.lastFileCoverage) {
            coverageObj = instrumenter.lastFileCoverage()
            globalCoverageMap.add(coverageObj)
          } else {
            // Attempt to match and parse coverage object from instrumented code

            // reset stateful regex
            coverageObjRegex.lastIndex = 0
            const coverageObjMatch = coverageObjRegex.exec(instrumentedCode)
            if (coverageObjMatch !== null) {
              coverageObj = JSON.parse(coverageObjMatch[0])
              globalCoverageMap.add(coverageObj)
            }
          }
        }

        // RequireJS expects JavaScript files to end with `.js`
        if (useJSExtensionForCoffeeScript && instrumenterLiteral === 'ibrik') {
          file.path = file.path.replace(/\.coffee$/, '.js')
        }

        done(instrumentedCode)
      }
    }, file.sourceMap)
  }
}

createCoveragePreprocessor.$inject = [
  'logger',
  'config.basePath',
  'config.reporters',
  'config.coverageReporter'
]

module.exports = createCoveragePreprocessor
