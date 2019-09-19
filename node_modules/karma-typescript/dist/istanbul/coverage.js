"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Coverage = /** @class */ (function () {
    function Coverage(config) {
        this.config = config;
        this.coverage = require("karma-coverage/lib/preprocessor");
    }
    Coverage.prototype.initialize = function (helper, logger) {
        var _this = this;
        this.log = logger.create("coverage.karma-typescript");
        this.log.debug("Initializing");
        this.config.whenReady(function () {
            _this.log.debug("Configuring coverage preprocessor");
            _this.coveragePreprocessor = _this.coverage(logger, helper, _this.config.karma.basePath, _this.config.reporters, _this.config.coverageReporter);
        });
    };
    Coverage.prototype.instrument = function (file, bundled, emitOutput, callback) {
        if (this.config.hasPreprocessor("commonjs")) {
            this.log.debug("karma-commonjs already configured");
            callback(bundled);
            return;
        }
        if (this.config.hasPreprocessor("coverage")) {
            this.log.debug("karma-coverage already configured");
            callback(bundled);
            return;
        }
        if (!this.config.coverageOptions.instrumentation ||
            this.isExcluded(this.config.coverageOptions.exclude, file.relativePath) ||
            this.hasNoOutput(emitOutput)) {
            this.log.debug("Excluding file %s from instrumentation", file.originalPath);
            callback(bundled);
            return;
        }
        this.coveragePreprocessor(bundled, file, callback);
    };
    Coverage.prototype.hasNoOutput = function (emitOutput) {
        return emitOutput.outputText.startsWith("//# sourceMappingURL=");
    };
    Coverage.prototype.isExcluded = function (regex, path) {
        if (Array.isArray(regex)) {
            for (var _i = 0, regex_1 = regex; _i < regex_1.length; _i++) {
                var r = regex_1[_i];
                if (r.test(path)) {
                    return true;
                }
            }
            return false;
        }
        return regex.test(path);
    };
    return Coverage;
}());
exports.Coverage = Coverage;
//# sourceMappingURL=coverage.js.map