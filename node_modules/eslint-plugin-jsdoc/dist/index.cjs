"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _checkAccess = _interopRequireDefault(require("./rules/checkAccess.cjs"));
var _checkAlignment = _interopRequireDefault(require("./rules/checkAlignment.cjs"));
var _checkExamples = _interopRequireDefault(require("./rules/checkExamples.cjs"));
var _checkIndentation = _interopRequireDefault(require("./rules/checkIndentation.cjs"));
var _checkLineAlignment = _interopRequireDefault(require("./rules/checkLineAlignment.cjs"));
var _checkParamNames = _interopRequireDefault(require("./rules/checkParamNames.cjs"));
var _checkPropertyNames = _interopRequireDefault(require("./rules/checkPropertyNames.cjs"));
var _checkSyntax = _interopRequireDefault(require("./rules/checkSyntax.cjs"));
var _checkTagNames = _interopRequireDefault(require("./rules/checkTagNames.cjs"));
var _checkTemplateNames = _interopRequireDefault(require("./rules/checkTemplateNames.cjs"));
var _checkTypes = _interopRequireDefault(require("./rules/checkTypes.cjs"));
var _checkValues = _interopRequireDefault(require("./rules/checkValues.cjs"));
var _convertToJsdocComments = _interopRequireDefault(require("./rules/convertToJsdocComments.cjs"));
var _emptyTags = _interopRequireDefault(require("./rules/emptyTags.cjs"));
var _implementsOnClasses = _interopRequireDefault(require("./rules/implementsOnClasses.cjs"));
var _importsAsDependencies = _interopRequireDefault(require("./rules/importsAsDependencies.cjs"));
var _informativeDocs = _interopRequireDefault(require("./rules/informativeDocs.cjs"));
var _linesBeforeBlock = _interopRequireDefault(require("./rules/linesBeforeBlock.cjs"));
var _matchDescription = _interopRequireDefault(require("./rules/matchDescription.cjs"));
var _matchName = _interopRequireDefault(require("./rules/matchName.cjs"));
var _multilineBlocks = _interopRequireDefault(require("./rules/multilineBlocks.cjs"));
var _noBadBlocks = _interopRequireDefault(require("./rules/noBadBlocks.cjs"));
var _noBlankBlockDescriptions = _interopRequireDefault(require("./rules/noBlankBlockDescriptions.cjs"));
var _noBlankBlocks = _interopRequireDefault(require("./rules/noBlankBlocks.cjs"));
var _noDefaults = _interopRequireDefault(require("./rules/noDefaults.cjs"));
var _noMissingSyntax = _interopRequireDefault(require("./rules/noMissingSyntax.cjs"));
var _noMultiAsterisks = _interopRequireDefault(require("./rules/noMultiAsterisks.cjs"));
var _noRestrictedSyntax = _interopRequireDefault(require("./rules/noRestrictedSyntax.cjs"));
var _noTypes = _interopRequireDefault(require("./rules/noTypes.cjs"));
var _noUndefinedTypes = _interopRequireDefault(require("./rules/noUndefinedTypes.cjs"));
var _requireAsteriskPrefix = _interopRequireDefault(require("./rules/requireAsteriskPrefix.cjs"));
var _requireDescription = _interopRequireDefault(require("./rules/requireDescription.cjs"));
var _requireDescriptionCompleteSentence = _interopRequireDefault(require("./rules/requireDescriptionCompleteSentence.cjs"));
var _requireExample = _interopRequireDefault(require("./rules/requireExample.cjs"));
var _requireFileOverview = _interopRequireDefault(require("./rules/requireFileOverview.cjs"));
var _requireHyphenBeforeParamDescription = _interopRequireDefault(require("./rules/requireHyphenBeforeParamDescription.cjs"));
var _requireJsdoc = _interopRequireDefault(require("./rules/requireJsdoc.cjs"));
var _requireParam = _interopRequireDefault(require("./rules/requireParam.cjs"));
var _requireParamDescription = _interopRequireDefault(require("./rules/requireParamDescription.cjs"));
var _requireParamName = _interopRequireDefault(require("./rules/requireParamName.cjs"));
var _requireParamType = _interopRequireDefault(require("./rules/requireParamType.cjs"));
var _requireProperty = _interopRequireDefault(require("./rules/requireProperty.cjs"));
var _requirePropertyDescription = _interopRequireDefault(require("./rules/requirePropertyDescription.cjs"));
var _requirePropertyName = _interopRequireDefault(require("./rules/requirePropertyName.cjs"));
var _requirePropertyType = _interopRequireDefault(require("./rules/requirePropertyType.cjs"));
var _requireReturns = _interopRequireDefault(require("./rules/requireReturns.cjs"));
var _requireReturnsCheck = _interopRequireDefault(require("./rules/requireReturnsCheck.cjs"));
var _requireReturnsDescription = _interopRequireDefault(require("./rules/requireReturnsDescription.cjs"));
var _requireReturnsType = _interopRequireDefault(require("./rules/requireReturnsType.cjs"));
var _requireTemplate = _interopRequireDefault(require("./rules/requireTemplate.cjs"));
var _requireThrows = _interopRequireDefault(require("./rules/requireThrows.cjs"));
var _requireYields = _interopRequireDefault(require("./rules/requireYields.cjs"));
var _requireYieldsCheck = _interopRequireDefault(require("./rules/requireYieldsCheck.cjs"));
var _sortTags = _interopRequireDefault(require("./rules/sortTags.cjs"));
var _tagLines = _interopRequireDefault(require("./rules/tagLines.cjs"));
var _textEscaping = _interopRequireDefault(require("./rules/textEscaping.cjs"));
var _validTypes = _interopRequireDefault(require("./rules/validTypes.cjs"));
var _getJsdocProcessorPlugin = require("./getJsdocProcessorPlugin.cjs");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * @typedef {"recommended" | "stylistic" | "contents" | "logical"} ConfigGroups
 * @typedef {"" | "-typescript" | "-typescript-flavor"} ConfigVariants
 * @typedef {"" | "-error"} ErrorLevelVariants
 * @type {import('eslint').ESLint.Plugin & {
*   configs: Record<`flat/${ConfigGroups}${ConfigVariants}${ErrorLevelVariants}`, import('eslint').Linter.Config>
* }}
*/
const index = {
  // @ts-expect-error Ok
  configs: {},
  rules: {
    'check-access': _checkAccess.default,
    'check-alignment': _checkAlignment.default,
    'check-examples': _checkExamples.default,
    'check-indentation': _checkIndentation.default,
    'check-line-alignment': _checkLineAlignment.default,
    'check-param-names': _checkParamNames.default,
    'check-property-names': _checkPropertyNames.default,
    'check-syntax': _checkSyntax.default,
    'check-tag-names': _checkTagNames.default,
    'check-template-names': _checkTemplateNames.default,
    'check-types': _checkTypes.default,
    'check-values': _checkValues.default,
    'convert-to-jsdoc-comments': _convertToJsdocComments.default,
    'empty-tags': _emptyTags.default,
    'implements-on-classes': _implementsOnClasses.default,
    'imports-as-dependencies': _importsAsDependencies.default,
    'informative-docs': _informativeDocs.default,
    'lines-before-block': _linesBeforeBlock.default,
    'match-description': _matchDescription.default,
    'match-name': _matchName.default,
    'multiline-blocks': _multilineBlocks.default,
    'no-bad-blocks': _noBadBlocks.default,
    'no-blank-block-descriptions': _noBlankBlockDescriptions.default,
    'no-blank-blocks': _noBlankBlocks.default,
    'no-defaults': _noDefaults.default,
    'no-missing-syntax': _noMissingSyntax.default,
    'no-multi-asterisks': _noMultiAsterisks.default,
    'no-restricted-syntax': _noRestrictedSyntax.default,
    'no-types': _noTypes.default,
    'no-undefined-types': _noUndefinedTypes.default,
    'require-asterisk-prefix': _requireAsteriskPrefix.default,
    'require-description': _requireDescription.default,
    'require-description-complete-sentence': _requireDescriptionCompleteSentence.default,
    'require-example': _requireExample.default,
    'require-file-overview': _requireFileOverview.default,
    'require-hyphen-before-param-description': _requireHyphenBeforeParamDescription.default,
    'require-jsdoc': _requireJsdoc.default,
    'require-param': _requireParam.default,
    'require-param-description': _requireParamDescription.default,
    'require-param-name': _requireParamName.default,
    'require-param-type': _requireParamType.default,
    'require-property': _requireProperty.default,
    'require-property-description': _requirePropertyDescription.default,
    'require-property-name': _requirePropertyName.default,
    'require-property-type': _requirePropertyType.default,
    'require-returns': _requireReturns.default,
    'require-returns-check': _requireReturnsCheck.default,
    'require-returns-description': _requireReturnsDescription.default,
    'require-returns-type': _requireReturnsType.default,
    'require-template': _requireTemplate.default,
    'require-throws': _requireThrows.default,
    'require-yields': _requireYields.default,
    'require-yields-check': _requireYieldsCheck.default,
    'sort-tags': _sortTags.default,
    'tag-lines': _tagLines.default,
    'text-escaping': _textEscaping.default,
    'valid-types': _validTypes.default
  }
};

/**
 * @param {"warn"|"error"} warnOrError
 * @param {string} [flatName]
 * @returns {import('eslint').Linter.FlatConfig}
 */
const createRecommendedRuleset = (warnOrError, flatName) => {
  return {
    ...(flatName ? {
      name: 'jsdoc/' + flatName
    } : {}),
    // @ts-expect-error Ok
    plugins: flatName ? {
      jsdoc: index
    } : ['jsdoc'],
    rules: {
      'jsdoc/check-access': warnOrError,
      'jsdoc/check-alignment': warnOrError,
      'jsdoc/check-examples': 'off',
      'jsdoc/check-indentation': 'off',
      'jsdoc/check-line-alignment': 'off',
      'jsdoc/check-param-names': warnOrError,
      'jsdoc/check-property-names': warnOrError,
      'jsdoc/check-syntax': 'off',
      'jsdoc/check-tag-names': warnOrError,
      'jsdoc/check-template-names': 'off',
      'jsdoc/check-types': warnOrError,
      'jsdoc/check-values': warnOrError,
      'jsdoc/convert-to-jsdoc-comments': 'off',
      'jsdoc/empty-tags': warnOrError,
      'jsdoc/implements-on-classes': warnOrError,
      'jsdoc/imports-as-dependencies': 'off',
      'jsdoc/informative-docs': 'off',
      'jsdoc/lines-before-block': 'off',
      'jsdoc/match-description': 'off',
      'jsdoc/match-name': 'off',
      'jsdoc/multiline-blocks': warnOrError,
      'jsdoc/no-bad-blocks': 'off',
      'jsdoc/no-blank-block-descriptions': 'off',
      'jsdoc/no-blank-blocks': 'off',
      'jsdoc/no-defaults': warnOrError,
      'jsdoc/no-missing-syntax': 'off',
      'jsdoc/no-multi-asterisks': warnOrError,
      'jsdoc/no-restricted-syntax': 'off',
      'jsdoc/no-types': 'off',
      'jsdoc/no-undefined-types': warnOrError,
      'jsdoc/require-asterisk-prefix': 'off',
      'jsdoc/require-description': 'off',
      'jsdoc/require-description-complete-sentence': 'off',
      'jsdoc/require-example': 'off',
      'jsdoc/require-file-overview': 'off',
      'jsdoc/require-hyphen-before-param-description': 'off',
      'jsdoc/require-jsdoc': warnOrError,
      'jsdoc/require-param': warnOrError,
      'jsdoc/require-param-description': warnOrError,
      'jsdoc/require-param-name': warnOrError,
      'jsdoc/require-param-type': warnOrError,
      'jsdoc/require-property': warnOrError,
      'jsdoc/require-property-description': warnOrError,
      'jsdoc/require-property-name': warnOrError,
      'jsdoc/require-property-type': warnOrError,
      'jsdoc/require-returns': warnOrError,
      'jsdoc/require-returns-check': warnOrError,
      'jsdoc/require-returns-description': warnOrError,
      'jsdoc/require-returns-type': warnOrError,
      'jsdoc/require-template': 'off',
      'jsdoc/require-throws': 'off',
      'jsdoc/require-yields': warnOrError,
      'jsdoc/require-yields-check': warnOrError,
      'jsdoc/sort-tags': 'off',
      'jsdoc/tag-lines': warnOrError,
      'jsdoc/text-escaping': 'off',
      'jsdoc/valid-types': warnOrError
    }
  };
};

/**
 * @param {"warn"|"error"} warnOrError
 * @param {string} [flatName]
 * @returns {import('eslint').Linter.FlatConfig}
 */
const createRecommendedTypeScriptRuleset = (warnOrError, flatName) => {
  const ruleset = createRecommendedRuleset(warnOrError, flatName);
  return {
    ...ruleset,
    rules: {
      ...ruleset.rules,
      /* eslint-disable indent -- Extra indent to avoid use by auto-rule-editing */
      'jsdoc/check-tag-names': [warnOrError, {
        typed: true
      }],
      'jsdoc/no-types': warnOrError,
      'jsdoc/no-undefined-types': 'off',
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-property-type': 'off',
      'jsdoc/require-returns-type': 'off'
      /* eslint-enable indent */
    }
  };
};

/**
 * @param {"warn"|"error"} warnOrError
 * @param {string} [flatName]
 * @returns {import('eslint').Linter.FlatConfig}
 */
const createRecommendedTypeScriptFlavorRuleset = (warnOrError, flatName) => {
  const ruleset = createRecommendedRuleset(warnOrError, flatName);
  return {
    ...ruleset,
    rules: {
      ...ruleset.rules,
      /* eslint-disable indent -- Extra indent to avoid use by auto-rule-editing */
      'jsdoc/no-undefined-types': 'off'
      /* eslint-enable indent */
    }
  };
};

/**
 * @param {(string | unknown[])[]} ruleNames
 */
const createStandaloneRulesetFactory = ruleNames => {
  /**
   * @param {"warn"|"error"} warnOrError
   * @param {string} [flatName]
   * @returns {import('eslint').Linter.FlatConfig}
   */
  return (warnOrError, flatName) => {
    return {
      name: 'jsdoc/' + flatName,
      plugins: {
        jsdoc: index
      },
      rules: Object.fromEntries(ruleNames.map(ruleName => typeof ruleName === "string" ? [ruleName, warnOrError] : [ruleName[0], [warnOrError, ...ruleName.slice(1)]]))
    };
  };
};
const contentsRules = ['jsdoc/informative-docs', 'jsdoc/match-description', 'jsdoc/no-blank-block-descriptions', 'jsdoc/no-blank-blocks', ['jsdoc/text-escaping', {
  escapeHTML: true
}]];
const createContentsTypescriptRuleset = createStandaloneRulesetFactory(contentsRules);
const createContentsTypescriptFlavorRuleset = createStandaloneRulesetFactory(contentsRules);
const logicalRules = ['jsdoc/check-access', 'jsdoc/check-param-names', 'jsdoc/check-property-names', 'jsdoc/check-syntax', 'jsdoc/check-tag-names', 'jsdoc/check-template-names', 'jsdoc/check-types', 'jsdoc/check-values', 'jsdoc/empty-tags', 'jsdoc/implements-on-classes', 'jsdoc/require-returns-check', 'jsdoc/require-yields-check', 'jsdoc/no-bad-blocks', 'jsdoc/no-defaults', 'jsdoc/no-types', 'jsdoc/no-undefined-types', 'jsdoc/valid-types'];
const createLogicalTypescriptRuleset = createStandaloneRulesetFactory(logicalRules);
const createLogicalTypescriptFlavorRuleset = createStandaloneRulesetFactory(logicalRules);
const requirementsRules = ['jsdoc/require-example', 'jsdoc/require-jsdoc', 'jsdoc/require-param', 'jsdoc/require-param-description', 'jsdoc/require-param-name', 'jsdoc/require-property', 'jsdoc/require-property-description', 'jsdoc/require-property-name', 'jsdoc/require-returns', 'jsdoc/require-returns-description', 'jsdoc/require-yields'];
const createRequirementsTypeScriptRuleset = createStandaloneRulesetFactory(requirementsRules);
const createRequirementsTypeScriptFlavorRuleset = createStandaloneRulesetFactory([...requirementsRules, 'jsdoc/require-param-type', 'jsdoc/require-property-type', 'jsdoc/require-returns-type', 'jsdoc/require-template']);
const stylisticRules = ['jsdoc/check-alignment', 'jsdoc/check-line-alignment', 'jsdoc/lines-before-block', 'jsdoc/multiline-blocks', 'jsdoc/no-multi-asterisks', 'jsdoc/require-asterisk-prefix', ['jsdoc/require-hyphen-before-param-description', 'never'], 'jsdoc/tag-lines'];
const createStylisticTypeScriptRuleset = createStandaloneRulesetFactory(stylisticRules);
const createStylisticTypeScriptFlavorRuleset = createStandaloneRulesetFactory(stylisticRules);

/* c8 ignore next 3 -- TS */
if (!index.configs) {
  throw new Error('TypeScript guard');
}
index.configs.recommended = createRecommendedRuleset('warn');
index.configs['recommended-error'] = createRecommendedRuleset('error');
index.configs['recommended-typescript'] = createRecommendedTypeScriptRuleset('warn');
index.configs['recommended-typescript-error'] = createRecommendedTypeScriptRuleset('error');
index.configs['recommended-typescript-flavor'] = createRecommendedTypeScriptFlavorRuleset('warn');
index.configs['recommended-typescript-flavor-error'] = createRecommendedTypeScriptFlavorRuleset('error');
index.configs['flat/recommended'] = createRecommendedRuleset('warn', 'flat/recommended');
index.configs['flat/recommended-error'] = createRecommendedRuleset('error', 'flat/recommended-error');
index.configs['flat/recommended-typescript'] = createRecommendedTypeScriptRuleset('warn', 'flat/recommended-typescript');
index.configs['flat/recommended-typescript-error'] = createRecommendedTypeScriptRuleset('error', 'flat/recommended-typescript-error');
index.configs['flat/recommended-typescript-flavor'] = createRecommendedTypeScriptFlavorRuleset('warn', 'flat/recommended-typescript-flavor');
index.configs['flat/recommended-typescript-flavor-error'] = createRecommendedTypeScriptFlavorRuleset('error', 'flat/recommended-typescript-flavor-error');
index.configs['flat/contents-typescript'] = createContentsTypescriptRuleset('warn', 'flat/contents-typescript');
index.configs['flat/contents-typescript-error'] = createContentsTypescriptRuleset('error', 'flat/contents-typescript-error');
index.configs['flat/contents-typescript-flavor'] = createContentsTypescriptFlavorRuleset('warn', 'flat/contents-typescript-flavor');
index.configs['flat/contents-typescript-flavor-error'] = createContentsTypescriptFlavorRuleset('error', 'flat/contents-typescript-error-flavor');
index.configs['flat/logical-typescript'] = createLogicalTypescriptRuleset('warn', 'flat/logical-typescript');
index.configs['flat/logical-typescript-error'] = createLogicalTypescriptRuleset('error', 'flat/logical-typescript-error');
index.configs['flat/logical-typescript-flavor'] = createLogicalTypescriptFlavorRuleset('warn', 'flat/logical-typescript-flavor');
index.configs['flat/logical-typescript-flavor-error'] = createLogicalTypescriptFlavorRuleset('error', 'flat/logical-typescript-error-flavor');
index.configs['flat/requirements-typescript'] = createRequirementsTypeScriptRuleset('warn', 'flat/requirements-typescript');
index.configs['flat/requirements-typescript-error'] = createRequirementsTypeScriptRuleset('error', 'flat/requirements-typescript-error');
index.configs['flat/requirements-typescript-flavor'] = createRequirementsTypeScriptFlavorRuleset('warn', 'flat/requirements-typescript-flavor');
index.configs['flat/requirements-typescript-flavor-error'] = createRequirementsTypeScriptFlavorRuleset('error', 'flat/requirements-typescript-error-flavor');
index.configs['flat/stylistic-typescript'] = createStylisticTypeScriptRuleset('warn', 'flat/stylistic-typescript');
index.configs['flat/stylistic-typescript-error'] = createStylisticTypeScriptRuleset('error', 'flat/stylistic-typescript-error');
index.configs['flat/stylistic-typescript-flavor'] = createStylisticTypeScriptFlavorRuleset('warn', 'flat/stylistic-typescript-flavor');
index.configs['flat/stylistic-typescript-flavor-error'] = createStylisticTypeScriptFlavorRuleset('error', 'flat/stylistic-typescript-error-flavor');
index.configs.examples = /** @type {import('eslint').Linter.FlatConfig[]} */[{
  name: 'jsdoc/examples/processor',
  files: ['**/*.js'],
  plugins: {
    examples: (0, _getJsdocProcessorPlugin.getJsdocProcessorPlugin)()
  },
  processor: 'examples/examples'
}, {
  name: 'jsdoc/examples/rules',
  files: ['**/*.md/*.js'],
  rules: {
    // "always" newline rule at end unlikely in sample code
    'eol-last': 0,
    // Wouldn't generally expect example paths to resolve relative to JS file
    'import/no-unresolved': 0,
    // Snippets likely too short to always include import/export info
    'import/unambiguous': 0,
    'jsdoc/require-file-overview': 0,
    // The end of a multiline comment would end the comment the example is in.
    'jsdoc/require-jsdoc': 0,
    // Unlikely to have inadvertent debugging within examples
    'no-console': 0,
    // Often wish to start `@example` code after newline; also may use
    //   empty lines for spacing
    'no-multiple-empty-lines': 0,
    // Many variables in examples will be `undefined`
    'no-undef': 0,
    // Common to define variables for clarity without always using them
    'no-unused-vars': 0,
    // See import/no-unresolved
    'node/no-missing-import': 0,
    'node/no-missing-require': 0,
    // Can generally look nicer to pad a little even if code imposes more stringency
    'padded-blocks': 0
  }
}];
index.configs['default-expressions'] = /** @type {import('eslint').Linter.FlatConfig[]} */[{
  files: ['**/*.js'],
  name: 'jsdoc/default-expressions/processor',
  plugins: {
    examples: (0, _getJsdocProcessorPlugin.getJsdocProcessorPlugin)({
      checkDefaults: true,
      checkParams: true,
      checkProperties: true
    })
  },
  processor: 'examples/examples'
}, {
  name: 'jsdoc/default-expressions/rules',
  files: ['**/*.jsdoc-defaults', '**/*.jsdoc-params', '**/*.jsdoc-properties'],
  rules: {
    ...index.configs.examples[1].rules,
    'chai-friendly/no-unused-expressions': 0,
    'no-empty-function': 0,
    'no-new': 0,
    'no-unused-expressions': 0,
    quotes: ['error', 'double'],
    semi: ['error', 'never'],
    strict: 0
  }
}];
index.configs['examples-and-default-expressions'] = /** @type {import('eslint').Linter.FlatConfig[]} */[{
  name: 'jsdoc/examples-and-default-expressions',
  plugins: {
    examples: (0, _getJsdocProcessorPlugin.getJsdocProcessorPlugin)({
      checkDefaults: true,
      checkParams: true,
      checkProperties: true
    })
  }
}, ...index.configs.examples.map(config => {
  return {
    ...config,
    plugins: {}
  };
}), ...index.configs['default-expressions'].map(config => {
  return {
    ...config,
    plugins: {}
  };
})];
var _default = exports.default = index;
module.exports = exports.default;
//# sourceMappingURL=index.cjs.map