"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var istanbulCoverage = require("istanbul-lib-coverage");
var test = require("tape");
var configuration_1 = require("../shared/configuration");
var threshold_1 = require("./threshold");
var karmaConfig = { karmaTypescriptConfig: { coverageOptions: { threshold: { file: {} } } } };
var configuration = new configuration_1.Configuration({});
configuration.initialize(karmaConfig);
var fileCoverage = {
    "path/to/coverage": istanbulCoverage.createFileCoverage("path/to/coverage")
};
var coverageMap = istanbulCoverage.createCoverageMap(fileCoverage);
test("threshold should pass", function (t) {
    t.plan(1);
    var threshold = new threshold_1.Threshold(configuration, null);
    var passed = threshold.check(null, coverageMap);
    t.true(passed);
});
//# sourceMappingURL=threshold.spec.js.map