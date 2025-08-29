import iterateJsdoc from '../iterateJsdoc.js';

/**
 * Punctuators that begin a logical group should not require a line before it skipped. Specifically
 * `[` starts an array, `{` starts an object or block, `(` starts a grouping, and `=` starts a
 * declaration (like a variable or a type alias).
 */
const startPunctuators = new Set([
  '(', '=', '[', '{',
]);

export default iterateJsdoc(({
  context,
  jsdocNode,
  report,
  sourceCode,
  utils,
}) => {
  const {
    checkBlockStarts,
    excludedTags = [
      'type',
    ],
    ignoreSameLine = true,
    ignoreSingleLines = true,
    lines = 1,
  } = context.options[0] || {};

  if (utils.hasATag(excludedTags)) {
    return;
  }

  const tokensBefore = sourceCode.getTokensBefore(jsdocNode, {
    includeComments: true,
  });
  const tokenBefore = tokensBefore.at(-1);
  if (
    !tokenBefore || (
      tokenBefore.type === 'Punctuator' &&
      !checkBlockStarts &&
      startPunctuators.has(tokenBefore.value)
    )
  ) {
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

    if (ignoreSingleLines && jsdocNode.loc?.start.line === jsdocNode.loc?.end.line) {
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
        ).value.match(/^\*\n([\t ]*) \*/u)?.[1]?.slice(spaceDiff);
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
            /** @type {number} */ (startColumn ? startColumn - 1 : 0),
          );
        }
      }

      return fixer.insertTextAfter(
        /** @type {import('eslint').AST.Token} */
        (tokenBefore),
        '\n'.repeat(lines) +
        (sameLine ? '\n' + indent : ''),
      );
    };

    report(`Required ${lines} line(s) before JSDoc block`, fix);
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Enforces minimum number of newlines before JSDoc comment blocks',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/lines-before-block.md#repos-sticky-header',
    },
    fixable: 'code',
    schema: [
      {
        additionalProperties: false,
        properties: {
          checkBlockStarts: {
            type: 'boolean',
          },
          excludedTags: {
            items: {
              type: 'string',
            },
            type: 'array',
          },
          ignoreSameLine: {
            type: 'boolean',
          },
          ignoreSingleLines: {
            type: 'boolean',
          },
          lines: {
            type: 'integer',
          },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
});
