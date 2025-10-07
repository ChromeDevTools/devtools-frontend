"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * We can skip checking for a yield value, in case the documentation is inherited
 * or the method has a constructor or abstract tag.
 *
 * In either of these cases the yield value is optional or not defined.
 * @param {import('../iterateJsdoc.js').Utils} utils a reference to the utils which are used to probe if a tag is present or not.
 * @returns {boolean} true in case deep checking can be skipped; otherwise false.
 */
const canSkip = utils => {
  return utils.hasATag([
  // inheritdoc implies that all documentation is inherited
  // see https://jsdoc.app/tags-inheritdoc.html
  //
  // Abstract methods are by definition incomplete,
  // so it is not an error if it declares a yield value but does not implement it.
  'abstract', 'virtual',
  // Constructors do not have a yield value
  // so we can bail out here, too.
  'class', 'constructor',
  // Yield (and any `next`) type is specified accompanying the targeted
  //   @type
  'type',
  // This seems to imply a class as well
  'interface']) || utils.avoidDocs();
};

/**
 * @param {import('../iterateJsdoc.js').Utils} utils
 * @param {import('../iterateJsdoc.js').Report} report
 * @param {string} tagName
 * @returns {[preferredTagName?: string, missingTag?: boolean]}
 */
const checkTagName = (utils, report, tagName) => {
  const preferredTagName = /** @type {string} */utils.getPreferredTagName({
    tagName
  });
  if (!preferredTagName) {
    return [];
  }
  const tags = utils.getTags(preferredTagName);
  if (tags.length > 1) {
    report(`Found more than one @${preferredTagName} declaration.`);
  }

  // In case the code yields something, we expect a yields value in JSDoc.
  const [tag] = tags;
  const missingTag = typeof tag === 'undefined' || tag === null;
  return [preferredTagName, missingTag];
};
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  report,
  utils
}) => {
  const {
    forceRequireNext = false,
    forceRequireYields = false,
    next = false,
    nextWithGeneratorTag = false,
    withGeneratorTag = true
  } = context.options[0] || {};

  // A preflight check. We do not need to run a deep check
  // in case the @yield comment is optional or undefined.
  if (canSkip(utils)) {
    return;
  }
  const iteratingFunction = utils.isIteratingFunction();
  const [preferredYieldTagName, missingYieldTag] = checkTagName(utils, report, 'yields');
  if (preferredYieldTagName) {
    const shouldReportYields = () => {
      if (!missingYieldTag) {
        return false;
      }
      if (withGeneratorTag && utils.hasTag('generator') || forceRequireYields && iteratingFunction && utils.isGenerator()) {
        return true;
      }
      return iteratingFunction && utils.isGenerator() && utils.hasYieldValue();
    };
    if (shouldReportYields()) {
      report(`Missing JSDoc @${preferredYieldTagName} declaration.`);
    }
  }
  if (next || nextWithGeneratorTag || forceRequireNext) {
    const [preferredNextTagName, missingNextTag] = checkTagName(utils, report, 'next');
    if (!preferredNextTagName) {
      return;
    }
    const shouldReportNext = () => {
      if (!missingNextTag) {
        return false;
      }
      if (nextWithGeneratorTag && utils.hasTag('generator')) {
        return true;
      }
      if (!next && !forceRequireNext || !iteratingFunction || !utils.isGenerator()) {
        return false;
      }
      return forceRequireNext || utils.hasYieldReturnValue();
    };
    if (shouldReportNext()) {
      report(`Missing JSDoc @${preferredNextTagName} declaration.`);
    }
  }
}, {
  contextDefaults: true,
  meta: {
    docs: {
      description: 'Requires yields are documented with `@yields` tags.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-yields.md#repos-sticky-header'
    },
    schema: [{
      additionalProperties: false,
      properties: {
        contexts: {
          description: `Set this to an array of strings representing the AST context
(or objects with optional \`context\` and \`comment\` properties) where you wish
the rule to be applied.

\`context\` defaults to \`any\` and \`comment\` defaults to no specific comment context.

Overrides the default contexts (\`ArrowFunctionExpression\`, \`FunctionDeclaration\`,
\`FunctionExpression\`). Set to \`"any"\` if you want
the rule to apply to any JSDoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., \`@callback\` or \`@function\` (or its aliases \`@func\` or
\`@method\`) (including those associated with an \`@interface\`). This
rule will only apply on non-default contexts when there is such a tag
present and the \`forceRequireYields\` option is set or if the
\`withGeneratorTag\` option is set with a present \`@generator\` tag
(since we are not checking against the actual \`yield\` values in these
cases).`,
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
        exemptedBy: {
          description: `Array of tags (e.g., \`['type']\`) whose presence on the
document block avoids the need for a \`@yields\`. Defaults to an array
with \`inheritdoc\`. If you set this array, it will overwrite the default,
so be sure to add back \`inheritdoc\` if you wish its presence to cause
exemption of the rule.`,
          items: {
            type: 'string'
          },
          type: 'array'
        },
        forceRequireNext: {
          default: false,
          description: `Set to \`true\` to always insist on
\`@next\` documentation even if there are no \`yield\` statements in the
function or none return values. May be desired to flag that a project is
aware of the expected yield return being \`undefined\`. Defaults to \`false\`.`,
          type: 'boolean'
        },
        forceRequireYields: {
          default: false,
          description: `Set to \`true\` to always insist on
\`@yields\` documentation for generators even if there are only
expressionless \`yield\` statements in the function. May be desired to flag
that a project is aware of an \`undefined\`/\`void\` yield. Defaults to
\`false\`.`,
          type: 'boolean'
        },
        next: {
          default: false,
          description: `If \`true\`, this option will insist that any use of a \`yield\` return
value (e.g., \`const rv = yield;\` or \`const rv = yield value;\`) has a
(non-standard) \`@next\` tag (in addition to any \`@yields\` tag) so as to be
able to document the type expected to be supplied into the iterator
(the \`Generator\` iterator that is returned by the call to the generator
function) to the iterator (e.g., \`it.next(value)\`). The tag will not be
expected if the generator function body merely has plain \`yield;\` or
\`yield value;\` statements without returning the values. Defaults to
\`false\`.`,
          type: 'boolean'
        },
        nextWithGeneratorTag: {
          default: false,
          description: `If a \`@generator\` tag is present on a block, require
(non-standard ) \`@next\` (see \`next\` option). This will require using \`void\`
or \`undefined\` in cases where generators do not use the \`next()\`-supplied
incoming \`yield\`-returned value. Defaults to \`false\`. See \`contexts\` to
\`any\` if you want to catch \`@generator\` with \`@callback\` or such not
attached to a function.`,
          type: 'boolean'
        },
        withGeneratorTag: {
          default: true,
          description: `If a \`@generator\` tag is present on a block, require
\`@yields\`/\`@yield\`. Defaults to \`true\`. See \`contexts\` to \`any\` if you want
to catch \`@generator\` with \`@callback\` or such not attached to a function.`,
          type: 'boolean'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=requireYields.cjs.map