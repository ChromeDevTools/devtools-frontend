"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _iterateJsdoc = _interopRequireDefault(require("../iterateJsdoc.cjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
var _default = exports.default = (0, _iterateJsdoc.default)(({
  context,
  jsdocNode,
  sourceCode,
  report,
  utils
}) => {
  var _tokenBefore$loc, _jsdocNode$loc;
  const {
    checkBlockStarts,
    lines = 1,
    ignoreSameLine = true,
    excludedTags = ['type']
  } = context.options[0] || {};
  if (utils.hasATag(excludedTags)) {
    return;
  }
  const tokensBefore = sourceCode.getTokensBefore(jsdocNode, {
    includeComments: true
  });
  const tokenBefore = tokensBefore.slice(-1)[0];
  if (!tokenBefore || tokenBefore.value === '{' && !checkBlockStarts) {
    return;
  }
  if (((_tokenBefore$loc = tokenBefore.loc) === null || _tokenBefore$loc === void 0 || (_tokenBefore$loc = _tokenBefore$loc.end) === null || _tokenBefore$loc === void 0 ? void 0 : _tokenBefore$loc.line) + lines >= ( /** @type {number} */(_jsdocNode$loc = jsdocNode.loc) === null || _jsdocNode$loc === void 0 || (_jsdocNode$loc = _jsdocNode$loc.start) === null || _jsdocNode$loc === void 0 ? void 0 : _jsdocNode$loc.line)) {
    var _jsdocNode$loc2, _tokenBefore$loc2;
    const startLine = (_jsdocNode$loc2 = jsdocNode.loc) === null || _jsdocNode$loc2 === void 0 || (_jsdocNode$loc2 = _jsdocNode$loc2.start) === null || _jsdocNode$loc2 === void 0 ? void 0 : _jsdocNode$loc2.line;
    const sameLine = ((_tokenBefore$loc2 = tokenBefore.loc) === null || _tokenBefore$loc2 === void 0 || (_tokenBefore$loc2 = _tokenBefore$loc2.end) === null || _tokenBefore$loc2 === void 0 ? void 0 : _tokenBefore$loc2.line) === startLine;
    if (sameLine && ignoreSameLine) {
      return;
    }

    /** @type {import('eslint').Rule.ReportFixer} */
    const fix = fixer => {
      let indent = '';
      if (sameLine) {
        var _jsdocNode$loc3, _tokenBefore$loc3, _jsdocNode$value$matc;
        const spaceDiff = /** @type {number} */((_jsdocNode$loc3 = jsdocNode.loc) === null || _jsdocNode$loc3 === void 0 || (_jsdocNode$loc3 = _jsdocNode$loc3.start) === null || _jsdocNode$loc3 === void 0 ? void 0 : _jsdocNode$loc3.column) - ( /** @type {number} */(_tokenBefore$loc3 = tokenBefore.loc) === null || _tokenBefore$loc3 === void 0 || (_tokenBefore$loc3 = _tokenBefore$loc3.end) === null || _tokenBefore$loc3 === void 0 ? void 0 : _tokenBefore$loc3.column);
        // @ts-expect-error Should be a comment
        indent = /** @type {import('estree').Comment} */(_jsdocNode$value$matc = jsdocNode.value.match(/^\*\n([ \t]*) \*/)) === null || _jsdocNode$value$matc === void 0 || (_jsdocNode$value$matc = _jsdocNode$value$matc[1]) === null || _jsdocNode$value$matc === void 0 ? void 0 : _jsdocNode$value$matc.slice(spaceDiff);
        if (!indent) {
          /** @type {import('eslint').AST.Token|import('estree').Comment|undefined} */
          let tokenPrior = tokenBefore;
          let startColumn;
          while (tokenPrior && ((_tokenPrior = tokenPrior) === null || _tokenPrior === void 0 || (_tokenPrior = _tokenPrior.loc) === null || _tokenPrior === void 0 || (_tokenPrior = _tokenPrior.start) === null || _tokenPrior === void 0 ? void 0 : _tokenPrior.line) === startLine) {
            var _tokenPrior, _tokenPrior$loc;
            startColumn = (_tokenPrior$loc = tokenPrior.loc) === null || _tokenPrior$loc === void 0 || (_tokenPrior$loc = _tokenPrior$loc.start) === null || _tokenPrior$loc === void 0 ? void 0 : _tokenPrior$loc.column;
            tokenPrior = tokensBefore.pop();
          }
          indent = ' '.repeat( /* c8 ignore next */
          /** @type {number} */startColumn ? startColumn - 1 : 0);
        }
      }
      return fixer.insertTextAfter( /** @type {import('eslint').AST.Token} */
      tokenBefore, '\n'.repeat(lines) + (sameLine ? '\n' + indent : ''));
    };
    report(`Required ${lines} line(s) before JSDoc block`, fix);
  }
}, {
  iterateAllJsdocs: true,
  meta: {
    fixable: 'code',
    docs: {
      description: 'Enforces minimum number of newlines before JSDoc comment blocks',
      url: 'https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/lines-before-block.md#repos-sticky-header'
    },
    schema: [{
      additionalProperties: false,
      properties: {
        checkBlockStarts: {
          type: 'boolean'
        },
        excludedTags: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        ignoreSameLine: {
          type: 'boolean'
        },
        lines: {
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