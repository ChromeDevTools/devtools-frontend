/**
 * @fileoverview An ESLint plugin for linting ESLint plugins
 * @author Teddy Katz
 */

'use strict';

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const packageMetadata = require('../package');
const PLUGIN_NAME = packageMetadata.name.replace(/^eslint-plugin-/, '');

const configFilters = {
  all: (rule) => !rule.meta.docs.requiresTypeChecking,
  'all-type-checked': () => true,
  recommended: (rule) => rule.meta.docs.recommended,
  rules: (rule) => rule.meta.docs.category === 'Rules',
  tests: (rule) => rule.meta.docs.category === 'Tests',
  'rules-recommended': (rule) =>
    configFilters.recommended(rule) && configFilters.rules(rule),
  'tests-recommended': (rule) =>
    configFilters.recommended(rule) && configFilters.tests(rule),
};

// ------------------------------------------------------------------------------
// Plugin Definition
// ------------------------------------------------------------------------------

// import all rules in lib/rules
const allRules = Object.fromEntries(
  fs
    .readdirSync(`${__dirname}/rules`)
    .filter((fileName) => fileName.endsWith('.js') && /^[^._]/.test(fileName))
    .map((fileName) => fileName.replace(/\.js$/, ''))
    .map((ruleName) => [
      ruleName,
      require(path.join(__dirname, 'rules', ruleName)),
    ]),
);

/** @type {import("eslint").ESLint.Plugin} */
const plugin = {
  meta: {
    name: packageMetadata.name,
    version: packageMetadata.version,
  },
  rules: allRules,
  configs: {}, // assigned later
};

// eslintrc configs
Object.assign(
  plugin.configs,
  Object.keys(configFilters).reduce((configs, configName) => {
    return Object.assign(configs, {
      [configName]: {
        plugins: ['eslint-plugin'],
        rules: Object.fromEntries(
          Object.keys(allRules)
            .filter((ruleName) => configFilters[configName](allRules[ruleName]))
            .map((ruleName) => [`${PLUGIN_NAME}/${ruleName}`, 'error']),
        ),
      },
    });
  }, {}),
);

// flat configs
Object.assign(
  plugin.configs,
  Object.keys(configFilters).reduce((configs, configName) => {
    return Object.assign(configs, {
      [`flat/${configName}`]: {
        name: `eslint-plugin/flat/${configName}`,
        plugins: { 'eslint-plugin': plugin },
        rules: Object.fromEntries(
          Object.keys(allRules)
            .filter((ruleName) => configFilters[configName](allRules[ruleName]))
            .map((ruleName) => [`${PLUGIN_NAME}/${ruleName}`, 'error']),
        ),
      },
    });
  }, {}),
);

module.exports = plugin;
