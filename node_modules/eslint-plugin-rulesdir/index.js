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
    if (typeof module.exports.RULES_DIR !== 'string' && !Array.isArray(RULES_DIR)) {
      throw new Error('To use eslint-plugin-rulesdir, you must load it beforehand and set the `RULES_DIR` property on the module to a string or an array of strings.');
    }
    const cacheKey = JSON.stringify(RULES_DIR);
    if (!cache[cacheKey]) {
      const rules = Array.isArray(RULES_DIR) ? RULES_DIR : [RULES_DIR];
      const rulesObject = {};
      rules.forEach((rulesDir) => {
        fs.readdirSync(rulesDir)
          .filter(filename => filename.endsWith('.js') || filename.endsWith('.cjs') || filename.endsWith('.mjs'))
          .map(filename => path.resolve(rulesDir, filename))
          .forEach((absolutePath) => {
            const ruleName = path.basename(absolutePath, path.extname(absolutePath));
            if (rulesObject[ruleName]) {
              throw new Error(`eslint-plugin-rulesdir found two rules with the same name: ${ruleName}`);
            }
            rulesObject[ruleName] = require(absolutePath);
          });
      });
      cache[cacheKey] = rulesObject;
    }
    return cache[cacheKey];
  },
};
