'use strict';

Object.defineProperty(exports, "__esModule", { value: true });

const picomatch = require('picomatch');
const normalizePath = require('normalize-path');

/**
 * @typedef {(testString: string) => boolean} AnymatchFn
 * @typedef {string|RegExp|AnymatchFn} AnymatchPattern
 * @typedef {AnymatchPattern|AnymatchPattern[]} AnymatchMatcher
 */
const BANG = '!';
const arrify = (item) => Array.isArray(item) ? item : [item];

/**
 * @param {AnymatchPattern} matcher
 * @returns {AnymatchFn}
 */
const createPattern = (matcher) => {
  if (typeof matcher === 'function') {
    return matcher;
  }
  if (typeof matcher === 'string') {
    const glob = picomatch(matcher);
    return (string) => matcher === string || glob(string);
  }
  if (matcher instanceof RegExp) {
    return (string) => matcher.test(string);
  }
  return (string) => false;
};

/**
 * @param {Array<Function>} patterns
 * @param {Array<Function>} negatedGlobs
 * @param {String|Array} path
 * @param {Boolean} returnIndex
 * @returns {boolean|number}
 */
const matchPatterns = (patterns, negatedGlobs, path, returnIndex) => {
  const additionalArgs = Array.isArray(path);
  const upath = normalizePath(additionalArgs ? path[0] : path);
  for (let index = 0; index < negatedGlobs.length; index++) {
    const nglob = negatedGlobs[index];
    if (nglob(upath)) {
      return returnIndex ? -1 : false;
    }
  }
  const args = additionalArgs && [upath].concat(path.slice(1));
  for (let index = 0; index < patterns.length; index++) {
    const pattern = patterns[index];
    if (additionalArgs ? pattern(...args) : pattern(upath)) {
      return returnIndex ? index : true;
    }
  }

  return returnIndex ? -1 : false;
};

/**
 * @param {AnymatchMatcher} matchers
 * @param {Array|string} testString
 * @param {boolean=} returnIndex
 * @returns {boolean|number|Function}
 */
const anymatch = (matchers, testString, returnIndex = false) => {
  if (matchers == null) {
    throw new TypeError('anymatch: specify first argument');
  }
  // Early cache for matchers.
  const mtchers = arrify(matchers);
  const negatedGlobs = mtchers
    .filter(item => typeof item === 'string' && item.charAt(0) === BANG)
    .map(item => item.slice(1))
    .map(item => picomatch(item));
  const patterns = mtchers.map(createPattern);

  if (testString == null) {
    return (testString, ri = false) => {
      const returnIndex = typeof ri === 'boolean' ? ri : false;
      return matchPatterns(patterns, negatedGlobs, testString, returnIndex);
    }
  }
  if (!Array.isArray(testString) && typeof testString !== 'string') {
    throw new TypeError('anymatch: second argument must be a string: got ' +
      Object.prototype.toString.call(testString))
  }

  return matchPatterns(patterns, negatedGlobs, testString, returnIndex);
};

anymatch.default = anymatch;
module.exports = anymatch;
