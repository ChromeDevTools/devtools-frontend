const istanbul = require('istanbul');
const minimatch = require('minimatch');

function mixin(destination/*, ...mixins*/) {
	for (var i = 1; i < arguments.length; i++) {
		var source = arguments[i];
		for (var key in source) {
			destination[key] = source[key];
		}
	}
	return destination;
}

function overrideThresholds (key, overrides) {
	var thresholds = {};

	// First match wins
	Object.keys(overrides).some(function (pattern) {
		if (minimatch(normalize(key), pattern, {dot: true})) {
			thresholds = overrides[pattern];
			return true;
		}
	});

	return thresholds;
}

function removeFiles (covObj, patterns) {
	var obj = {};

	Object.keys(covObj).forEach(function (key) {
		// Do any patterns match the resolved key
		var found = patterns.some(function (pattern) {
			return minimatch(normalize(key), pattern, {dot: true});
		});

		// if no patterns match, keep the key
		if (!found) {
			obj[key] = covObj[key];
		}
	})

	return obj;
}

module.exports = function checkThreshold(checkOpt, collector) {
	var defaultThresholds = {
		global: {
			statements: 0,
			branches: 0,
			lines: 0,
			functions: 0,
			excludes: [],
		},
		each: {
			statements: 0,
			branches: 0,
			lines: 0,
			functions: 0,
			excludes: [],
			overrides: {},
		},
	};

	var thresholds = {
		global: mixin(defaultThresholds.global, checkOpt.global),
		each: mixin(defaultThresholds.each, checkOpt.each)
	};

	var rawCoverage = collector.getFinalCoverage();
	var globalResults = istanbul.utils.summarizeCoverage(removeFiles(rawCoverage, thresholds.global.excludes));
	var eachResults = removeFiles(rawCoverage, thresholds.each.excludes);

	// Summarize per-file results and mutate original results.
	Object.keys(eachResults).forEach(function (key) {
		eachResults[key] = istanbul.utils.summarizeFileCoverage(eachResults[key]);
	});

	var coverageFailed = false;

	function check (name, thresholds, actuals) {
		var keys = [
			'statements',
			'branches',
			'lines',
			'functions'
		];

		keys.forEach(function (key) {
			var actual = actuals[key].pct;
			var actualUncovered = actuals[key].total - actuals[key].covered;
			var threshold = thresholds[key];

			if (threshold < 0) {
				if (threshold * -1 < actualUncovered) {
					coverageFailed = true;
					console.error('Uncovered count for ' + key + ' (' + actualUncovered + 	') exceeds ' + name + ' threshold (' + -1 * threshold + ')');
				}
			} else {
				if (actual < threshold) {
					coverageFailed = true;
					console.error('Coverage for ' + key + ' (' + actual + '%) does not meet ' + name + ' threshold (' + threshold + '%)');
				}
			}
		});
	}

	check('global', thresholds.global, globalResults);

	Object.keys(eachResults).forEach(function (key) {
		var keyThreshold = mixin(thresholds.each, overrideThresholds(key, thresholds.each.overrides));
		check('per-file' + ' (' + key + ') ', keyThreshold, eachResults[key]);
	})

	return coverageFailed;
};
