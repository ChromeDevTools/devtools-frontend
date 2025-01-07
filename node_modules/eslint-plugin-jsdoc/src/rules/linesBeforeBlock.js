import iterateJsdoc from '../iterateJsdoc.js';

export default iterateJsdoc(({
  context,
  jsdocNode,
  sourceCode,
  report,
  utils,
}) => {
  const {
    checkBlockStarts,
    lines = 1,
    ignoreSameLine = true,
    excludedTags = ['type']
  } = context.options[0] || {};

  if (utils.hasATag(excludedTags)) {
    return;
  }

  const tokensBefore = sourceCode.getTokensBefore(jsdocNode, {includeComments: true});
  const tokenBefore = tokensBefore.slice(-1)[0];
  if (!tokenBefore || (tokenBefore.value === '{' && !checkBlockStarts)) {
    return;
  }

  if (tokenBefore.loc?.end?.line + lines >=
    /** @type {number} */
      (jsdocNode.loc?.start?.line)
    ) {
    const startLine = jsdocNode.loc?.start?.line;
    const sameLine = tokenBefore.loc?.end?.line === startLine;

    if (sameLine && ignoreSameLine) {
      return;
    }

    /** @type {import('eslint').Rule.ReportFixer} */
    const fix = (fixer) => {
      let indent = '';
      if (sameLine) {
        const spaceDiff = /** @type {number} */ (jsdocNode.loc?.start?.column) -
          /** @type {number} */ (tokenBefore.loc?.end?.column);
        // @ts-expect-error Should be a comment
        indent = /** @type {import('estree').Comment} */ (
          jsdocNode
        ).value.match(/^\*\n([ \t]*) \*/)?.[1]?.slice(spaceDiff);
        if (!indent) {
          /** @type {import('eslint').AST.Token|import('estree').Comment|undefined} */
          let tokenPrior = tokenBefore;
          let startColumn;
          while (tokenPrior && tokenPrior?.loc?.start?.line === startLine) {
            startColumn = tokenPrior.loc?.start?.column;
            tokenPrior = tokensBefore.pop();
          }
          indent = ' '.repeat(
            /* c8 ignore next */
            /** @type {number} */ (startColumn ? startColumn - 1 : 0)
          );
        }
      }

      return fixer.insertTextAfter(
        /** @type {import('eslint').AST.Token} */
        (tokenBefore),
        '\n'.repeat(lines) +
        (sameLine ? '\n' + indent : '')
      );
    };
    report(`Required ${lines} line(s) before JSDoc block`, fix);
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    fixable: 'code',
    docs: {
      description: 'Enforces minimum number of newlines before JSDoc comment blocks',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/lines-before-block.md#repos-sticky-header',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          checkBlockStarts: {
            type: 'boolean',
          },
          excludedTags: {
            type: 'array',
            items: {
              type: 'string'
            }
          },
          ignoreSameLine: {
            type: 'boolean',
          },
          lines: {
            type: 'integer'
          }
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
