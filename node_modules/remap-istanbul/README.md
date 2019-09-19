# remap-istanbul

[![Build Status](https://travis-ci.org/SitePen/remap-istanbul.svg?branch=master)](https://travis-ci.org/SitePen/remap-istanbul) [![codecov.io](http://codecov.io/github/SitePen/remap-istanbul/coverage.svg?branch=master)](http://codecov.io/github/SitePen/remap-istanbul?branch=master)
[![npm version](https://badge.fury.io/js/remap-istanbul.svg)](http://badge.fury.io/js/remap-istanbul)
[![dependencies Status](https://david-dm.org/SitePen/remap-istanbul/status.svg)](https://david-dm.org/SitePen/remap-istanbul)
[![devDependencies Status](https://david-dm.org/SitePen/remap-istanbul/dev-status.svg)](https://david-dm.org/SitePen/remap-istanbul?type=dev)

[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/SitePen/remap-istanbul.svg)](http://isitmaintained.com/project/SitePen/remap-istanbul "Average time to resolve an issue")
[![Percentage of issues still open](http://isitmaintained.com/badge/open/SitePen/remap-istanbul.svg)](http://isitmaintained.com/project/SitePen/remap-istanbul "Percentage of issues still open")

A package that provides the ability to remap [Istanbul](https://gotwarlost.github.io/istanbul/) code coverage information to its original source positions based on a JavaScript [Source Maps v3](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.djovrt4kdvga).

`remap-istanbul` requires Node.js 8 or later.

## Important Information

This package adds remapping functionality for the deprecated 0.x version of [Istanbul](https://github.com/gotwarlost/istanbul). The newer and actively maintained [IstanbulJS](https://github.com/istanbuljs/istanbuljs) includes remapping functionality directly, so this package (remap-istanbul) is not needed for anyone working with IstanbulJS. We strongly encourage developers to leverage IstanbulJS, and only use this package (remap-istanbul) when needing to support legacy versions of Istanbul.

## How to get Help

This is covered in depth in the [CONTRIBUTING.md](CONTRIBUTING.md#how-to-get-help) document in the repo.

## Usage

For information on how to use `remap-istanbul` with common testing frameworks, please visit the [wiki](https://github.com/SitePen/remap-istanbul/wiki).

There are three main modules that constitute the **remap-istanbul** package:

 - **lib/loadCoverage** - does the basic loading of a Istanbul JSON coverage files.  It can "merge" several coverage files, for example if you are collecting remote coverage from other environments and combining it together.
 - **lib/remap** - does the remapping of the coverage information.  It iterates through all the files in the coverage information and looks for JavaScript Source Maps which it will then use to remap the coverage information to the original source.
 - **lib/writeReport** - a wrapper for the Istanbul report writers to output the any final coverage reports.

### Command Line

The package includes a command line interface which should be placed into the `./node_modules/.bin/remap-istanbul` when the package is installed.  The command line interface understands the following argument flags:

|Flag                |Description|
|--------------------|-----------|
|`-i` or `--input`   |The path to the coverage input file. For example `remap-istanbul --input coverage.json`. If omitted, input will be taken from stdin.|
|`-o` or `--output`  |The path to the remapped coverage output file.  For example `remap-istanbul --output coverage-final.json`. If omitted, `json` output will be sent to stdout.|
|`-t` or `--type`    |The type of report the output should be.  For example `remap-istanbul --output html-report --type html`. If omitted, output defaults to `json`.|
|`-b` or `--basePath`|When remapping the source files, instead of using the path in the source map, substitute this path.|
|`-e` or `--exclude`|Pass in a comma seperated string of patterns (exact strings or regexps) to exclude from the output.  For example `remap-istanbul --output coverage-final.json --exclude node_modules,tests`|

An example of piping a coverage file to the CLI and writing it out to a file:

```bash
$ cat coverage-final.json | ./node_modules/.bin/remap-istanbul -o coverage-remapped.json
```

An example of generating an HTML report off of remapped coverage:

```bash
$ ./node_modules/.bin/remap-istanbul -i coverage-final.json -o html-report -t html
```

An example of taking the stdin and writing the stdout in the CLI:

```bash
$ cat coverage-final.json | ./node_modules/.bin/remap-istanbul > coverage-remap.json
```

### Basic JavaScript

The main CommonJS module provided combines the modules above into a single API which basic usage can look like this:

```js
var remapIstanbul = require('remap-istanbul');
remapIstanbul('coverage-final.json', {
	'json': 'coverage-final.json'
});
```

This would take the coverage file provided.  The function accepts the following arguments:

|Argument|Type|Description|
|--------|----|-----------|
|sources|Array, string|Either an array of strings or a string the represent the JSON Istanbul files to be remapped|
|reports|Object|A hash of reports, where the keys are the Istanbul report types and the values are the destination for the report. To send output to the console use the destination null.|
|*returns*|Promise|A promise that is resolved when all the reports are written|

### AMD

The main modules are provided in AMD for usage (although they utilize `amdefine` to allow transparent loading by a CommonJS loader such as NodeJS's `require` - see blow).

#### `lib/loadCoverage`

The `lib/loadCoverage` module would be used something like this:

```js
require([ 'remap-istanbul/lib/loadCoverage' ], function (loadCoverage) {
	var coverage = loadCoverage('coverage-final.json');
	/* or if you have multiple files you want to merge */
	coverage = loadCoverage([ 'coverage-ie.json', 'coverage-chrome.json', 'coverage-firefox.json' ]);
});
```

The argument signature for `loadCoverage` is:

|Argument|Type|Description|
|--------|----|-----------|
|coverage|Array/string|Either an array of strings or a string representing the file path to the coverage file(s).|
|options|Object?|An object that allows providing alternative methods, mainly used for integration with other systems (e.g. Grunt)|
|*returns*|Object|A coverage object that is ready to be remapped|

The `options` argument can take the following optional properties:

|Property|Type|Default|Description|
|--------|----|-------|-----------|
|readJSON|Function|`JSON.parse(fs.readFileSync)`|A function that will synchronously read a file and return a POJO based on the JSON data in the file|
|warn|Function|`console.warn`|A function that logs warning messages|

#### `lib/remap`

Usage of the `lib/remap` module would look something like this:

```js
require([
	'remap-istanbul/lib/loadCoverage',
	'remap-istanbul/lib/remap'
], function (loadCoverage, remap) {
	var coverage = loadCoverage('coverage-final.json');
	var collector = remap(coverage); /* collector now contains the remapped coverage */
});
```

If the source map no longer points properly at the source files, you can utilize the `basePath` option to override the path retrieved from the source map:

```js
require([
	'remap-istanbul/lib/loadCoverage',
	'remap-istanbul/lib/remap'
], function (loadCoverage, remap) {
	var coverage = loadCoverage('coverage-final.json');
	var collector = remap(coverage, {
		basePath: 'some/other/path/to/sources'
	});
});
```

The argument signature for `remap` is:

|Argument|Type|Description|
|--------|----|-----------|
|coverage|Array/Object|Either an array of coverage objects or a single coverage object.|
|options|Object?|An object that allows providing alternative methods, mainly used for integration with other systems (e.g. Grunt)|
|*returns*|istanbul/lib/collector|An Istanbul coverage collector that is ready to be output|

The argument of `options` can contain the following properties:

|Property|Type|Default|Description|
|--------|----|-------|-----------|
|basePath|String|Path found in source map|A string to use as the base path for the source locations|
|exclude|String/RegEx/Function|`undefined`|If the filename of the source coverage file matches the String or RegEx, it will be skipped while mapping the coverage. Optionally, you can use a function that accepts the filename as the argument, and returns true if the file should be skipped.|
|mapFileName|Function|A function that takes a single string argument that is the remapped file name and returns a string which represents the filename that should be in the mapped coverage.|
|readFile|Function|`fs.readFileSync`|A function that will synchronously read a file|
|readJSON|Function|`JSON.parse(fs.readFileSync)`|A function that will synchronously read a file and return a POJO based on the JSON data in the file|
|warn|Function|`console.warn`|A function that logs warning messages|

#### `lib/writeReport`

The `lib/writeReport` module would be used something like this:

```js
require([
	'remap-istanbul/lib/loadCoverage',
	'remap-istanbul/lib/remap',
	'remap-istanbul/lib/writeReport'
], function (loadCoverage, remap, writeReport) {
	var collector = remap(loadCoverage('coverage-final.json'));
	writeReport(collector, 'json', 'coverage-final.json').then(function () {
		/* do something else now */
	});
});
```

The `writeReport` function can take the following arguments:

|Argument|Type|Description|
|--------|----|-----------|
|collector|istanbul/lib/collector|This is an Istanbul coverage collector (usually returned from `remap` which is to be written out in a report)|
|reportType|string|The type of the report. Valid values are: `clover`, `cobertura`, `html`, `json-summary`, `json`, `file`, `lcovonly`, `teamcity`, `text-lcov`, `text-summary` or `text`|
|reportOptions|object|Options object of key/value pairs to pass to the reporter|
|dest|string, Function|The destination file, directory or console logging function that is the destination of the report. Only `text-lcov` takes the logging function and will default to `console.log` if no value is passed.|
|*returns*|Promise|A promise that is resolved when the report is written.|

### CommonJS

If you are not using an AMD loader, that is not a problem for consuming the modules.  They also can be loaded in a
CommonJS environment:

```js
var loadCoverage = require('remap-istanbul/lib/loadCoverage');
var remap = require('remap-istanbul/lib/remap');
var writeReport = require('remap-istanbul/lib/writeReport');
```

### Grunt Task

You can utilize this package as a [Grunt](http://gruntjs.com) task.  After installing it as a package, you need to add the following to your `Gruntfile.js`:

```js
grunt.loadNpmTasks('remap-istanbul');
```

The task is a multi-target task and a basic configuration for the task would look something like this:

```js
grunt.initConfig({
	remapIstanbul: {
		build: {
			src: 'coverage-final.json',
			options: {
				reports: {
					'lcovhtml': 'html-report',
					'json': 'coverage-final.json'
				}
			}
		}
	}
});
```

This would take in `coverage-final.json`, remap it and then output the Istanbul HTML report to `html-report`
and overwrite the original `coverage-final.json`.

The task also recognizes an abbreviated version of configuration:

```js
grunt.initConfig({
	remapIstanbul: {
		build: {
			files: [ {
				src: 'coverage.json',
				dest: 'tmp/coverage.json',
				type: 'json'
			} ]
		}
	}
});
```

By default, the grunt task will log warnings/errors to the `grunt.log.error`.  If instead you wish the
grunt task to `grunt.fail.warn` which will require `--force` to ensure the task does not fail the whole
build, you should supply the `fail` option in the task configuration:

```js
grunt.initConfig({
	remapIstanbul: {
		build: {
			src: 'coverage-final.json',
			options: {
				fail: true
			}
		}
	}
});
```

### Gulp Plugin

You can utilize this package as a [gulp](http://gulpjs.com) plugin.  There are two main ways it can be
used.  Just taking a coverage file, remapping and outputting it would look like this:

```js
var gulp = require('gulp');
var remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul');

gulp.task('remap-istanbul', function () {
	return gulp.src('coverage-final.json')
		.pipe(remapIstanbul())
		.pipe(gulp.dest('coverage-remapped.json'));
});
```

Another way is to utilize the plugin is to have the plugin write out the Istanbul reports directly.
This can be accomplished by passing a `reports` property in the options.  For example, to have the JSON
coverage report output in addition to the HTML coverage report, at task would look like this:

```js
var gulp = require('gulp');
var remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul');

gulp.task('remap-istanbul', function () {
	return gulp.src('coverage-final.json')
		.pipe(remapIstanbul({
			reports: {
				'json': 'coverage.json',
				'html': 'html-report'
			}
		}));
});
```

By default, errors in the gulp task will be considered non-fatal and will just be logged to the
console.  If you wish errors to be emitted and fail the task, you need to supply the task with
`fail` being truthy:

```js
var gulp = require('gulp');
var remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul');

gulp.task('remap-istanbul', function () {
	return gulp.src('coverage-final.json')
		.pipe(remapIstanbul({
			fail: true
		}));
});
```

### Intern Reporter

The package comes with an [Intern](https://theintern.github.io/) reporter that makes it easy to output the `coverage.json` from a test run.  The most common usage from the command line would be something like:

```sh
node_modules/.bin/intern-runner config=tests/intern reporters=Console reporters=node_modules/remap-istanbul/lib/intern-reporters/JsonCoverage
```

This will output a `coverage-final.json` in the root of your project, which you can use with the rest of `remap-istanbul` to remap it back to the source files.
