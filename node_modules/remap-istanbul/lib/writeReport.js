require('istanbul/index');

const istanbulReportTypes = {
	clover: 'file',
	cobertura: 'file',
	html: 'directory',
	'json-summary': 'file',
	json: 'file',
	lcovonly: 'file',
	teamcity: 'file',
	'text-lcov': 'console',
	'text-summary': 'file',
	text: 'file',
};

/**
 * Generates an Istanbul Coverage report based on the information passed.
 * @param {istanbul/lib/_collector} collector An instance of a coverage collector
 * @param {string} reportType The name of the report type to generate
 * @param {object} reportOptions The options to pass to the reporter
 * @param {string|function} dest The filename or outputting function to use for generating the report
 * @param {istanbul/lib/store} [sources] A store of sources to be passed the reporter
 * @return {Promise} A promise that resolves when the report is complete.
 */
module.exports = function writeReport(collector, reportType, reportOptions, dest, sources) {
	return new Promise((resolve, reject) => {
		if (!(reportType in istanbulReportTypes)) {
			reject(new SyntaxError(`Unrecognized report type of "${reportType}".`));
			return;
		}
		const Reporter = require(`istanbul/lib/report/${reportType}`);
		const options = Object.assign({}, reportOptions);
		switch (istanbulReportTypes[reportType]) {
			case 'file':
				options.file = dest;
				break;
			case 'directory':
				options.dir = dest;
				break;
			case 'console':
				options.log = dest || console.log;
				break;
			default:
				throw new Error('Unknown reporter type');
		}
		if (sources) {
			options.sourceStore = sources;
		}
		const reporter = new Reporter(options);
		resolve(reporter.writeReport(collector, true));
	});
};
