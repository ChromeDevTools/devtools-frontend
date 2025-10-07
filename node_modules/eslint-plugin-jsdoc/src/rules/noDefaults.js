import iterateJsdoc from '../iterateJsdoc.js';

export default iterateJsdoc(({
  context,
  utils,
}) => {
  const {
    noOptionalParamNames,
  } = context.options[0] || {};
  const paramTags = utils.getPresentTags([
    'param', 'arg', 'argument',
  ]);
  for (const tag of paramTags) {
    if (noOptionalParamNames && tag.optional) {
      utils.reportJSDoc(`Optional param names are not permitted on @${tag.tag}.`, tag, () => {
        utils.changeTag(tag, {
          name: tag.name.replace(/([^=]*)(=.+)?/v, '$1'),
        });
      });
    } else if (tag.default) {
      utils.reportJSDoc(`Defaults are not permitted on @${tag.tag}.`, tag, () => {
        utils.changeTag(tag, {
          name: tag.name.replace(/([^=]*)(=.+)?/v, '[$1]'),
        });
      });
    }
  }

  const defaultTags = utils.getPresentTags([
    'default', 'defaultvalue',
  ]);
  for (const tag of defaultTags) {
    if (tag.description.trim()) {
      utils.reportJSDoc(`Default values are not permitted on @${tag.tag}.`, tag, () => {
        utils.changeTag(tag, {
          description: '',
          postTag: '',
        });
      });
    }
  }
}, {
  contextDefaults: true,
  meta: {
    docs: {
      description: 'This rule reports defaults being used on the relevant portion of `@param` or `@default`.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/no-defaults.md#repos-sticky-header',
    },
    fixable: 'code',
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
          noOptionalParamNames: {
            description: `Set this to \`true\` to report the presence of optional parameters. May be
used if the project is insisting on optionality being indicated by
the presence of ES6 default parameters (bearing in mind that such
"defaults" are only applied when the supplied value is missing or
\`undefined\` but not for \`null\` or other "falsey" values).`,
            type: 'boolean',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
