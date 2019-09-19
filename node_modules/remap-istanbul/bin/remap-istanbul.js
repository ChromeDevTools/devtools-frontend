#!/usr/bin/env node

const Collector = require('istanbul/lib/collector');
const MemoryStore = require('istanbul/lib/store/memory');
const loadCoverage = require('../lib/loadCoverage');
const remap = require('../lib/remap');
const writeReport = require('../lib/writeReport');

/**
 * Helper function that reads from standard in and resolves a Promise with the
 * data or rejects with any errors.
 * @return {Promise} A promise that is resolved with the data from standard in
 *                   or rejected with any errors.
 */
function readStdIn() {
	/* istanbul ignore next: too challenging to test for reading from stdin */
	return new Promise((resolve, reject) => {
		const stdin = process.stdin;
		let buffer = '';

		stdin.setEncoding('utf8');

		stdin.on('data', (data) => {
			buffer += data;
		});

		stdin.on('error', (e) => {
			reject(e);
		});

		stdin.on('end', () => {
			resolve(buffer);
		});

		try {
			stdin.resume();
		} catch (e) {
			reject(e);
		}
	});
}

/**
 * The main wrapper to provide a CLI interface to remap-istanbul
 * @param  {Array}   argv An array of arguments passed the process
 * @return {Promise}      A promise that resolves when the remapping is complete
 *                        or rejects if there is an error.
 */
function main(argv) {
	/* jshint maxcomplexity:13 */

	/**
	 * Helper function that processes the arguments
	 * @return {String} The next valid argument
	 */
	function getArg() {
		let arg = argv.shift();
		if (arg && arg.indexOf('--') === 0) {
			arg = arg.split('=');
			if (arg.length > 1) {
				argv.unshift(arg.slice(1).join('='));
			}
			arg = arg[0];
		} else if (arg && arg[0] === '-') {
			/* istanbul ignore if */
			if (arg.length > 2) {
				argv = arg.substring(1).split('')
					.map((ch) => '-' + ch)
					.concat(argv);
				arg = argv.shift();
			}
		}

		return arg;
	}

	let arg;
	const inputFiles = [];
	let output;
	let reportType;
	let basePath;
	let exclude;
	for (arg = getArg(); arg; arg = getArg()) {
		switch (arg) {
			case '-i':
			case '--input':
				inputFiles.push(argv.shift());
				break;
			case '-o':
			case '--output':
				output = argv.shift();
				break;
			case '-b':
			case '--basePath':
				basePath = argv.shift();
				break;
			case '-t':
			case '--type':
				reportType = argv.shift();
				break;
			case '-e':
			case '--exclude':
				exclude = argv.shift();
				if (exclude.indexOf(',') !== -1) {
					exclude = new RegExp(exclude.replace(/,/g, '|'));
				}
				break;
			default:
				throw new SyntaxError(`Unrecognised argument: "${arg}".`);
		}
	}

	return new Promise((resolve, reject) => {
		const coverage = inputFiles.length ? loadCoverage(inputFiles) :
			/* istanbul ignore next */
			readStdIn().then((data) => {
				try {
					data = JSON.parse(data);
					const collector = new Collector();
					collector.add(data);
					return collector.getFinalCoverage();
				} catch (err) {
					console.error(err.stack);
					throw err;
				}
			}, reject);

		resolve(coverage);
	}).then((coverage) => {
		let sources = new MemoryStore();
		const collector = remap(coverage, {
			sources,
			basePath: basePath || undefined,
			exclude: exclude || undefined,
		});
		if (!Object.keys(sources.map).length) {
			sources = undefined;
		}
		const reportOptions = {};
		if (output) {
			if (output === 'null') {
				output = null;
			}
			return writeReport(collector, reportType || 'json', reportOptions, output, sources);
		}
		if (reportType && (reportType === 'lcovonly' || reportType === 'text-lcov')) {
			return writeReport(collector, 'text-lcov', reportOptions);
		}
		process.stdout.write(JSON.stringify(collector.getFinalCoverage()) + '\n');
		return null;
	});
}

/* istanbul ignore if: we use the module interface in testing */
if (!module.parent) {
	process.title = 'remap-istanbul';
	/* first two arguments are meaningless to the process */
	main(process.argv.slice(2))
		.then(
			(code) => process.exit(code || 0),
			(err) => {
				console.log(err.stack);
				process.exit(1);
			});
} else {
	module.exports = main;
}
