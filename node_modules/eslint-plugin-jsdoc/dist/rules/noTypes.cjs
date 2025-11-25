"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * @param {import('comment-parser').Line} line
 */
const removeType = ({
  tokens
}) => {
  tokens.postTag = '';
  tokens.type = '';
};
var _default = exports.default = (0, _iterateJsdoc.default)(({
  node,
  utils
}) => {
  if (!utils.isIteratingFunctionOrVariable() && !utils.isVirtualFunction()) {
    return;
  }
  const tags = utils.getPresentTags(['param', 'arg', 'argument', 'returns', 'return']);
  for (const tag of tags) {
    if (tag.type) {
      utils.reportJSDoc(`Types are not permitted on @${tag.tag}.`, tag, () => {
        for (const source of tag.source) {
          removeType(source);
        }
      });
    }
  }
  if (node?.type === 'ClassDeclaration') {
    const propertyTags = utils.getPresentTags(['prop', 'property']);
    for (const tag of propertyTags) {
      if (tag.type) {
        utils.reportJSDoc(`Types are not permitted on @${tag.tag} in the supplied context.`, tag, () => {
          for (const source of tag.source) {
            removeType(source);
          }
        });
      }
    }
  }
}, {
  contextDefaults: ['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression', 'TSDeclareFunction',
  // Add this to above defaults
  'TSMethodSignature', 'ClassDeclaration'],
  meta: {
    docs: {
      description: 'This rule reports types being used on `@param` or `@returns` (redundant with TypeScript).',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/no-types.md#repos-sticky-header'
    },
    fixable: 'code',
    schema: [{
      additionalProperties: false,
      properties: {
        contexts: {
          description: `Set this to an array of strings representing the AST context (or an object with
optional \`context\` and \`comment\` properties) where you wish the rule to be applied.

\`context\` defaults to \`any\` and \`comment\` defaults to no specific comment context.

Overrides the default contexts (\`ArrowFunctionExpression\`, \`FunctionDeclaration\`,
\`FunctionExpression\`, \`TSDeclareFunction\`, \`TSMethodSignature\`,
\`ClassDeclaration\`). Set to \`"any"\` if you want
the rule to apply to any JSDoc block throughout your files (as is necessary
for finding function blocks not attached to a function declaration or
expression, i.e., \`@callback\` or \`@function\` (or its aliases \`@func\` or
\`@method\`) (including those associated with an \`@interface\`).

See the ["AST and Selectors"](../#advanced-ast-and-selectors)
section of our Advanced docs for more on the expected format.`,
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
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=noTypes.cjs.map