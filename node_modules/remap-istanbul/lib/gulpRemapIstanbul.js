const MemoryStore = require('istanbul/lib/store/memory');
const PluginError = require('plugin-error');
const through = require('through2');
const checkThreshold = require('./checkThreshold');
const remap = require('./remap');
const writeReport = require('./writeReport');

module.exports = function gulpPlugin(opts = {}) {
	return through.obj((file, enc, cb) => {
		if (!opts.warn) {
			opts.warn = (message) => {
				if (opts.fail) {
					cb(new PluginError('remap-istanbul', message));
				} else {
					console.error(message);
				}
			};
		}

		opts.sources = new MemoryStore();

		if (file.isNull()) {
			cb(null, file);
		}

		if (file.isStream()) {
			cb(new PluginError('remap-istanbul', 'Streaming not supported'));
		}

		const collector = remap(JSON.parse(file.contents.toString('utf8')), opts);

		let thresholdCheckFailed = false;
		if (opts.check) {
			thresholdCheckFailed = checkThreshold(opts.check, collector);
		}

		let sources;
		if (Object.keys(opts.sources.map).length) {
			sources = opts.sources;
		}

		const p = [];
		if (opts.reports) {
			Object.keys(opts.reports).forEach((key) => {
				p.push(writeReport(collector, key, opts.reportOpts || {}, opts.reports[key], sources));
			});
		}

		file.contents = Buffer.from(JSON.stringify(collector.getFinalCoverage()));

		Promise.all(p).then(() => {
			if (thresholdCheckFailed) {
				return cb(new PluginError('remap-istanbul', 'Coverage threshold not met'));
			} else {
				cb(null, file);
			}
		});
	});
};
