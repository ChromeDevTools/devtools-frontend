"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Punctuators that begin a logical group should not require a line before it skipped. Specifically
 * `[` starts an array, `{` starts an object or block, `(` starts a grouping, and `=` starts a
 * declaration (like a variable or a type alias).
 */
const startPunctuators = new Set(['(', '=', '[', '{']);
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  jsdocNode,
  report,
  sourceCode,
  utils
}) => {
  const {
    checkBlockStarts,
    excludedTags = ['type'],
    ignoreSameLine = true,
    ignoreSingleLines = true,
    lines = 1
  } = context.options[0] || {};
  if (utils.hasATag(excludedTags)) {
    return;
  }
  const tokensBefore = sourceCode.getTokensBefore(jsdocNode, {
    includeComments: true
  });
  const tokenBefore = tokensBefore.at(-1);
  if (!tokenBefore || tokenBefore.type === 'Punctuator' && !checkBlockStarts && startPunctuators.has(tokenBefore.value)) {
    return;
  }
  if (tokenBefore.loc?.end?.line + lines >= (/** @type {number} */
  jsdocNode.loc?.start?.line)) {
    const startLine = jsdocNode.loc?.start?.line;
    const sameLine = tokenBefore.loc?.end?.line === startLine;
    if (sameLine && ignoreSameLine) {
      return;
    }
    if (ignoreSingleLines && jsdocNode.loc?.start.line === jsdocNode.loc?.end.line) {
      return;
    }

    /** @type {import('eslint').Rule.ReportFixer} */
    const fix = fixer => {
      let indent = '';
      if (sameLine) {
        const spaceDiff = /** @type {number} */jsdocNode.loc?.start?.column - (/** @type {number} */tokenBefore.loc?.end?.column);
        // @ts-expect-error Should be a comment
        indent = /** @type {import('estree').Comment} */jsdocNode.value.match(/^\*\n([\t ]*) \*/v)?.[1]?.slice(spaceDiff);
        if (!indent) {
          /** @type {import('eslint').AST.Token|import('estree').Comment|undefined} */
          let tokenPrior = tokenBefore;
          let startColumn;
          while (tokenPrior && tokenPrior?.loc?.start?.line === startLine) {
            startColumn = tokenPrior.loc?.start?.column;
            tokenPrior = tokensBefore.pop();
          }
          indent = ' '.repeat(/* c8 ignore next */
          /** @type {number} */startColumn ? startColumn - 1 : 0);
        }
      }
      return fixer.insertTextAfter(/** @type {import('eslint').AST.Token} */
      tokenBefore, '\n'.repeat(lines) + (sameLine ? '\n' + indent : ''));
    };
    report(`Required ${lines} line(s) before JSDoc block`, fix);
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Enforces minimum number of newlines before JSDoc comment blocks',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/lines-before-block.md#repos-sticky-header'
    },
    fixable: 'code',
    schema: [{
      additionalProperties: false,
      properties: {
        checkBlockStarts: {
          description: `Whether to additionally check the start of blocks, such as classes or functions.
Defaults to \`false\`.`,
          type: 'boolean'
        },
        excludedTags: {
          description: `An array of tags whose presence in the JSDoc block will prevent the
application of the rule. Defaults to \`['type']\` (i.e., if \`@type\` is present,
lines before the block will not be added).`,
          items: {
            type: 'string'
          },
          type: 'array'
        },
        ignoreSameLine: {
          description: `This option excludes cases where the JSDoc block occurs on the same line as a
preceding code or comment. Defaults to \`true\`.`,
          type: 'boolean'
        },
        ignoreSingleLines: {
          description: `This option excludes cases where the JSDoc block is only one line long.
Defaults to \`true\`.`,
          type: 'boolean'
        },
        lines: {
          description: 'The minimum number of lines to require. Defaults to 1.',
          type: 'integer'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=linesBeforeBlock.cjs.map