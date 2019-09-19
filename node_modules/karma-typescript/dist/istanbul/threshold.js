"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var istanbul = require("istanbul");
var lodash_1 = require("lodash");
var minimatch = require("minimatch");
var file_utils_1 = require("../shared/file-utils");
var Threshold = /** @class */ (function () {
    function Threshold(config, log) {
        this.config = config;
        this.log = log;
    }
    Threshold.prototype.check = function (browser, collector) {
        var _this = this;
        var thresholdConfig = this.config.coverageOptions.threshold;
        var finalCoverage = collector.getFinalCoverage();
        var globalCoverage = this.excludeFiles(finalCoverage, thresholdConfig.global.excludes);
        var globalResults = istanbul.utils.summarizeCoverage(globalCoverage);
        var passedThreshold = true;
        var checkThresholds = function (name, thresholds, results) {
            ["branches", "functions", "lines", "statements"].forEach(function (key) {
                var result = results[key];
                var uncovered = result.total - result.covered;
                var threshold = thresholds[key];
                if (threshold < 0 && threshold * -1 < uncovered) {
                    passedThreshold = false;
                    _this.log.error("%s: Expected max %s uncovered %s, got %s (%s)", browser.name, (-1 * threshold), key, uncovered, name);
                }
                else if (result.pct < threshold) {
                    passedThreshold = false;
                    _this.log.error("%s: Expected %s% coverage for %s, got %s% (%s)", browser.name, threshold, key, result.pct, name);
                }
            });
        };
        checkThresholds("global", thresholdConfig.global, globalResults);
        Object.keys(finalCoverage).forEach(function (filename) {
            var relativeFilename = file_utils_1.FileUtils.getRelativePath(filename, _this.config.karma.basePath);
            var excludes = _this.config.coverageOptions.threshold.file.excludes;
            if (!_this.isExcluded(relativeFilename, excludes)) {
                var fileResult = istanbul.utils.summarizeFileCoverage(finalCoverage[filename]);
                var thresholds = lodash_1.merge(thresholdConfig.file, _this.getFileOverrides(relativeFilename));
                checkThresholds(filename, thresholds, fileResult);
            }
        });
        return passedThreshold;
    };
    Threshold.prototype.excludeFiles = function (coverage, excludes) {
        var _this = this;
        var result = {};
        Object.keys(coverage).forEach(function (filename) {
            if (!_this.isExcluded(file_utils_1.FileUtils.getRelativePath(filename, _this.config.karma.basePath), excludes)) {
                result[filename] = coverage[filename];
            }
        });
        return result;
    };
    Threshold.prototype.isExcluded = function (relativeFilename, excludes) {
        return excludes.some(function (pattern) {
            return minimatch(relativeFilename, pattern, { dot: true });
        });
    };
    Threshold.prototype.getFileOverrides = function (relativeFilename) {
        var thresholds = {};
        var overrides = this.config.coverageOptions.threshold.file.overrides;
        Object.keys(overrides).forEach(function (pattern) {
            if (minimatch(relativeFilename, pattern, { dot: true })) {
                thresholds = overrides[pattern];
            }
        });
        return thresholds;
    };
    return Threshold;
}());
exports.Threshold = Threshold;
//# sourceMappingURL=threshold.js.map