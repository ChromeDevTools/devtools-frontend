/**
 * @fileoverview Allows a local ESLint rules directory to be used without a command-line flag
 * @author Teddy Katz
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------

const cache = {};
module.exports = {
  get rules() {
    const RULES_DIR = module.exports.RULES_DIR;
    if (typeof module.exports.RULES_DIR !== 'string') {
      throw new Error('To use eslint-plugin-rulesdir, you must load it beforehand and set the `RULES_DIR` property on the module to a string.');
    }
    if (!cache[RULES_DIR]) {
      cache[RULES_DIR] = fs.readdirSync(RULES_DIR)
        .filter(filename => filename.endsWith('.js'))
        .map(filename => path.resolve(RULES_DIR, filename))
        .reduce((rules, absolutePath) => Object.assign(rules, { [path.basename(absolutePath, '.js')]: require(absolutePath) }), {});
    }
    return cache[RULES_DIR];
  },
};
