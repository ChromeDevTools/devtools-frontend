import {
  buildForbidRuleDefinition,
} from '../buildForbidRuleDefinition.js';

export default buildForbidRuleDefinition({
  getContexts (context, report) {
    if (!context.options.length) {
      report('Rule `no-restricted-syntax` is missing a `contexts` option.');
      return false;
    }

    const {
      contexts,
    } = context.options[0];

    return contexts;
  },
  schema: [
    {
      additionalProperties: false,
      properties: {
        contexts: {
          description: `Set this to an array of strings representing the AST context (or an object with
\`context\` and \`comment\` properties) where you wish the rule to be applied.

\`context\` defaults to \`any\` and \`comment\` defaults to no specific comment context.

Use the \`message\` property to indicate the specific error to be shown when an
error is reported for that context being found. Defaults to
\`"Syntax is restricted: {{context}}"\`, or with a comment, to
\`"Syntax is restricted: {{context}} with {{comment}}"\`.

Set to \`"any"\` if you want the rule to apply to any JSDoc block throughout
your files (as is necessary for finding function blocks not attached to a
function declaration or expression, i.e., \`@callback\` or \`@function\` (or its
aliases \`@func\` or \`@method\`) (including those associated with an \`@interface\`).

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
                  message: {
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
      required: [
        'contexts',
      ],
      type: 'object',
    },
  ],
  url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/no-restricted-syntax.md#repos-sticky-header',
});
