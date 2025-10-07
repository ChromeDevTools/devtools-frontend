"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * @param {import('../iterateJsdoc.js').Utils} utils
 * @param {import('../iterateJsdoc.js').Settings} settings
 * @returns {boolean}
 */
const canSkip = (utils, settings) => {
  const voidingTags = [
  // An abstract function is by definition incomplete
  // so it is perfectly fine if a yield is documented but
  // not present within the function.
  // A subclass may inherit the doc and implement the
  // missing yield.
  'abstract', 'virtual',
  // Constructor functions do not have a yield value
  //  so we can bail here, too.
  'class', 'constructor',
  // This seems to imply a class as well
  'interface'];
  if (settings.mode === 'closure') {
    // Structural Interface in GCC terms, equivalent to @interface tag as far as this rule is concerned
    voidingTags.push('record');
  }
  return utils.hasATag(voidingTags) || utils.isConstructor() || utils.classHasTag('interface') || settings.mode === 'closure' && utils.classHasTag('record');
};

/**
 * @param {import('../iterateJsdoc.js').Utils} utils
 * @param {import('../iterateJsdoc.js').Report} report
 * @param {string} tagName
 * @returns {[]|[preferredTagName: string, tag: import('comment-parser').Spec]}
 */
const checkTagName = (utils, report, tagName) => {
  const preferredTagName = /** @type {string} */utils.getPreferredTagName({
    tagName
  });
  if (!preferredTagName) {
    return [];
  }
  const tags = utils.getTags(preferredTagName);
  if (tags.length === 0) {
    return [];
  }
  if (tags.length > 1) {
    report(`Found more than one @${preferredTagName} declaration.`);
    return [];
  }
  return [preferredTagName, tags[0]];
};
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  report,
  settings,
  utils
}) => {
  if (canSkip(utils, settings)) {
    return;
  }
  const {
    checkGeneratorsOnly = false,
    next = false
  } = context.options[0] || {};
  const [preferredYieldTagName, yieldTag] = checkTagName(utils, report, 'yields');
  if (preferredYieldTagName) {
    const shouldReportYields = () => {
      if (/** @type {import('comment-parser').Spec} */yieldTag.type.trim() === 'never') {
        if (utils.hasYieldValue()) {
          report(`JSDoc @${preferredYieldTagName} declaration set with "never" but yield expression is present in function.`);
        }
        return false;
      }
      if (checkGeneratorsOnly && !utils.isGenerator()) {
        return true;
      }
      return !utils.mayBeUndefinedTypeTag(/** @type {import('comment-parser').Spec} */
      yieldTag) && !utils.hasYieldValue();
    };

    // In case a yield value is declared in JSDoc, we also expect one in the code.
    if (shouldReportYields()) {
      report(`JSDoc @${preferredYieldTagName} declaration present but yield expression not available in function.`);
    }
  }
  if (next) {
    const [preferredNextTagName, nextTag] = checkTagName(utils, report, 'next');
    if (preferredNextTagName) {
      const shouldReportNext = () => {
        if (/** @type {import('comment-parser').Spec} */nextTag.type.trim() === 'never') {
          if (utils.hasYieldReturnValue()) {
            report(`JSDoc @${preferredNextTagName} declaration set with "never" but yield expression with return value is present in function.`);
          }
          return false;
        }
        if (checkGeneratorsOnly && !utils.isGenerator()) {
          return true;
        }
        return !utils.mayBeUndefinedTypeTag(/** @type {import('comment-parser').Spec} */
        nextTag) && !utils.hasYieldReturnValue();
      };
      if (shouldReportNext()) {
        report(`JSDoc @${preferredNextTagName} declaration present but yield expression with return value not available in function.`);
      }
    }
  }
}, {
  meta: {
    docs: {
      description: 'Ensures that if a `@yields` is present that a `yield` (or `yield` with a value) is present in the function body (or that if a `@next` is present that there is a yield with a return value present).',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-yields-check.md#repos-sticky-header'
    },
    schema: [{
      additionalProperties: false,
      properties: {
        checkGeneratorsOnly: {
          default: false,
          description: `Avoids checking the function body and merely insists
that all generators have \`@yields\`. This can be an optimization with the
ESLint \`require-yield\` rule, as that rule already ensures a \`yield\` is
present in generators, albeit assuming the generator is not empty).
Defaults to \`false\`.`,
          type: 'boolean'
        },
        contexts: {
          description: `Set this to an array of strings representing the AST context
(or objects with optional \`context\` and \`comment\` properties) where you wish
the rule to be applied.

\`context\` defaults to \`any\` and \`comment\` defaults to no specific comment context.

Overrides the default contexts (\`ArrowFunctionExpression\`, \`FunctionDeclaration\`,
\`FunctionExpression\`).`,
          items: {
            anyOf: [{
              type: 'string'
            }, {
              additionalProperties: false,
              properties: {
                comment: {
                  type: 'string'
                },
                context: {
                  type: 'string'
                }
              },
              type: 'object'
            }]
          },
          type: 'array'
        },
        next: {
          default: false,
          description: `If \`true\`, this option will insist that any use of a (non-standard)
\`@next\` tag (in addition to any \`@yields\` tag) will be matched by a \`yield\`
which uses a return value in the body of the generator (e.g.,
\`const rv = yield;\` or \`const rv = yield value;\`). This (non-standard)
tag is intended to be used to indicate a type and/or description of
the value expected to be supplied by the user when supplied to the iterator
by its \`next\` method, as with \`it.next(value)\` (with the iterator being
the \`Generator\` iterator that is returned by the call to the generator
function). This option will report an error if the generator function body
merely has plain \`yield;\` or \`yield value;\` statements without returning
the values. Defaults to \`false\`.`,
          type: 'boolean'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=requireYieldsCheck.cjs.map