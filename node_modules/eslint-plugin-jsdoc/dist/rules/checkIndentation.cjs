"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * @param {string} str
 * @param {string[]} excludeTags
 * @returns {string}
 */
const maskExcludedContent = (str, excludeTags) => {
  const regContent = new RegExp(`([ \\t]+\\*)[ \\t]@(?:${excludeTags.join('|')})(?=[ \\n])([\\w\\|\\W]*?\\n)(?=[ \\t]*\\*(?:[ \\t]*@\\w+\\s|\\/))`, 'gv');
  return str.replace(regContent, (_match, margin, code) => {
    return (margin + '\n').repeat(code.match(/\n/gv).length);
  });
};

/**
 * @param {string} str
 * @returns {string}
 */
const maskCodeBlocks = str => {
  const regContent = /([ \t]+\*)[ \t]```[^\n]*?([\w\|\W]*?\n)(?=[ \t]*\*(?:[ \t]*(?:```|@\w+\s)|\/))/gv;
  return str.replaceAll(regContent, (_match, margin, code) => {
    return (margin + '\n').repeat(code.match(/\n/gv).length);
  });
};
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  jsdocNode,
  report,
  sourceCode
}) => {
  const options = context.options[0] || {};
  const /** @type {{excludeTags: string[]}} */{
    excludeTags = ['example']
  } = options;
  const reg = /^(?:\/?\**|[ \t]*)\*[ \t]{2}/gmv;
  const textWithoutCodeBlocks = maskCodeBlocks(sourceCode.getText(jsdocNode));
  const text = excludeTags.length ? maskExcludedContent(textWithoutCodeBlocks, excludeTags) : textWithoutCodeBlocks;
  if (reg.test(text)) {
    const lineBreaks = text.slice(0, reg.lastIndex).match(/\n/gv) || [];
    report('There must be no indentation.', null, {
      line: lineBreaks.length
    });
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Reports invalid padding inside JSDoc blocks.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/check-indentation.md#repos-sticky-header'
    },
    schema: [{
      additionalProperties: false,
      properties: {
        excludeTags: {
          description: `Array of tags (e.g., \`['example', 'description']\`) whose content will be
"hidden" from the \`check-indentation\` rule. Defaults to \`['example']\`.

By default, the whole JSDoc block will be checked for invalid padding.
That would include \`@example\` blocks too, which can get in the way
of adding full, readable examples of code without ending up with multiple
linting issues.

When disabled (by passing \`excludeTags: []\` option), the following code *will*
report a padding issue:

\`\`\`js
/**
 * @example
 * anArray.filter((a) => {
 *   return a.b;
 * });
 */
\`\`\``,
          items: {
            pattern: '^\\S+$',
            type: 'string'
          },
          type: 'array'
        }
      },
      type: 'object'
    }],
    type: 'layout'
  }
});
module.exports = exports.default;
//# sourceMappingURL=checkIndentation.cjs.map