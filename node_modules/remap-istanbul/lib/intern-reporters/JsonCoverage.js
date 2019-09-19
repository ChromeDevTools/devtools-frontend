const Collector = require('istanbul/lib/collector');
const Reporter = require('istanbul/lib/report/json');

function JsonCoverageReporter(config = {}) {
	this._collector = new Collector();
	this._reporter = new Reporter({
		file: config.filename,
		watermarks: config.watermarks,
	});
}

JsonCoverageReporter.prototype.coverage = function coverage(sessionId, coverageData) {
	this._collector.add(coverageData);
};

JsonCoverageReporter.prototype.runEnd = function runEnd() {
	this._reporter.writeReport(this._collector, true);
};

module.exports = JsonCoverageReporter;
