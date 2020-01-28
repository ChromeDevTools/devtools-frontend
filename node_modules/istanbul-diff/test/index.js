'use strict';

let assert = require('assert'),
  fs = require('fs'),
  istanbulDiff = require('../lib/index'),
  cov1 =  JSON.parse(fs.readFileSync('test/data/coverage-summary.1.json')),
  cov2 =  JSON.parse(fs.readFileSync('test/data/coverage-summary.2.json')),
  cov3 =  JSON.parse(fs.readFileSync('test/data/coverage-summary.3.json'));


describe('#diff', function() {
  it('should detect all diffs', function() {
    let actual12 = {
      'istanbul/': {
        branches : {covered: 1, pct: 1, skipped: 1, total: 1},
        functions: {covered: 10, pct: 10, skipped: 10, total: 10},
        lines    : {covered: -10, pct: -60, total: -10}
      }
    };
    let diff12 = istanbulDiff.diff(cov1, cov2);
    assert.deepEqual(diff12, actual12);
  });

  it('should detect missing parts, ignoring add/remove', function() {
    let actual13 = { 'istanbul/': { branches: {}, statements: {} } };
    let diff13 = istanbulDiff.diff(cov1, cov3, {
      ignoreAdded: true,
      ignoreRemoved: true
    });
    assert.deepEqual(diff13, actual13);
  });

  it('should detect missing parts, including add/remove', function() {
    let actual13 = {
      'istanbul/'           : {
        branches         : {covered: 763, covered_MISSING: 763},
        functions        : {covered: 457, pct: 85.74, skipped: 8, total: 533},
        statements       : {covered: 1892, pct: 80.2},
        functions_MISSING: {covered: 457, pct: 85.74, skipped: 8, total: 533}
      },
      'istanbul/foo/': {
        branches  : {covered: 763, pct: 70.26, skipped: 26, total: 1086},
        functions : {covered: 457, pct: 85.74, skipped: 8, total: 533},
        lines     : {covered: 1836, pct: 80.53, skipped: 0, total: 2280},
        statements: {covered: 1892, pct: 80.2, skipped: 18, total: 2359}
      },
      'istanbul/foo_MISSING/': {
        lines: {covered: 1836, pct: 80.53, skipped: 0, total: 2280}
      }
    };
    let diff13 = istanbulDiff.diff(cov1, cov3, {ignoreLinesCovered: true});
    assert.deepEqual(diff13, actual13);
  });
});

describe('#dip - folder summaries', function() {
  let stat = {branches: {lines: 5}};
  let diff = {
    'root/'    : stat,
    'root/1/'  : stat,
    'root/1/2/': stat
  };

  it('should get everything at depth=0', function() {
    let dip = istanbulDiff.dip(diff, 0);
    assert.deepEqual(dip, diff);
  });

  it('should get everything without depth arg', function() {
    let dip = istanbulDiff.dip(diff);
    assert.deepEqual(dip, diff);
  });

  it('should get everything with negative depth', function() {
    let dip = istanbulDiff.dip(diff, -1);
    assert.deepEqual(dip, diff);
  });

  it('should get only root at depth=1', function() {
    let dip = istanbulDiff.dip(diff, 1);
    assert.deepEqual(dip, {'root/': stat});
  });

  it('should get two levels at depth=2', function() {
    let dip = istanbulDiff.dip(diff, 2);
    assert.deepEqual(dip, {'root/': stat, 'root/1/': stat});
  });

  it('should get everything at depth=3', function() {
    let dip = istanbulDiff.dip(diff, 3);
    assert.deepEqual(dip, diff);
  });

  it('should get everything at very large depth', function() {
    let dip = istanbulDiff.dip(diff, 10);
    assert.deepEqual(dip, diff);
  });

});

describe('#dip - long paths', function() {
  let stat = {branches: {lines: 5}};
  let diff = {
    'a/b/root/a.js'    : stat,
    'a/b/root/1/a.js'  : stat,
    'a/b/root/1/2/a.js': stat
  };

  it('should get only root at depth=1', function() {
    let dip = istanbulDiff.dip(diff, 1);
    assert.deepEqual(dip, {'a/b/root/a.js': stat});
  });

  it('should get two levels at depth=2', function() {
    let dip = istanbulDiff.dip(diff, 2);
    assert.deepEqual(dip, {'a/b/root/a.js': stat, 'a/b/root/1/a.js': stat});
  });

  it('should get everything at depth=3', function() {
    let dip = istanbulDiff.dip(diff, 3);
    assert.deepEqual(dip, diff);
  });

  it('should get everything at very large depth', function() {
    let dip = istanbulDiff.dip(diff, 10);
    assert.deepEqual(dip, diff);
  });

});

describe('#dip - with rootDepth option', function() {
  let stat = {branches: {lines: 5}};
  let diff = {
    'a/b/root/a.js'    : stat,
    'a/b/root/1/a.js'  : stat,
    'a/b/root/1/2/a.js': stat
  };

  it('should get only root at depth=1 & rootDepth=3', function() {
    let dip = istanbulDiff.dip(diff, 1, {rootDepth: 3});
    assert.deepEqual(dip, {'a/b/root/a.js': stat});
  });

  it('should get only root at depth=4 & rootDepth=0', function() {
    let dip = istanbulDiff.dip(diff, 4, {rootDepth: 0});
    assert.deepEqual(dip, {'a/b/root/a.js': stat});
  });

  it('should get everything at large rootDepth', function() {
    let dip = istanbulDiff.dip(diff, 1, {rootDepth: 10});
    assert.deepEqual(dip, diff);
  });

  it('should get nothing at large negative rootDepth', function() {
    let dip = istanbulDiff.dip(diff, 1, {rootDepth: -10});
    assert.deepEqual(dip, {});
  });

});

describe('#pick', function() {
  let br, fn, ln;
  let stat = {
    branches : (br = {covered: 1, pct: 1, skipped: 1, total: 1}),
    functions: (fn = {covered: 10, pct: 10, skipped: 10, total: 10}),
    lines    : (ln = {covered: -10, pct: -60, total: -10})
  };
  let diff = {
    a: stat,
    b: stat
  };

  it('should get branches', function() {
    let picked = istanbulDiff.pick(diff, 'branches');
    assert.deepEqual(picked, {a: br, b: br});
  });

  it('should get functions', function() {
    let picked = istanbulDiff.pick(diff, 'functions');
    assert.deepEqual(picked, {a: fn, b: fn});
  });

  it('should get lines', function() {
    let picked = istanbulDiff.pick(diff, 'lines');
    assert.deepEqual(picked, {a: ln, b: ln});
  });

  it('should get lines.covered', function() {
    let picked = istanbulDiff.pick(diff, 'lines.covered');
    assert.deepEqual(picked, {a: -10, b: -10});
  });

  it('should get lines.pct & lines.covered', function() {
    let picked = istanbulDiff.pick(diff, ['lines.pct', 'lines.covered']);
    assert.deepEqual(picked, [{a: -60, b: -60}, {a: -10, b: -10}]);
  });

  it('should get lines.pct', function() {
    let picked = istanbulDiff.pick(diff, 'lines.pct');
    assert.deepEqual(picked, {a: -60, b: -60});
  });

  it('should not get foo', function() {
    let picked = istanbulDiff.pick(diff, 'foo');
    assert.deepEqual(picked, {a: undefined, b: undefined});
  });

  it('should not get foo.bar', function() {
    let picked = istanbulDiff.pick(diff, 'foo.bar');
    assert.deepEqual(picked, {a: undefined, b: undefined});
  });
});
