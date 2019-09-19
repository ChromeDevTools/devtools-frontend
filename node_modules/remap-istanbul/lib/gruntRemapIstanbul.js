const MemoryStore = require('istanbul/lib/store/memory');
const loadCoverage = require('./loadCoverage');
const remap = require('./remap');
const writeReport = require('./writeReport');

module.exports = function gruntPlugin(grunt) {
	grunt.registerMultiTask('remapIstanbul', function () {
		const done = this.async();
		const options = this.options();
		let sources = new MemoryStore();
		let p = [];

		function warn(message) {
			if (options.fail) {
				grunt.fail.warn(message);
			} else {
				grunt.log.error(message);
			}
		}

		this.files.forEach((file) => {
			const coverage = remap(loadCoverage(file.src, {
				readJSON: grunt.readJSON,
				warn,
			}), {
				readFile: grunt.readFile,
				readJSON: grunt.readJSON,
				warn,
				warnMissingSourceMaps: options.warnMissingSourceMaps,
				sources,
				basePath: file.basePath,
				useAbsolutePaths: options.useAbsolutePaths,
				exclude: options.exclude,
			});

			if (!Object.keys(sources.map).length) {
				sources = undefined;
			}

			if (file.type && file.dest) {
				p.push(writeReport(coverage, file.type, {}, file.dest, sources));
			} else {
				p = p.concat(Object.keys(options.reports).map((key) =>
					writeReport(coverage, key, options.reportOpts || {}, options.reports[key], sources)
				));
			}
		});

		Promise.all(p).then(() => {
			done();
		}, grunt.fail.fatal);
	});
};
