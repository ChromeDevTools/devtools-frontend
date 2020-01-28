"use strict";

var
  jsondiffpatch = require('jsondiffpatch'),
  omitDeep = require('omit-deep-lodash'),
  deep = require('lodash-deep'),
  _ = require('lodash'),
  print = require('./print');

/**
 * get diff between two coverage JSON-summaries
 *
 * @param before {Object} - json-summary data, e.g.:
 *     { total: {lines: {total:75,covered:59,skipped:0,pct:78.67}, statements: {...}, ... }
 * @param after {Object} - json-summary data
 * @param options {object}
 *    pick {string|array} - 'lines' or 'lines.covered' or array of such
 *    depth {number} -
 *    ignoreAdded {boolean}
 *    ignoreRemoved {boolean}
 *    ignoreLinesCovered {boolean}
 *
 * @returns {object} - for each key in before/after, return diff value
 *
 { total:
  { lines: { covered: 21, pct: 28 },
    statements: { covered: 21, pct: 27 },
    functions: { covered: 9, pct: 53 },
    branches: { covered: 15, pct: 26 }
  },
 }
 */
function diff(before, after, options) {
  var diff, deltas;
  options = options || {};

  if (options.ignoreLinesCovered) {
    before = omitDeep(before, 'linesCovered');
    after = omitDeep(after, 'linesCovered');
  }

  diff = jsondiffpatch.diff(before, after);

  // parse json diff patch formatted output
  deltas = _.cloneDeepWith(diff, function(val, key, list){
    var delta;
    // console.log('--', key, val, _.isArray(val))

    if (!_.isArray(val)) return;

    if (val.length === 2) {
      delta = val[1] - val[0];
      if (key === 'pct') {
        delta = Number(delta.toPrecision(2));
      }
      return delta;
    }

    // console.log(3333, val.length, key, val)
    if (val.length === 1) {
      return options.ignoreAdded ? null : val[0];
    }

    if (val.length > 2) {
      return options.ignoreRemoved ? null : val[0];
    }
  });

  if (!deltas) return {};

  deep.deepMapValues(deltas, function(value, path){
    if (value === null) {
      _.unset(deltas, path);
      // console.log('unsetting -- ', path)
    } else {
      return value;
    }
  });

  if ('depth' in options) {
    deltas = dip(deltas, options.depth);
  }

  if ('pick' in options) {
    deltas = pick(deltas, options.pick);
  }
  return deltas;
}

/**
 * cherry pick given properties
 *
 * @param diff {object} - the diff'd hash
 * @param props {string|Array} - key map to get, e.g., 'lines.covered', or 'lines'
 * @return {Object|Array} - returns single picked diff or array of diffs
 */
function pick(diff, props) {
  if (!props) return diff;

  var picked = [],
    extract = function(prop) {
      return _.mapValues(diff, function (val) {
        return _(val).get(prop);
      });
    };

  if (typeof props === 'string') {
    props = [props];
  }

  props.forEach(function (prop, index) {
    picked[index] = extract(prop);
  });

  return picked.length === 1 ? picked[0] : picked;
}

/**
 * prune object beyond given depth
 *
 * @param diff {object} - the diff'd hash
 * @param depth {number}
 * @param options {object}
 *    rootDepth - the depth of the root node
 * @returns {object}
 */
function dip(diff, depth, options) {
  if (!depth || depth < 0) {
    return diff;
  }

  options = options || {};

  let baseDepth = 'rootDepth' in options ? options.rootDepth : getRootDepth(diff);
  let getDepth = function (path) {
    return getAbsoluteDepth(path) - baseDepth + 1;
  };

  return _.omitBy(diff, function(val, path){
    return getDepth(path) > depth;
  });
}

let sep = require('path').sep;


function getRootDepth(diff) {
  var keys = Object.keys(diff),
    key = keys[0];

  // console.log(key)
  if (key === 'total' && keys.length > 1) key = keys[1];
  return getAbsoluteDepth(key);
}


function getAbsoluteDepth(path) {
  return path.split(sep).length - 1;
}

module.exports = {
  diff : diff,
  dip  : dip,
  pick : pick,
  print: print
};