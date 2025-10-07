import iterateJsdoc from '../iterateJsdoc.js';

export default iterateJsdoc(({
  context,
  jsdoc,
  report,
  utils,
}) => {
  if (utils.avoidDocs()) {
    return;
  }

  const {
    enableFixer = true,
    exemptNoArguments = false,
  } = context.options[0] || {};

  const targetTagName = 'example';

  const functionExamples = jsdoc.tags.filter(({
    tag,
  }) => {
    return tag === targetTagName;
  });

  if (!functionExamples.length) {
    if (exemptNoArguments && utils.isIteratingFunctionOrVariable() &&
      !utils.hasParams()
    ) {
      return;
    }

    utils.reportJSDoc(`Missing JSDoc @${targetTagName} declaration.`, null, () => {
      if (enableFixer) {
        utils.addTag(targetTagName);
      }
    });

    return;
  }

  for (const example of functionExamples) {
    const exampleContent = `${example.name} ${utils.getTagDescription(example)}`
      .trim()
      .split('\n')
      .filter(Boolean);

    if (!exampleContent.length) {
      report(`Missing JSDoc @${targetTagName} description.`, null, example);
    }
  }
}, {
  contextDefaults: true,
  meta: {
    docs: {
      description: 'Requires that all functions (and potentially other contexts) have examples.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/require-example.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          checkConstructors: {
            default: true,
            description: `A value indicating whether \`constructor\`s should be checked.
Defaults to \`true\`.`,
            type: 'boolean',
          },
          checkGetters: {
            default: false,
            description: 'A value indicating whether getters should be checked. Defaults to `false`.',
            type: 'boolean',
          },
          checkSetters: {
            default: false,
            description: 'A value indicating whether setters should be checked. Defaults to `false`.',
            type: 'boolean',
          },
          contexts: {
            description: `Set this to an array of strings representing the AST context (or an object with
optional \`context\` and \`comment\` properties) where you wish the rule to be applied.
(e.g., \`ClassDeclaration\` for ES6 classes).

\`context\` defaults to \`any\` and \`comment\` defaults to no specific comment context.

Overrides the default contexts (\`ArrowFunctionExpression\`, \`FunctionDeclaration\`,
\`FunctionExpression\`). Set to \`"any"\` if you want the rule to apply to any
JSDoc block throughout your files.

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
          enableFixer: {
            default: true,
            description: `A boolean on whether to enable the fixer (which adds an empty \`@example\` block).
Defaults to \`true\`.`,
            type: 'boolean',
          },
          exemptedBy: {
            description: `Array of tags (e.g., \`['type']\`) whose presence on the document
block avoids the need for an \`@example\`. Defaults to an array with
\`inheritdoc\`. If you set this array, it will overwrite the default,
so be sure to add back \`inheritdoc\` if you wish its presence to cause
exemption of the rule.`,
            items: {
              type: 'string',
            },
            type: 'array',
          },
          exemptNoArguments: {
            default: false,
            description: `Boolean to indicate that no-argument functions should not be reported for
missing \`@example\` declarations.`,
            type: 'boolean',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
