const fs = require('fs');
const { Collector } = require('istanbul');

/**
 * Takes sources of coverage information and adds them to a collector which then can be subsequently
 * remapped.
 * @param {Array|string} sources The source(s) of the JSON coverage information
 * @param {Object} [options] A hash of options that can be set:
 *		readJSON?: A function that can read and parse a JSON file
 *		warn?: A function that logs warning messages
 * @return {Object} The loaded coverage object
 */
module.exports = function loadCoverage(sources, options = {}) {
	const warn = options.warn || console.warn;

	const readJSON = options.readJSON
		|| function (filePath) {
			if (!fs.existsSync(filePath)) {
				warn(new Error(`Cannot find file: "${filePath}"`));
				return {};
			}
			return JSON.parse(fs.readFileSync(filePath));
		};

	if (typeof sources === 'string') {
		sources = [sources];
	}
	if (!sources.length) {
		warn(new SyntaxError('No coverage files supplied!'));
	}
	const collector = new Collector();
	sources.forEach((filePath) => {
		collector.add(readJSON(filePath));
	});

	return collector.getFinalCoverage();
};
