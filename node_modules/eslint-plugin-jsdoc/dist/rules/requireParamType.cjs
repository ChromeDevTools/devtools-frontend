"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  report,
  settings,
  utils
}) => {
  const {
    defaultDestructuredRootType = 'object',
    setDefaultDestructuredRootType = false
  } = context.options[0] || {};
  const functionParameterNames = utils.getFunctionParameterNames();
  let rootCount = -1;
  utils.forEachPreferredTag('param', (jsdocParameter, targetTagName) => {
    rootCount += jsdocParameter.name.includes('.') ? 0 : 1;
    if (!jsdocParameter.type) {
      if (Array.isArray(functionParameterNames[rootCount])) {
        if (settings.exemptDestructuredRootsFromChecks) {
          return;
        }
        if (setDefaultDestructuredRootType) {
          utils.reportJSDoc(`Missing root type for @${targetTagName}.`, jsdocParameter, () => {
            utils.changeTag(jsdocParameter, {
              postType: ' ',
              type: `{${defaultDestructuredRootType}}`
            });
          });
          return;
        }
      }
      report(`Missing JSDoc @${targetTagName} "${jsdocParameter.name}" type.`, null, jsdocParameter);
    }
  });
}, {
  contextDefaults: true,
  meta: {
    docs: {
      description: 'Requires that each `@param` tag has a type value (in curly brackets).',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-param-type.md#repos-sticky-header'
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
\`FunctionExpression\`). Set to \`"any"\` if you want
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
        },
        defaultDestructuredRootType: {
          description: 'The type string to set by default for destructured roots. Defaults to "object".',
          type: 'string'
        },
        setDefaultDestructuredRootType: {
          description: `Whether to set a default destructured root type. For example, you may wish
to avoid manually having to set the type for a \`@param\`
corresponding to a destructured root object as it is always going to be an
object. Uses \`defaultDestructuredRootType\` for the type string. Defaults to
\`false\`.`,
          type: 'boolean'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=requireParamType.cjs.map