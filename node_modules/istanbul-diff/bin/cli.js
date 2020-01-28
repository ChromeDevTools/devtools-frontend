#!/usr/bin/env node

var
  argv = require('minimist')(process.argv.slice(2)),
  istanbulDiff = require('../lib/index.js'),
  fs = require('fs'),
  depth = argv.depth,
  pick = argv.pick,
  args = argv._;

// console.log(argv, depth);

if (args.length !== 1 && args.length !== 2) {
  console.log('Usage: \n  istanbul-diff coverage-summary-before.json coverage-summary-after.json');
  console.log('');
  console.log('Options:');
  console.log('  --depth <n>    diff to depth n');
  console.log('  --pick <t>     pick out <t> diff, e.g. lines.pct (comma separated)');
  console.log('  --lines        include linesCovered (can be very long)');
  console.log('  --json         output json diff (always exits successfully)');
  console.log('  --json-compact output compact json diff (always exits successfully)');
  console.log('  --detail [<w>] detailed report. <w>=lines,statements,functions,branches or blank for all');
  console.log('  --recurse      recurse through sub folders (up to depth), otherwise print only root');
  console.log('');
  console.log('  --nomotivate   disabling compliment, or not!');
  console.log('  --nocolor      disable colorized output');
  console.log('  --nofail       do not exit with code 1 if coverage decreases');
  console.log('  --brief        suppress no-change messages');
  console.log('If only one file is give, summarizes coverage for that file.');
  return;
}

if (pick) {
  pick = pick.split(',');
}

var fileLeft = args[0],
  fileRight = args[1],
  options = {
    ignoreLinesCovered: !argv.lines,
    depth             : depth,
    pick              : pick,
    nomotivate        : argv.nomotivate,
    detail            : !pick && argv.detail, // pick and detail don't work well together
    nocolor           : argv.nocolor,
    recurse           : argv.recurse,
    brief             : argv.brief,
    single            : !fileRight
  },
  left = JSON.parse(fs.readFileSync(fileLeft)),
  right = fileRight && JSON.parse(fs.readFileSync(fileRight)),
  delta = istanbulDiff.diff(left, right, options),
  result;
// console.log(delta)

if (argv.json) {
  console.log(JSON.stringify(delta, null, 2));
} else if (argv['json-compact']) {
  console.log(JSON.stringify(delta, null, 0));
} else {
  result = istanbulDiff.print(delta, options);
  console.log(result.msg);

  if (options.motivate && options.detail === true) {
    console.log(istanbulDiff.print.compliment(!result.regressed));
  }
  if (!argv.nofail && result.regressed) {
    process.exit(1);
  }
}
