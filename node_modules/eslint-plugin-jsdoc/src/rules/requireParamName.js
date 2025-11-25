import iterateJsdoc from '../iterateJsdoc.js';

export default iterateJsdoc(({
  report,
  utils,
}) => {
  utils.forEachPreferredTag('param', (jsdocParameter, targetTagName) => {
    if (jsdocParameter.tag && jsdocParameter.name === '') {
      report(
        `There must be an identifier after @${targetTagName} ${jsdocParameter.type === '' ? 'type' : 'tag'}.`,
        null,
        jsdocParameter,
      );
    }
  });
}, {
  contextDefaults: true,
  meta: {
    docs: {
      description: 'Requires that all `@param` tags have names.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-param-name.md#repos-sticky-header',
    },
    schema: [
      {
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
              anyOf: [
                {
                  type: 'string',
                },
                {
                  additionalProperties: false,
                  properties: {
                    comment: {
                      type: 'string',
                    },
                    context: {
                      type: 'string',
                    },
                  },
                  type: 'object',
                },
              ],
            },
            type: 'array',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
