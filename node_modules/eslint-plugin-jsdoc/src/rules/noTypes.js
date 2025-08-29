import iterateJsdoc from '../iterateJsdoc.js';

/**
 * @param {import('comment-parser').Line} line
 */
const removeType = ({
  tokens,
}) => {
  tokens.postTag = '';
  tokens.type = '';
};

export default iterateJsdoc(({
  node,
  utils,
}) => {
  if (!utils.isIteratingFunction() && !utils.isVirtualFunction()) {
    return;
  }

  const tags = utils.getPresentTags([
    'param', 'arg', 'argument', 'returns', 'return',
  ]);

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
    const propertyTags = utils.getPresentTags([
      'prop', 'property',
    ]);
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
  contextDefaults: [
    'ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression', 'TSDeclareFunction',
    // Add this to above defaults
    'TSMethodSignature', 'ClassDeclaration',
  ],
  meta: {
    docs: {
      description: 'This rule reports types being used on `@param` or `@returns`.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/no-types.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          contexts: {
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
