"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
Object.defineProperty(exports, "getJsdocProcessorPlugin", {
  enumerable: true,
  get: function () {
    return _getJsdocProcessorPlugin.getJsdocProcessorPlugin;
  }
});
exports.jsdoc = void 0;
var _objectDeepMerge = require("object-deep-merge");
var _indexCjs = _interopRequireDefault(require("./index-cjs.cjs"));
var _buildForbidRuleDefinition = require("./buildForbidRuleDefinition.cjs");
var _buildRejectOrPreferRuleDefinition = require("./buildRejectOrPreferRuleDefinition.cjs");
var _getJsdocProcessorPlugin = require("./getJsdocProcessorPlugin.cjs");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/* eslint-disable perfectionist/sort-imports -- For auto-generate; Do not remove */
// BEGIN REPLACE
// eslint-disable-next-line unicorn/prefer-export-from --- Reusing `index`
var _default = exports.default = _indexCjs.default; // END REPLACE
/**
 * @type {((
 *   cfg?: import('eslint').Linter.Config & {
 *     config?: `flat/${import('./index-cjs.js').ConfigGroups}${import('./index-cjs.js').ConfigVariants}${import('./index-cjs.js').ErrorLevelVariants}`,
 *     mergeSettings?: boolean,
 *     settings?: Partial<import('./iterateJsdoc.js').Settings>,
 *     rules?: {[key in keyof import('./rules.d.ts').Rules]?: import('eslint').Linter.RuleEntry<import('./rules.d.ts').Rules[key]>},
 *     extraRuleDefinitions?: {
 *       forbid?: {
 *         [contextName: string]: {
 *           description?: string,
 *           url?: string,
 *           contexts: (string|{
 *             message: string,
 *             context: string,
 *             comment: string
 *           })[]
 *         }
 *       },
 *       preferTypes?: {
 *         [typeName: string]: {
 *           description: string,
 *           overrideSettings: {
 *             [typeNodeName: string]: {
 *               message: string,
 *               replacement?: false|string,
 *               unifyParentAndChildTypeChecks?: boolean,
 *             }
 *           },
 *           url: string,
 *         }
 *       }
 *     }
 *   }
 * ) => import('eslint').Linter.Config)}
 */
const jsdoc = function (cfg) {
  /** @type {import('eslint').Linter.Config} */
  let outputConfig = {
    plugins: {
      jsdoc: _indexCjs.default
    }
  };
  if (cfg) {
    if (cfg.config) {
      // @ts-expect-error Security check
      if (cfg.config === '__proto__') {
        throw new TypeError('Disallowed config value');
      }
      outputConfig = /** @type {import('eslint').Linter.Config} */_indexCjs.default.configs[cfg.config];
    }
    if (cfg.rules) {
      outputConfig.rules = {
        ...outputConfig.rules,
        ...cfg.rules
      };
    }
    if (cfg.plugins) {
      outputConfig.plugins = {
        ...outputConfig.plugins,
        ...cfg.plugins
      };
    }
    if (cfg.name) {
      outputConfig.name = cfg.name;
    }
    if (cfg.basePath) {
      outputConfig.basePath = cfg.basePath;
    }
    if (cfg.files) {
      outputConfig.files = cfg.files;
    }
    if (cfg.ignores) {
      outputConfig.ignores = cfg.ignores;
    }
    if (cfg.language) {
      outputConfig.language = cfg.language;
    }
    if (cfg.languageOptions) {
      outputConfig.languageOptions = cfg.languageOptions;
    }
    if (cfg.linterOptions) {
      outputConfig.linterOptions = cfg.linterOptions;
    }
    if (cfg.processor) {
      outputConfig.processor = cfg.processor;
    }
    if (cfg.extraRuleDefinitions) {
      if (!outputConfig.plugins?.jsdoc?.rules) {
        throw new Error('JSDoc plugin required for `extraRuleDefinitions`');
      }
      if (cfg.extraRuleDefinitions.forbid) {
        for (const [contextName, {
          contexts,
          description,
          url
        }] of Object.entries(cfg.extraRuleDefinitions.forbid)) {
          outputConfig.plugins.jsdoc.rules[`forbid-${contextName}`] = (0, _buildForbidRuleDefinition.buildForbidRuleDefinition)({
            contextName,
            contexts,
            description,
            url
          });
        }
      }
      if (cfg.extraRuleDefinitions.preferTypes) {
        for (const [typeName, {
          description,
          overrideSettings,
          url
        }] of Object.entries(cfg.extraRuleDefinitions.preferTypes)) {
          outputConfig.plugins.jsdoc.rules[`prefer-type-${typeName}`] = (0, _buildRejectOrPreferRuleDefinition.buildRejectOrPreferRuleDefinition)({
            description,
            overrideSettings,
            typeName,
            url
          });
        }
      }
    }
  }
  outputConfig.settings = {
    jsdoc: cfg?.mergeSettings === false ? cfg.settings : (0, _objectDeepMerge.merge)({}, cfg?.settings ?? {}, cfg?.config?.includes('recommended') ? {
      // We may need to drop these for "typescript" (non-"flavor") configs,
      //   if support is later added: https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
      structuredTags: {
        next: {
          required: ['type']
        }
      }
    } : {})
  };
  return outputConfig;
};
exports.jsdoc = jsdoc;
//# sourceMappingURL=index-esm.cjs.map