istanbul-diff
=============

Uses [jsondiffpatch](https://github.com/benjamine/jsondiffpatch)
to find & report diffs between two [istanbul](https://github.com/gotwarlost/istanbul) JSON 
code coverage summaries in the vein of [coveralls](https://coveralls.io/).

```shell
$ npm install istanbul-diff
```
```shell
$ istanbul-diff test/data/coverage-summary.1.json test/data/coverage-summary.2.json
Coverage increased +60% (10) lines. That's good. (istanbul/)
```

## CLI Usage
```
USAGE:
  istanbul-diff coverage-summary-before.json coverage-summary-after.json
Options:
  --depth <n>    diff to depth n
  --pick <t>     pick out <t> diff, e.g. lines.pct (comma separated)
  --lines        include linesCovered (can be very long!)
  --json         output json diff (always exits successfully)
  --json-compact output compact json diff (always exits successfully)
  --detail [<w>] detailed report. <w>=lines,statements,functions,branches or blank for all
  --recurse      recurse through sub folders (up to depth), otherwise print only root');

  --nomotivate   disabling compliment, or not!
  --nocolor      disable colorized output
  --nofail       do not exit with code 1 if coverage decreases
  --brief        suppress no-change messages');
```
Job will exit with code `1` (fail) if coverage has regressed (decreased), unless `--nofail` is given. 

Normally only the `lines` metric is reported.  This can be overridden by passing `--detail`.

Coverage JSON summary files are generated through istanbul's `json-summary` report, e.g.:
```shell
$ istanbul cover --report html --reoprt json-summary .
```
Alternatively, use the [moos fork](https://www.npmjs.com/package/istanbul-moos) of istanbul and generate 
`text-folder` report which makes a much more compact `folder-summary.json` files.

Example:
```shell
$ istanbul-diff test/data/coverage-summary.1.json test/data/coverage-summary.4.json --detail lines,functions
Coverage delta:  -60% (-10) lines, +10% (10) functions (istanbul/)
```

You can also get a terse summary text of a _single_ JSON summary report:
 ```shell
$ istanbul-diff test/data/coverage-summary.1.json
Coverage 80.53% (1836) lines. You outdid yourself today. (istanbul/)
```

## API Usage
### #diff(before, after, options)
Get diff between two coverage JSON summaries.
```
 * before {Object} - json-summary data, e.g.:
 *     { total: {lines: {total:75,covered:59,skipped:0,pct:78.67}, statements: {...}, ... }
 * after {Object} - json-summary data
 * options {object}
 *    pick {string|array} - 'lines' or 'lines.covered' or array of such. see #pick()
 *    depth {number} - see #dip()
 *    ignoreAdded {boolean} - ignore added diffs
 *    ignoreRemoved {boolean} - ignore removed diffs
 *    ignoreLinesCovered {boolean} - ignore lines covered (detaul: true)
 * @returns {object} - for each key in before/after summaries, return diff value
```
Example:
```js
var istanbulDiff = require('istanbul-diff'),
  cov1 =  JSON.parse(fs.readFileSync('data/coverage-summary1.json')),
  cov2 =  JSON.parse(fs.readFileSync('data/coverage-summary2.json')),
  diff = istanbulDiff.diff(cov1, cov2);
console.log(diff);
```
Output:
```js
{ total:
   { lines: { covered: 7, pct: 7.6 },
     statements: { covered: 7, pct: 7.1 },
     branches: { covered: 10, pct: 13 } },
  '/dev/git/istanbul-diff/lib/index.js':
   { lines: { covered: 7, pct: 12 },
     statements: { covered: 7, pct: 11 },
     branches: { covered: 10, pct: 23 } } }
```

### #dip(diff, depth, options)
Prune diff object beyond given depth
```
 * diff {object} - the diff'd hash
 * depth {number} - root is at 0 (unless options is given)
 * options {object}
 *    rootDepth {number} - the depth of the root node
 * returns {object}
```

### #pick(diff, props)
Cherry pick given properties
```
 * diff {object} - the diff'd hash
 * props {string|Array} - key map to get, e.g., 'lines.covered', or 'lines'
 * returns {object}
```

### #print(diff, options)
Pretty print difference in coverage
```
 * diff {object} - the diff'd hash
 * options {object} - 
 *   nocolor {boolean} - don't use ANSI colors in output message
 *   nomotivate {boolean} - don't add motivation message
 *   detail {string} - comma separated list of: lines,statements,functions,branches
 *   recurse {boolean} - recurse through sub folders
 *   brief {boolean} - suppress no-change messages
 * @returns {msg: String, regressed: Boolean} 
```
`regresssed` return key is true if _any_ of the metric diffs were negative (used by CLI to return correct exit code).

### #print.compliment(positive)
Print a [nicejob](https://github.com/moos/nicejob) message.
```
 * positive {boolean} - whether compliment should be positive or negative 
 * @returns {string} 
```

## Test
```shell
$ npm run test 
```

To get self coverage report (make sure `istanbul` is installed):
```shell
$ npm run test-cover && open coverage/index.html 
```

## Samples
Sample scripts for increasing, decreasing, and same coverage.
```shell
$ npm run sample-inc
$ npm run sample-dec
$ npm run sample-same -- --detail
$ npm run sample-single
```
## Change log
- v2.0.0 - `--json` now returns correct JSON (thanks @nickofthyme) (:warning: **breaking change** to CLI).  New `--json-compact`.  Fix readme typos (thanks @maxwu). 
- v1.1.4 - clean up npm package
- v1.1.3 - Added explicit lodash dependency (Apr 2017)
- v1.1.2 - Added _single_ file summary reporting & node 4.x (LTS) compatibility (Apr 2017)
-v1.1.0 - Renamed data files to coverage-summary to emphasize content.  Reformat output text (Apr 2017)
- v1.0.6 - Added --recurse and --brief options, fixed --nomotivate and --nocolor, add sample scripts (Apr 2017)
- v1.0.0 - Initial release (Apr 2017)


## License
MIT license.
