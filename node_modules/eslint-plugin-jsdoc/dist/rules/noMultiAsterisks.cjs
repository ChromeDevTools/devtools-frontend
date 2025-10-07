"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const middleAsterisksBlockWS = /^([\t ]|\*(?!\*))+/v;
const middleAsterisksNoBlockWS = /^\*+/v;
const endAsterisksSingleLineBlockWS = /\*((?:\*|(?: |\t))*)\*$/v;
const endAsterisksMultipleLineBlockWS = /((?:\*|(?: |\t))*)\*$/v;
const endAsterisksSingleLineNoBlockWS = /\*(\**)\*$/v;
const endAsterisksMultipleLineNoBlockWS = /(\**)\*$/v;
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  jsdoc,
  utils
}) => {
  const {
    allowWhitespace = false,
    preventAtEnd = true,
    preventAtMiddleLines = true
  } = context.options[0] || {};
  const middleAsterisks = allowWhitespace ? middleAsterisksNoBlockWS : middleAsterisksBlockWS;
  jsdoc.source.some(({
    number,
    tokens
  }) => {
    const {
      delimiter,
      description,
      end,
      name,
      postDelimiter,
      tag,
      type
    } = tokens;
    if (preventAtMiddleLines && !end && !tag && !type && !name && (!allowWhitespace && middleAsterisks.test(description) || allowWhitespace && middleAsterisks.test(postDelimiter + description))) {
      // console.log('description', JSON.stringify(description));
      const fix = () => {
        tokens.description = description.replace(middleAsterisks, '');
      };
      utils.reportJSDoc('Should be no multiple asterisks on middle lines.', {
        line: number
      }, fix, true);
      return true;
    }
    if (!preventAtEnd || !end) {
      return false;
    }
    const isSingleLineBlock = delimiter === '/**';
    const delim = isSingleLineBlock ? '*' : delimiter;
    const endAsterisks = allowWhitespace ? isSingleLineBlock ? endAsterisksSingleLineNoBlockWS : endAsterisksMultipleLineNoBlockWS : isSingleLineBlock ? endAsterisksSingleLineBlockWS : endAsterisksMultipleLineBlockWS;
    const endingAsterisksAndSpaces = (allowWhitespace ? postDelimiter + description + delim : description + delim).match(endAsterisks);
    if (!endingAsterisksAndSpaces || !isSingleLineBlock && endingAsterisksAndSpaces[1] && !endingAsterisksAndSpaces[1].trim()) {
      return false;
    }
    const endFix = () => {
      if (!isSingleLineBlock) {
        tokens.delimiter = '';
      }
      tokens.description = (description + delim).replace(endAsterisks, '');
    };
    utils.reportJSDoc('Should be no multiple asterisks on end lines.', {
      line: number
    }, endFix, true);
    return true;
  });
}, {
  iterateAllJsdocs: true,
  meta: {
    docs: {
      description: 'Prevents use of multiple asterisks at the beginning of lines.',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/no-multi-asterisks.md#repos-sticky-header'
    },
    fixable: 'code',
    schema: [{
      additionalProperties: false,
      properties: {
        allowWhitespace: {
          description: `Set to \`true\` if you wish to allow asterisks after a space (as with Markdown):

\`\`\`js
/**
 * *bold* text
 */
\`\`\`

Defaults to \`false\`.`,
          type: 'boolean'
        },
        preventAtEnd: {
          description: `Prevent the likes of this:

\`\`\`js
/**
 *
 *
 **/
\`\`\`

Defaults to \`true\`.`,
          type: 'boolean'
        },
        preventAtMiddleLines: {
          description: `Prevent the likes of this:

\`\`\`js
/**
 *
 **
 */
\`\`\`

Defaults to \`true\`.`,
          type: 'boolean'
        }
      },
      type: 'object'
    }],
    type: 'suggestion'
  }
});
module.exports = exports.default;
//# sourceMappingURL=noMultiAsterisks.cjs.map