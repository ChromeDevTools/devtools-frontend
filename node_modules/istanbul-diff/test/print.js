'use strict';

let assert = require('assert'),
  fs = require('fs'),
  istanbulDiff = require('../lib/index'),
  cov1 =  JSON.parse(fs.readFileSync('test/data/coverage-summary.1.json')),
  cov2 =  JSON.parse(fs.readFileSync('test/data/coverage-summary.2.json')),
  diff = istanbulDiff.diff(cov2, cov1),
  diff_regressed = istanbulDiff.diff(cov1, cov2),
  diff_same = istanbulDiff.diff(cov1, cov1),
  opts = {
    nocolor: true,
    nomotivate: true
  },
  result;


describe('#print', function() {
  it('should handle no arguments', function() {
    result = istanbulDiff.print();
    assert.deepEqual(result, {});
  });

  it('should handle empty argument', function() {
    result = istanbulDiff.print({});
    assert.equal(result.msg, 'No change');
    assert.equal(result.regressed, false);
  });

  it('should print decreased coverage', function() {
    result = istanbulDiff.print(diff_regressed, opts);
    assert.equal(result.msg, 'Coverage decreased -60% (-10) lines. (istanbul/)');
    assert.equal(result.regressed, true);
  });

  it('should print increased coverage', function() {
    result = istanbulDiff.print(diff, opts);
    assert.equal(result.msg, 'Coverage increased +60% (10) lines. (istanbul/)');
    assert.equal(result.regressed, false);
  });

  it('should print all with detail option', function() {
    result = istanbulDiff.print(diff, Object.assign({detail: true}, opts));
    assert.equal(result.msg, 'Coverage delta:  +60% (10) lines, =statements, -10% (-10) functions, -1% (-1) branches (istanbul/)');
    assert.equal(result.regressed, true);
  });

  it('should print specific detail', function() {
    result = istanbulDiff.print(diff, Object.assign({detail: 'functions'}, opts));
    assert.equal(result.msg, 'Coverage decreased -10% (-10) functions. (istanbul/)');
    assert.equal(result.regressed, true);
  });

  it('should print multiple details', function() {
    result = istanbulDiff.print(diff, Object.assign({detail: 'lines,functions'}, opts));
    assert.equal(result.msg, 'Coverage delta:  +60% (10) lines, -10% (-10) functions (istanbul/)');
    assert.equal(result.regressed, true);
  });

  it('should print unknown metric', function() {
    result = istanbulDiff.print(diff, Object.assign({detail: 'foo'}, opts));
    assert.equal(result.msg, 'No such coverage metric: foo');
    assert.equal(result.regressed, false);
  });

  it('should print same coverage', function() {
    result = istanbulDiff.print(diff_same, opts);
    assert.equal(result.msg, 'No change');
    assert.equal(result.regressed, false);
  });

  it('should print same detail coverage', function() {
    result = istanbulDiff.print(diff_same, Object.assign({detail: true}, opts));
    assert.equal(result.msg, 'Coverage delta:  No change');
    assert.equal(result.regressed, false);
  });

});

describe('#print.compliment', function() {
  it('should get a compliment', function () {
    assert.equal(typeof istanbulDiff.print.compliment(true), 'string');
    assert.equal(typeof istanbulDiff.print.compliment(false), 'string');
  });
});