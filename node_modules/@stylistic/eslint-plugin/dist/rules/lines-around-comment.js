'use strict';

var utils = require('../utils.js');
var utils$1 = require('@typescript-eslint/utils');
var astUtils = require('@typescript-eslint/utils/ast-utils');
require('eslint-visitor-keys');
require('espree');
require('estraverse');

function getEmptyLineNums$1(lines) {
  const emptyLines = lines.map((line, i) => ({
    code: line.trim(),
    num: i + 1
  })).filter((line) => !line.code).map((line) => line.num);
  return emptyLines;
}
function getCommentLineNums$1(comments) {
  const lines = [];
  comments.forEach((token) => {
    const start = token.loc.start.line;
    const end = token.loc.end.line;
    lines.push(start, end);
  });
  return lines;
}
var _baseRule = utils.createRule({
  name: "lines-around-comment",
  package: "js",
  meta: {
    type: "layout",
    docs: {
      description: "Require empty lines around comments"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          beforeBlockComment: {
            type: "boolean",
            default: true
          },
          afterBlockComment: {
            type: "boolean",
            default: false
          },
          beforeLineComment: {
            type: "boolean",
            default: false
          },
          afterLineComment: {
            type: "boolean",
            default: false
          },
          allowBlockStart: {
            type: "boolean",
            default: false
          },
          allowBlockEnd: {
            type: "boolean",
            default: false
          },
          allowClassStart: {
            type: "boolean"
          },
          allowClassEnd: {
            type: "boolean"
          },
          allowObjectStart: {
            type: "boolean"
          },
          allowObjectEnd: {
            type: "boolean"
          },
          allowArrayStart: {
            type: "boolean"
          },
          allowArrayEnd: {
            type: "boolean"
          },
          ignorePattern: {
            type: "string"
          },
          applyDefaultIgnorePatterns: {
            type: "boolean"
          },
          afterHashbangComment: {
            type: "boolean",
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      after: "Expected line after comment.",
      before: "Expected line before comment."
    }
  },
  create(context) {
    const options = Object.assign({}, context.options[0]);
    const ignorePattern = options.ignorePattern;
    const defaultIgnoreRegExp = utils.COMMENTS_IGNORE_PATTERN;
    const customIgnoreRegExp = ignorePattern && new RegExp(ignorePattern, "u");
    const applyDefaultIgnorePatterns = options.applyDefaultIgnorePatterns !== false;
    options.beforeBlockComment = typeof options.beforeBlockComment !== "undefined" ? options.beforeBlockComment : true;
    const sourceCode = context.sourceCode;
    const lines = sourceCode.lines;
    const numLines = lines.length + 1;
    const comments = sourceCode.getAllComments();
    const commentLines = getCommentLineNums$1(comments);
    const emptyLines = getEmptyLineNums$1(lines);
    const commentAndEmptyLines = new Set(commentLines.concat(emptyLines));
    function codeAroundComment(token) {
      let currentToken = token;
      do
        currentToken = sourceCode.getTokenBefore(currentToken, { includeComments: true });
      while (currentToken && utils.isCommentToken(currentToken));
      if (currentToken && utils.isTokenOnSameLine(currentToken, token))
        return true;
      currentToken = token;
      do
        currentToken = sourceCode.getTokenAfter(currentToken, { includeComments: true });
      while (currentToken && utils.isCommentToken(currentToken));
      if (currentToken && utils.isTokenOnSameLine(token, currentToken))
        return true;
      return false;
    }
    function isParentNodeType(parent, nodeType) {
      return parent.type === nodeType;
    }
    function getParentNodeOfToken(token) {
      const node = sourceCode.getNodeByRangeIndex(token.range[0]);
      if (node && node.type === "StaticBlock") {
        const openingBrace = sourceCode.getFirstToken(node, { skip: 1 });
        return openingBrace && token.range[0] >= openingBrace.range[0] ? node : null;
      }
      return node;
    }
    function isCommentAtParentStart(token, nodeType) {
      const parent = getParentNodeOfToken(token);
      if (parent && isParentNodeType(parent, nodeType)) {
        let parentStartNodeOrToken = parent;
        if (parent.type === "StaticBlock") {
          parentStartNodeOrToken = sourceCode.getFirstToken(parent, { skip: 1 });
        } else if (parent.type === "SwitchStatement") {
          parentStartNodeOrToken = sourceCode.getTokenAfter(parent.discriminant, {
            filter: utils.isOpeningBraceToken
          });
        }
        return !!parentStartNodeOrToken && token.loc.start.line - parentStartNodeOrToken.loc.start.line === 1;
      }
      return false;
    }
    function isCommentAtParentEnd(token, nodeType) {
      const parent = getParentNodeOfToken(token);
      return !!parent && isParentNodeType(parent, nodeType) && parent.loc.end.line - token.loc.end.line === 1;
    }
    function isCommentAtBlockStart(token) {
      return isCommentAtParentStart(token, "ClassBody") || isCommentAtParentStart(token, "BlockStatement") || isCommentAtParentStart(token, "StaticBlock") || isCommentAtParentStart(token, "SwitchCase") || isCommentAtParentStart(token, "SwitchStatement");
    }
    function isCommentAtBlockEnd(token) {
      return isCommentAtParentEnd(token, "ClassBody") || isCommentAtParentEnd(token, "BlockStatement") || isCommentAtParentEnd(token, "StaticBlock") || isCommentAtParentEnd(token, "SwitchCase") || isCommentAtParentEnd(token, "SwitchStatement");
    }
    function isCommentAtClassStart(token) {
      return isCommentAtParentStart(token, "ClassBody");
    }
    function isCommentAtClassEnd(token) {
      return isCommentAtParentEnd(token, "ClassBody");
    }
    function isCommentAtObjectStart(token) {
      return isCommentAtParentStart(token, "ObjectExpression") || isCommentAtParentStart(token, "ObjectPattern");
    }
    function isCommentAtObjectEnd(token) {
      return isCommentAtParentEnd(token, "ObjectExpression") || isCommentAtParentEnd(token, "ObjectPattern");
    }
    function isCommentAtArrayStart(token) {
      return isCommentAtParentStart(token, "ArrayExpression") || isCommentAtParentStart(token, "ArrayPattern");
    }
    function isCommentAtArrayEnd(token) {
      return isCommentAtParentEnd(token, "ArrayExpression") || isCommentAtParentEnd(token, "ArrayPattern");
    }
    function checkForEmptyLine(token, opts) {
      if (applyDefaultIgnorePatterns && defaultIgnoreRegExp.test(token.value))
        return;
      if (customIgnoreRegExp && customIgnoreRegExp.test(token.value))
        return;
      let after = opts.after;
      let before = opts.before;
      const prevLineNum = token.loc.start.line - 1;
      const nextLineNum = token.loc.end.line + 1;
      const commentIsNotAlone = codeAroundComment(token);
      const blockStartAllowed = options.allowBlockStart && isCommentAtBlockStart(token) && !(options.allowClassStart === false && isCommentAtClassStart(token));
      const blockEndAllowed = options.allowBlockEnd && isCommentAtBlockEnd(token) && !(options.allowClassEnd === false && isCommentAtClassEnd(token));
      const classStartAllowed = options.allowClassStart && isCommentAtClassStart(token);
      const classEndAllowed = options.allowClassEnd && isCommentAtClassEnd(token);
      const objectStartAllowed = options.allowObjectStart && isCommentAtObjectStart(token);
      const objectEndAllowed = options.allowObjectEnd && isCommentAtObjectEnd(token);
      const arrayStartAllowed = options.allowArrayStart && isCommentAtArrayStart(token);
      const arrayEndAllowed = options.allowArrayEnd && isCommentAtArrayEnd(token);
      const exceptionStartAllowed = blockStartAllowed || classStartAllowed || objectStartAllowed || arrayStartAllowed;
      const exceptionEndAllowed = blockEndAllowed || classEndAllowed || objectEndAllowed || arrayEndAllowed;
      if (prevLineNum < 1)
        before = false;
      if (nextLineNum >= numLines)
        after = false;
      if (commentIsNotAlone)
        return;
      const previousTokenOrComment = sourceCode.getTokenBefore(token, { includeComments: true });
      const nextTokenOrComment = sourceCode.getTokenAfter(token, { includeComments: true });
      if (!exceptionStartAllowed && before && !commentAndEmptyLines.has(prevLineNum) && !(utils.isCommentToken(previousTokenOrComment) && utils.isTokenOnSameLine(previousTokenOrComment, token))) {
        const lineStart = token.range[0] - token.loc.start.column;
        const range = [lineStart, lineStart];
        context.report({
          node: token,
          messageId: "before",
          fix(fixer) {
            return fixer.insertTextBeforeRange(range, "\n");
          }
        });
      }
      if (!exceptionEndAllowed && after && !commentAndEmptyLines.has(nextLineNum) && !(utils.isCommentToken(nextTokenOrComment) && utils.isTokenOnSameLine(token, nextTokenOrComment))) {
        context.report({
          node: token,
          messageId: "after",
          fix(fixer) {
            return fixer.insertTextAfter(token, "\n");
          }
        });
      }
    }
    return {
      Program() {
        comments.forEach((token) => {
          if (token.type === "Line") {
            if (options.beforeLineComment || options.afterLineComment) {
              checkForEmptyLine(token, {
                after: options.afterLineComment,
                before: options.beforeLineComment
              });
            }
          } else if (token.type === "Block") {
            if (options.beforeBlockComment || options.afterBlockComment) {
              checkForEmptyLine(token, {
                after: options.afterBlockComment,
                before: options.beforeBlockComment
              });
            }
          } else if (token.type === "Shebang") {
            if (options.afterHashbangComment) {
              checkForEmptyLine(token, {
                after: options.afterHashbangComment,
                before: false
              });
            }
          }
        });
      }
    };
  }
});

const baseRule = /* @__PURE__ */ utils.castRuleModule(_baseRule);
const COMMENTS_IGNORE_PATTERN = /^\s*(?:eslint|jshint\s+|jslint\s+|istanbul\s+|globals?\s+|exported\s+|jscs)/u;
function getEmptyLineNums(lines) {
  const emptyLines = lines.map((line, i) => ({
    code: line.trim(),
    num: i + 1
  })).filter((line) => !line.code).map((line) => line.num);
  return emptyLines;
}
function getCommentLineNums(comments) {
  const lines = [];
  comments.forEach((token) => {
    const start = token.loc.start.line;
    const end = token.loc.end.line;
    lines.push(start, end);
  });
  return lines;
}
var linesAroundComment = utils.createRule({
  name: "lines-around-comment",
  package: "ts",
  meta: {
    type: "layout",
    docs: {
      description: "Require empty lines around comments"
    },
    schema: [
      {
        type: "object",
        properties: {
          beforeBlockComment: {
            type: "boolean",
            default: true
          },
          afterBlockComment: {
            type: "boolean",
            default: false
          },
          beforeLineComment: {
            type: "boolean",
            default: false
          },
          afterLineComment: {
            type: "boolean",
            default: false
          },
          allowBlockStart: {
            type: "boolean",
            default: false
          },
          allowBlockEnd: {
            type: "boolean",
            default: false
          },
          allowClassStart: {
            type: "boolean"
          },
          allowClassEnd: {
            type: "boolean"
          },
          allowObjectStart: {
            type: "boolean"
          },
          allowObjectEnd: {
            type: "boolean"
          },
          allowArrayStart: {
            type: "boolean"
          },
          allowArrayEnd: {
            type: "boolean"
          },
          allowInterfaceStart: {
            type: "boolean"
          },
          allowInterfaceEnd: {
            type: "boolean"
          },
          allowTypeStart: {
            type: "boolean"
          },
          allowTypeEnd: {
            type: "boolean"
          },
          allowEnumStart: {
            type: "boolean"
          },
          allowEnumEnd: {
            type: "boolean"
          },
          allowModuleStart: {
            type: "boolean"
          },
          allowModuleEnd: {
            type: "boolean"
          },
          ignorePattern: {
            type: "string"
          },
          applyDefaultIgnorePatterns: {
            type: "boolean"
          },
          afterHashbangComment: {
            type: "boolean"
          }
        },
        additionalProperties: false
      }
    ],
    fixable: baseRule.meta.fixable,
    hasSuggestions: baseRule.meta.hasSuggestions,
    messages: baseRule.meta.messages
  },
  defaultOptions: [
    {
      beforeBlockComment: true
    }
  ],
  create(context, [_options]) {
    const options = _options;
    const defaultIgnoreRegExp = COMMENTS_IGNORE_PATTERN;
    const customIgnoreRegExp = new RegExp(options.ignorePattern ?? "", "u");
    const sourceCode = context.sourceCode;
    const comments = sourceCode.getAllComments();
    const lines = sourceCode.lines;
    const commentLines = getCommentLineNums(comments);
    const emptyLines = getEmptyLineNums(lines);
    const commentAndEmptyLines = new Set(commentLines.concat(emptyLines));
    function codeAroundComment(token) {
      let currentToken = token;
      do {
        currentToken = sourceCode.getTokenBefore(currentToken, {
          includeComments: true
        });
      } while (currentToken && astUtils.isCommentToken(currentToken));
      if (currentToken && astUtils.isTokenOnSameLine(currentToken, token))
        return true;
      currentToken = token;
      do {
        currentToken = sourceCode.getTokenAfter(currentToken, {
          includeComments: true
        });
      } while (currentToken && astUtils.isCommentToken(currentToken));
      if (currentToken && astUtils.isTokenOnSameLine(token, currentToken))
        return true;
      return false;
    }
    function isParentNodeType(parent, nodeType) {
      return parent.type === nodeType;
    }
    function getParentNodeOfToken(token) {
      const node = sourceCode.getNodeByRangeIndex(token.range[0]);
      return node;
    }
    function isCommentAtParentStart(token, nodeType) {
      const parent = getParentNodeOfToken(token);
      if (parent && isParentNodeType(parent, nodeType)) {
        const parentStartNodeOrToken = parent;
        return token.loc.start.line - parentStartNodeOrToken.loc.start.line === 1;
      }
      return false;
    }
    function isCommentAtParentEnd(token, nodeType) {
      const parent = getParentNodeOfToken(token);
      return !!parent && isParentNodeType(parent, nodeType) && parent.loc.end.line - token.loc.end.line === 1;
    }
    function isCommentAtInterfaceStart(token) {
      return isCommentAtParentStart(token, utils$1.AST_NODE_TYPES.TSInterfaceBody);
    }
    function isCommentAtInterfaceEnd(token) {
      return isCommentAtParentEnd(token, utils$1.AST_NODE_TYPES.TSInterfaceBody);
    }
    function isCommentAtTypeStart(token) {
      return isCommentAtParentStart(token, utils$1.AST_NODE_TYPES.TSTypeLiteral);
    }
    function isCommentAtTypeEnd(token) {
      return isCommentAtParentEnd(token, utils$1.AST_NODE_TYPES.TSTypeLiteral);
    }
    function isCommentAtEnumStart(token) {
      return isCommentAtParentStart(token, utils$1.AST_NODE_TYPES.TSEnumBody) || isCommentAtParentStart(token, utils$1.AST_NODE_TYPES.TSEnumDeclaration);
    }
    function isCommentAtEnumEnd(token) {
      return isCommentAtParentEnd(token, utils$1.AST_NODE_TYPES.TSEnumBody) || isCommentAtParentEnd(token, utils$1.AST_NODE_TYPES.TSEnumDeclaration);
    }
    function isCommentAtModuleStart(token) {
      return isCommentAtParentStart(token, utils$1.AST_NODE_TYPES.TSModuleBlock);
    }
    function isCommentAtModuleEnd(token) {
      return isCommentAtParentEnd(token, utils$1.AST_NODE_TYPES.TSModuleBlock);
    }
    function isCommentNearTSConstruct(token) {
      return isCommentAtInterfaceStart(token) || isCommentAtInterfaceEnd(token) || isCommentAtTypeStart(token) || isCommentAtTypeEnd(token) || isCommentAtEnumStart(token) || isCommentAtEnumEnd(token) || isCommentAtModuleStart(token) || isCommentAtModuleEnd(token);
    }
    function checkForEmptyLine(token, { before, after }) {
      if (!isCommentNearTSConstruct(token))
        return;
      if (options.applyDefaultIgnorePatterns !== false && defaultIgnoreRegExp.test(token.value)) {
        return;
      }
      if (options.ignorePattern && customIgnoreRegExp.test(token.value))
        return;
      const prevLineNum = token.loc.start.line - 1;
      const nextLineNum = token.loc.end.line + 1;
      if (codeAroundComment(token))
        return;
      const interfaceStartAllowed = Boolean(options.allowInterfaceStart) && isCommentAtInterfaceStart(token);
      const interfaceEndAllowed = Boolean(options.allowInterfaceEnd) && isCommentAtInterfaceEnd(token);
      const typeStartAllowed = Boolean(options.allowTypeStart) && isCommentAtTypeStart(token);
      const typeEndAllowed = Boolean(options.allowTypeEnd) && isCommentAtTypeEnd(token);
      const enumStartAllowed = Boolean(options.allowEnumStart) && isCommentAtEnumStart(token);
      const enumEndAllowed = Boolean(options.allowEnumEnd) && isCommentAtEnumEnd(token);
      const moduleStartAllowed = Boolean(options.allowModuleStart) && isCommentAtModuleStart(token);
      const moduleEndAllowed = Boolean(options.allowModuleEnd) && isCommentAtModuleEnd(token);
      const exceptionStartAllowed = interfaceStartAllowed || typeStartAllowed || enumStartAllowed || moduleStartAllowed;
      const exceptionEndAllowed = interfaceEndAllowed || typeEndAllowed || enumEndAllowed || moduleEndAllowed;
      const previousTokenOrComment = sourceCode.getTokenBefore(token, {
        includeComments: true
      });
      const nextTokenOrComment = sourceCode.getTokenAfter(token, {
        includeComments: true
      });
      if (!exceptionStartAllowed && before && !commentAndEmptyLines.has(prevLineNum) && !(astUtils.isCommentToken(previousTokenOrComment) && astUtils.isTokenOnSameLine(previousTokenOrComment, token))) {
        const lineStart = token.range[0] - token.loc.start.column;
        const range = [lineStart, lineStart];
        context.report({
          node: token,
          messageId: "before",
          fix(fixer) {
            return fixer.insertTextBeforeRange(range, "\n");
          }
        });
      }
      if (!exceptionEndAllowed && after && !commentAndEmptyLines.has(nextLineNum) && !(astUtils.isCommentToken(nextTokenOrComment) && astUtils.isTokenOnSameLine(token, nextTokenOrComment))) {
        context.report({
          node: token,
          messageId: "after",
          fix(fixer) {
            return fixer.insertTextAfter(token, "\n");
          }
        });
      }
    }
    const customReport = (descriptor) => {
      if ("node" in descriptor) {
        if (descriptor.node.type === utils$1.AST_TOKEN_TYPES.Line || descriptor.node.type === utils$1.AST_TOKEN_TYPES.Block) {
          if (isCommentNearTSConstruct(descriptor.node))
            return;
        }
      }
      return context.report(descriptor);
    };
    const customContext = { report: customReport };
    const proxiedContext = new Proxy(
      customContext,
      {
        get(target, path, receiver) {
          if (path !== "report")
            return Reflect.get(context, path, receiver);
          return Reflect.get(target, path, receiver);
        }
      }
    );
    const rules = baseRule.create(proxiedContext);
    return {
      Program(node) {
        rules.Program(node);
        comments.forEach((token) => {
          if (token.type === utils$1.AST_TOKEN_TYPES.Line) {
            if (options.beforeLineComment || options.afterLineComment) {
              checkForEmptyLine(token, {
                after: options.afterLineComment,
                before: options.beforeLineComment
              });
            }
          } else if (token.type === utils$1.AST_TOKEN_TYPES.Block) {
            if (options.beforeBlockComment || options.afterBlockComment) {
              checkForEmptyLine(token, {
                after: options.afterBlockComment,
                before: options.beforeBlockComment
              });
            }
          }
        });
      }
    };
  }
});

module.exports = linesAroundComment;
