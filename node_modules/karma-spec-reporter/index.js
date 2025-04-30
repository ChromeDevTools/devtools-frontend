var colors = require('colors'),
    LOG_PRIORITIES = require('karma').constants.LOG_PRIORITIES;

var SpecReporter = function (baseReporterDecorator, formatError, config) {
  baseReporterDecorator(this);

  var platform = process ? process.platform : 'unknown';
  var selectPrefix = function(defaultMarker, win32Marker) {
    return platform === 'win32' ? win32Marker : defaultMarker;
  }
  var reporterCfg = config.specReporter || {};
  this.prefixes = Object.assign({
      success: selectPrefix('✓ ', '\u221A '),
      failure: selectPrefix('✗ ', '\u00D7 '),
      skipped: selectPrefix('- ', '\- ')
    }, reporterCfg.prefixes);

  this.failures = [];
  this.slowPokes = [];

  this.USE_COLORS = false;
  this.SPEC_FAILURE = '%s %s FAILED\n';
  this.SPEC_SLOW = '%s SLOW %s: %s\n';
  this.ERROR = '%s ERROR\n';
  this.FINISHED_ERROR = ' ERROR';
  this.FINISHED_SUCCESS = ' SUCCESS';
  this.FINISHED_DISCONNECTED = ' DISCONNECTED';
  this.X_FAILED = ' (%d FAILED)';
  this.TOTAL_SUCCESS = 'TOTAL: %d SUCCESS\n';
  this.TOTAL_FAILED = 'TOTAL: %d FAILED, %d SUCCESS\n';

  // colorize output of BaseReporter functions
  if (config.colors) {
    colors.enabled = true;
    this.USE_COLORS = true;
    this.SPEC_FAILURE = '%s %s FAILED'.red + '\n';
    this.SPEC_SLOW = '%s SLOW %s: %s'.yellow + '\n';
    this.ERROR = '%s ERROR'.red + '\n';
    this.FINISHED_ERROR = ' ERROR'.red;
    this.FINISHED_SUCCESS = ' SUCCESS'.green;
    this.FINISHED_DISCONNECTED = ' DISCONNECTED'.red;
    this.X_FAILED = ' (%d FAILED)'.red;
    this.TOTAL_SUCCESS = 'TOTAL: %d SUCCESS'.green + '\n';
    this.TOTAL_FAILED = 'TOTAL: %d FAILED, %d SUCCESS'.red + '\n';
  }

  this.onRunComplete = function (browsers, results) {
    //NOTE: the renderBrowser function is defined in karma/reporters/Base.js
    if (!this.suppressSummary) {
      this.writeCommonMsg('\n' + browsers.map(this.renderBrowser)
          .join('\n') + '\n');
    }

    if (browsers.length >= 1 && !results.disconnected && !results.error) {
      var currentTime = reporterCfg.showSpecTiming ?
        (this.USE_COLORS ? (new Date().toLocaleString() + ' - ').yellow : (new Date().toLocaleString() + ' - ')) :
        '';
      if (!results.failed) {
        if (!this.suppressSummary) {
          this.write(currentTime + this.TOTAL_SUCCESS, results.success);
        }
      } else {
        if (!this.suppressSummary) {
          this.write(currentTime + this.TOTAL_FAILED, results.failed, results.success);
        }
        if (!this.suppressErrorSummary) {
          this.logFinalErrors(this.failures);
        }
      }
      if (this.reportSlowerThan) {
        this.logFinalSlow(this.slowPokes);
      }
    }

    this.write('\n');
    this.failures = [];
    this.currentSuite = [];
    this.slowPokes = [];
  };

  this.logFinalErrors = function (errors) {
    this.writeCommonMsg('\n\n');
    this.WHITESPACE = '     ';

    errors.forEach(function (failure, index) {
      index = index + 1;

      if (index > 1) {
        this.writeCommonMsg('\n');
      }

      this.writeCommonMsg(this.USE_COLORS ?
        (index + ') ' + failure.description + '\n').red :
        (index + ') ' + failure.description + '\n'));
        
      this.writeCommonMsg(this.USE_COLORS ?
        (this.WHITESPACE + failure.suite.join(' ') + '\n').red :
        (this.WHITESPACE + failure.suite.join(' ') + '\n'));
      failure.log.forEach(function (log) {
        if (reporterCfg.maxLogLines) {
          log = log.split('\n').slice(0, reporterCfg.maxLogLines).join('\n');
        }
        this.writeCommonMsg(this.USE_COLORS ?
          (this.WHITESPACE + formatError(log).replace(/\\n/g, '\n')).grey :
          (this.WHITESPACE + formatError(log).replace(/\\n/g, '\n')));
      }, this);
    }, this);

    this.writeCommonMsg('\n');
  };

  this.logFinalSlow = function(slowPokes) {
    this.writeCommonMsg('\n\n');
    this.WHITESPACE = '     ';
    slowPokes
      .sort(function(next, prev) {
        if (next.time > prev.time) {
          return -1;
        } else if (next.time < prev.time) {
          return 1;
        } else {
          return 0;
        }
      })
      .forEach(function(slowPoke, index) {
        // Only show the top 5
        if (index > 4) {
          return;
        }

        index = index + 1;

        if (index == 1) {
          this.writeCommonMsg(('SLOW: ' + slowPokes.length + '\n\n').yellow);
          this.writeCommonMsg(('5 Slowest: ' + '\n').yellow);
        }
        this.writeCommonMsg((index + ') ' + slowPoke.fullName + ' (' + slowPoke.time + ')' + '\n').yellow);
      }, this);
  };

  this.currentSuite = [];
  this.writeSpecMessage = function (status) {
    return (function (browser, result) {
      var suite = result.suite;
      var indent = "  ";
      suite.forEach(function (value, index) {
        if (index >= this.currentSuite.length || this.currentSuite[index] != value) {
          if (index === 0) {
            this.writeCommonMsg('\n');
          }

          this.writeCommonMsg(indent + value + '\n');
          this.currentSuite = [];
        }

        indent += '  ';
      }, this);

      this.currentSuite = suite;

      var specName = result.description;
      var browserName = reporterCfg.showBrowser ? ' [' + browser.name + ']' : '';
      var elapsedTime = reporterCfg.showSpecTiming ? ' (' + result.time + 'ms)' : '';

      if (config.reportSlowerThan && result.time > config.reportSlowerThan) {
        this.logSlowPoke(result);
      }

      if (this.USE_COLORS) {
        if (result.skipped) specName = specName.cyan;
        else if (!result.success) specName = specName.red;
      }

      var msg = indent + status + specName + browserName + elapsedTime;

      result.log.forEach(function (log) {
        if (reporterCfg.maxLogLines) {
          log = log.split('\n').slice(0, reporterCfg.maxLogLines).join('\n');
        }
        msg += '\n' + formatError(log, '\t');
      });

      this.writeCommonMsg(msg + '\n');

      // NOTE: other useful properties
      // browser.id;
      // browser.fullName;
    }).bind(this);
  };

  this.LOG_SINGLE_BROWSER = '%s LOG: %s\n';
  this.LOG_MULTI_BROWSER = '%s %s LOG: %s\n';
  var bCfg = config && config.browserConsoleLogOptions || {};
  var bLogThreshold = LOG_PRIORITIES.indexOf((bCfg && bCfg.level || 'DEBUG').toUpperCase());
  var doLog = config && config.browserConsoleLogOptions && config.browserConsoleLogOptions.terminal;
  this.onBrowserLog = bCfg.terminal ? function (browser, log, type) {
    type = type.toUpperCase();
    if (LOG_PRIORITIES.indexOf(type) > bLogThreshold) return;
    if (this._browsers && this._browsers.length === 1) {
      this.write(this.LOG_SINGLE_BROWSER, type, this.USE_COLORS ? log.cyan : log);
    } else {
      this.write(this.LOG_MULTI_BROWSER, browser, type, this.USE_COLORS ? log.cyan : log);
    }
  } : noop;

  function noop() {
  }

  this.onSpecFailure = function (browsers, results) {
    this.failures.push(results);
    this.writeSpecMessage(this.USE_COLORS ? this.prefixes.failure.red : this.prefixes.failure).apply(this, arguments);
    if (reporterCfg.failFast) {
      throw new Error('Fail fast active for tests, exiting(failFast option is enabled)');
    }
  };

  this.logSlowPoke = function(result) {
    this.slowPokes.push(result);
  };

  this.specSuccess = reporterCfg.suppressPassed
    ? noop
    : this.writeSpecMessage(this.USE_COLORS ? this.prefixes.success.green : this.prefixes.success);
  this.specSkipped = reporterCfg.suppressSkipped
    ? noop
    : this.writeSpecMessage(this.USE_COLORS ? this.prefixes.skipped.cyan : this.prefixes.skipped);
  this.specFailure = reporterCfg.suppressFailed ? noop : this.onSpecFailure;
  this.suppressSummary = reporterCfg.suppressSummary || false;
  this.suppressErrorSummary = reporterCfg.suppressErrorSummary || false;
  this.showSpecTiming = reporterCfg.showSpecTiming || false;
  this.showBrowser = reporterCfg.showBrowser || false;
  this.reportSlowerThan = config.reportSlowerThan || reporterCfg.reportSlowerThan || false;
};

SpecReporter.$inject = ['baseReporterDecorator', 'formatError', 'config'];

module.exports = {
  'reporter:spec': ['type', SpecReporter]
};
