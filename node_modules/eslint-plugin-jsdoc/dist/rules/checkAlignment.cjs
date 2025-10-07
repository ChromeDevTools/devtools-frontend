"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  indent,
  jsdocNode,
  report,
  sourceCode
}) => {
  const {
    innerIndent = 1
  } = context.options[0] || {};

  // `indent` is whitespace from line 1 (`/**`), so slice and account for "/".
  const indentLevel = indent.length + innerIndent;
  const sourceLines = sourceCode.getText(jsdocNode).split('\n').slice(1).map((line, number) => {
    return {
      line: line.split('*')[0],
      number
    };
  }).filter(({
    line
  }) => {
    return !line.trimStart().length;
  });

  /** @type {import('eslint').Rule.ReportFixer} */
  const fix = fixer => {
    const replacement = sourceCode.getText(jsdocNode).split('\n').map((line, index) => {
      // Ignore the first line and all lines not starting with `*`
      const ignored = !index || line.split('*')[0].trimStart().length;
      return ignored ? line : `${indent}${''.padStart(innerIndent, ' ')}${line.trimStart()}`;
    }).join('\n');
    return fixer.replaceText(jsdocNode, replacement);
  };
  sourceLines.some(({
    line,
    number
  }) => {
    if (line.length !== indentLevel) {
      report('Expected JSDoc block to be aligned.', fix, {
        line: number + 1
      });
      return true;
    }
    return false;
  });
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Reports invalid alignment of JSDoc block asterisks.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/check-alignment.md#repos-sticky-header'
    },
    fixable: 'code',
    schema: [{
      additionalProperties: false,
      properties: {
        innerIndent: {
          default: 1,
          description: `Set to 0 if you wish to avoid the normal requirement for an inner indentation of
one space. Defaults to 1 (one space of normal inner indentation).`,
          type: 'integer'
        }
      },
      type: 'object'
    }],
    type: 'layout'
  }
});
module.exports = exports.default;
//# sourceMappingURL=checkAlignment.cjs.map