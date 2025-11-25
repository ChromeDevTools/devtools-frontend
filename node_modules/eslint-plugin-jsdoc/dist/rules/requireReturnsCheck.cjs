"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
var _jsdocUtils = require("../jsdocUtils.cjs");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * @param {import('../iterateJsdoc.js').Utils} utils
 * @param {import('../iterateJsdoc.js').Settings} settings
 * @returns {boolean}
 */
const canSkip = (utils, settings) => {
  const voidingTags = [
  // An abstract function is by definition incomplete
  // so it is perfectly fine if a return is documented but
  // not present within the function.
  // A subclass may inherit the doc and implement the
  // missing return.
  'abstract', 'virtual',
  // A constructor function returns `this` by default, so may be `@returns`
  //   tag indicating this but no explicit return
  'class', 'constructor', 'interface'];
  if (settings.mode === 'closure') {
    // Structural Interface in GCC terms, equivalent to @interface tag as far as this rule is concerned
    voidingTags.push('record');
  }
  return utils.hasATag(voidingTags) || utils.isConstructor() || utils.classHasTag('interface') || settings.mode === 'closure' && utils.classHasTag('record');
};
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  node,
  report,
  settings,
  utils
}) => {
  const {
    exemptAsync = true,
    exemptGenerators = settings.mode === 'typescript',
    noNativeTypes = true,
    reportMissingReturnForUndefinedTypes = false
  } = context.options[0] || {};
  if (canSkip(utils, settings)) {
    return;
  }
  const isAsync = utils.isAsync();
  if (exemptAsync && isAsync) {
    return;
  }
  const tagName = /** @type {string} */utils.getPreferredTagName({
    tagName: 'returns'
  });
  if (!tagName) {
    return;
  }
  const tags = utils.getTags(tagName);
  if (tags.length === 0) {
    return;
  }
  if (tags.length > 1) {
    report(`Found more than one @${tagName} declaration.`);
    return;
  }
  const [tag] = tags;
  const type = tag.type.trim();

  // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions
  if (/asserts\s/v.test(type)) {
    return;
  }
  const returnNever = type === 'never';
  if (returnNever && utils.hasValueOrExecutorHasNonEmptyResolveValue(false)) {
    report(`JSDoc @${tagName} declaration set with "never" but return expression is present in function.`);
    return;
  }
  if (noNativeTypes && isAsync && _jsdocUtils.strictNativeTypes.includes(type)) {
    report('Function is async or otherwise returns a Promise but the return type is a native type.');
    return;
  }

  // In case a return value is declared in JSDoc, we also expect one in the code.
  if (!returnNever && (reportMissingReturnForUndefinedTypes || !utils.mayBeUndefinedTypeTag(tag)) && (tag.type === '' && !utils.hasValueOrExecutorHasNonEmptyResolveValue(exemptAsync) || tag.type !== '' && !utils.hasValueOrExecutorHasNonEmptyResolveValue(exemptAsync, true)) && Boolean(!exemptGenerators || !node || !('generator' in (/** @type {import('../iterateJsdoc.js').Node} */node)) || !(/** @type {import('@typescript-eslint/types').TSESTree.FunctionDeclaration} */node).generator)) {
    report(`JSDoc @${tagName} declaration present but return expression not available in function.`);
  }
}, {
  meta: {
    docs: {
      description: 'Requires a return statement in function body if a `@returns` tag is specified in JSDoc comment(and reports if multiple `@returns` tags are present).',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-returns-check.md#repos-sticky-header'
    },
    schema: [{
      additionalProperties: false,
      properties: {
        exemptAsync: {
          default: true,
          description: `By default, functions which return a \`Promise\` that are not
detected as resolving with a non-\`undefined\` value and \`async\` functions
(even ones that do not explicitly return a value, as these are returning a
\`Promise\` implicitly) will be exempted from reporting by this rule.
If you wish to insist that only \`Promise\`'s which resolve to
non-\`undefined\` values or \`async\` functions with explicit \`return\`'s will
be exempted from reporting (i.e., that \`async\` functions can be reported
if they lack an explicit (non-\`undefined\`) \`return\` when a \`@returns\` is
present), you can set \`exemptAsync\` to \`false\` on the options object.`,
          type: 'boolean'
        },
        exemptGenerators: {
          description: `Because a generator might be labeled as having a
\`IterableIterator\` \`@returns\` value (along with an iterator type
corresponding to the type of any \`yield\` statements), projects might wish to
leverage \`@returns\` in generators even without a \`return\` statement. This
option is therefore \`true\` by default in \`typescript\` mode (in "jsdoc" mode,
one might be more likely to take advantage of \`@yields\`). Set it to \`false\`
if you wish for a missing \`return\` to be flagged regardless.`,
          type: 'boolean'
        },
        noNativeTypes: {
          description: `Whether to check that async functions do not
indicate they return non-native types. Defaults to \`true\`.`,
          type: 'boolean'
        },
        reportMissingReturnForUndefinedTypes: {
          default: false,
          description: `If \`true\` and no return or
resolve value is found, this setting will even insist that reporting occur
with \`void\` or \`undefined\` (including as an indicated \`Promise\` type).
Unlike \`require-returns\`, with this option in the rule, one can
*discourage* the labeling of \`undefined\` types. Defaults to \`false\`.`,
          type: 'boolean'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=requireReturnsCheck.cjs.map