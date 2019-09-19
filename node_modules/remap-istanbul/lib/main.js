const MemoryStore = require('istanbul/lib/store/memory');
const loadCoverage = require('./loadCoverage');
const remap = require('./remap');
const writeReport = require('./writeReport');

/**
 * The basic API for utilising remap-istanbul
 * @param {Array|string} sources The sources that could be consumed and remapped.
 *		For muliple sources to be combined together, provide
 *		an array of strings.
 * @param  {Object} reports An object where each key is the report type required and the value
 *		is the destination for the report.
 * @param {Object} reportOptions? An object containing the report options.
 * @return {Promise} A promise that will resolve when all the reports are written.
 */
function remapIstanbul (sources, reports, reportOptions) {
	let sourceStore = new MemoryStore();
	const collector = remap(loadCoverage(sources), {
		sources: sourceStore,
	});

	if (!Object.keys(sourceStore.map).length) {
		sourceStore = undefined;
	}


	return Promise.all(
		Object.keys(reports)
			.map(reportType =>
				writeReport(collector, reportType, reportOptions || {}, reports[reportType], sourceStore)
			)
	);
}

// TODO: is this the desired public API?
remapIstanbul.loadCoverage = loadCoverage;
remapIstanbul.remap = remap;
remapIstanbul.writeReport = writeReport;

module.exports = remapIstanbul;
