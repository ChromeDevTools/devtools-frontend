"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * We can skip checking for a throws value, in case the documentation is inherited
 * or the method is either a constructor or an abstract method.
 * @param {import('../iterateJsdoc.js').Utils} utils a reference to the utils which are used to probe if a tag is present or not.
 * @returns {boolean} true in case deep checking can be skipped; otherwise false.
 */
const canSkip = utils => {
  return utils.hasATag([
  // inheritdoc implies that all documentation is inherited
  // see https://jsdoc.app/tags-inheritdoc.html
  //
  // Abstract methods are by definition incomplete,
  // so it is not necessary to document that they throw an error.
  'abstract', 'virtual',
  // The designated type can itself document `@throws`
  'type']) || utils.avoidDocs();
};
var _default = exports.default = (0, _iterateJsdoc.default)(({
  report,
  utils
}) => {
  // A preflight check. We do not need to run a deep check for abstract
  //  functions.
  if (canSkip(utils)) {
    return;
  }
  const tagName = /** @type {string} */utils.getPreferredTagName({
    tagName: 'throws'
  });
  if (!tagName) {
    return;
  }
  const tags = utils.getTags(tagName);
  const iteratingFunction = utils.isIteratingFunction();

  // In case the code returns something, we expect a return value in JSDoc.
  const [tag] = tags;
  const missingThrowsTag = typeof tag === 'undefined' || tag === null;
  const shouldReport = () => {
    if (!missingThrowsTag) {
      if (tag.type.trim() === 'never' && iteratingFunction && utils.hasThrowValue()) {
        report(`JSDoc @${tagName} declaration set to "never" but throw value found.`);
      }
      return false;
    }
    return iteratingFunction && utils.hasThrowValue();
  };
  if (shouldReport()) {
    report(`Missing JSDoc @${tagName} declaration.`);
  }
}, {
  contextDefaults: true,
  meta: {
    docs: {
      description: 'Requires that throw statements are documented with `@throws` tags.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-throws.md#repos-sticky-header'
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
\`@method\`) (including those associated with an \`@interface\`).`,
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
document block avoids the need for a \`@throws\`. Defaults to an array
with \`inheritdoc\`. If you set this array, it will overwrite the default,
so be sure to add back \`inheritdoc\` if you wish its presence to cause
exemption of the rule.`,
          items: {
            type: 'string'
          },
          type: 'array'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=requireThrows.cjs.map