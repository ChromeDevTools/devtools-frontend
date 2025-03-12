import { c as createRule, i as isTokenOnSameLine, s as isSemicolonToken, T as deepMerge, h as castRuleModule } from '../utils.js';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

const ClassMemberTypes = {
  "*": { test: () => true },
  "field": { test: (node) => node.type === "PropertyDefinition" },
  "method": { test: (node) => node.type === "MethodDefinition" }
};
var _baseRule = createRule(
  {
    name: "lines-between-class-members",
    package: "js",
    meta: {
      type: "layout",
      docs: {
        description: "Require or disallow an empty line between class members"
      },
      fixable: "whitespace",
      schema: [
        {
          anyOf: [
            {
              type: "object",
              properties: {
                enforce: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      blankLine: { type: "string", enum: ["always", "never"] },
                      prev: { type: "string", enum: ["method", "field", "*"] },
                      next: { type: "string", enum: ["method", "field", "*"] }
                    },
                    additionalProperties: false,
                    required: ["blankLine", "prev", "next"]
                  },
                  minItems: 1
                }
              },
              additionalProperties: false,
              required: ["enforce"]
            },
            {
              type: "string",
              enum: ["always", "never"]
            }
          ]
        },
        {
          type: "object",
          properties: {
            exceptAfterSingleLine: {
              type: "boolean",
              default: false
            }
          },
          additionalProperties: false
        }
      ],
      messages: {
        never: "Unexpected blank line between class members.",
        always: "Expected blank line between class members."
      }
    },
    create(context) {
      const options = [];
      options[0] = context.options[0] || "always";
      options[1] = context.options[1] || { exceptAfterSingleLine: false };
      const configureList = typeof options[0] === "object" ? options[0].enforce : [{ blankLine: options[0], prev: "*", next: "*" }];
      const sourceCode = context.sourceCode;
      function getBoundaryTokens(curNode, nextNode) {
        const lastToken = sourceCode.getLastToken(curNode);
        const prevToken = sourceCode.getTokenBefore(lastToken);
        const nextToken = sourceCode.getFirstToken(nextNode);
        const isSemicolonLessStyle = isSemicolonToken(lastToken) && !isTokenOnSameLine(prevToken, lastToken) && isTokenOnSameLine(lastToken, nextToken);
        return isSemicolonLessStyle ? { curLast: prevToken, nextFirst: lastToken } : { curLast: lastToken, nextFirst: nextToken };
      }
      function findLastConsecutiveTokenAfter(prevLastToken, nextFirstToken, maxLine) {
        const after = sourceCode.getTokenAfter(prevLastToken, { includeComments: true });
        if (after !== nextFirstToken && after.loc.start.line - prevLastToken.loc.end.line <= maxLine)
          return findLastConsecutiveTokenAfter(after, nextFirstToken, maxLine);
        return prevLastToken;
      }
      function findFirstConsecutiveTokenBefore(nextFirstToken, prevLastToken, maxLine) {
        const before = sourceCode.getTokenBefore(nextFirstToken, { includeComments: true });
        if (before !== prevLastToken && nextFirstToken.loc.start.line - before.loc.end.line <= maxLine)
          return findFirstConsecutiveTokenBefore(before, prevLastToken, maxLine);
        return nextFirstToken;
      }
      function hasTokenOrCommentBetween(before, after) {
        return sourceCode.getTokensBetween(before, after, { includeComments: true }).length !== 0;
      }
      function match(node, type) {
        return ClassMemberTypes[type].test(node);
      }
      function getPaddingType(prevNode, nextNode) {
        for (let i = configureList.length - 1; i >= 0; --i) {
          const configure = configureList[i];
          const matched = match(prevNode, configure.prev) && match(nextNode, configure.next);
          if (matched)
            return configure.blankLine;
        }
        return null;
      }
      return {
        ClassBody(node) {
          const body = node.body;
          for (let i = 0; i < body.length - 1; i++) {
            const curFirst = sourceCode.getFirstToken(body[i]);
            const { curLast, nextFirst } = getBoundaryTokens(body[i], body[i + 1]);
            const isMulti = !isTokenOnSameLine(curFirst, curLast);
            const skip = !isMulti && options[1].exceptAfterSingleLine;
            const beforePadding = findLastConsecutiveTokenAfter(curLast, nextFirst, 1);
            const afterPadding = findFirstConsecutiveTokenBefore(nextFirst, curLast, 1);
            const isPadded = afterPadding.loc.start.line - beforePadding.loc.end.line > 1;
            const hasTokenInPadding = hasTokenOrCommentBetween(beforePadding, afterPadding);
            const curLineLastToken = findLastConsecutiveTokenAfter(curLast, nextFirst, 0);
            const paddingType = getPaddingType(body[i], body[i + 1]);
            if (paddingType === "never" && isPadded) {
              context.report({
                node: body[i + 1],
                messageId: "never",
                fix(fixer) {
                  if (hasTokenInPadding)
                    return null;
                  return fixer.replaceTextRange([beforePadding.range[1], afterPadding.range[0]], "\n");
                }
              });
            } else if (paddingType === "always" && !skip && !isPadded) {
              context.report({
                node: body[i + 1],
                messageId: "always",
                fix(fixer) {
                  if (hasTokenInPadding)
                    return null;
                  return fixer.insertTextAfter(curLineLastToken, "\n");
                }
              });
            }
          }
        }
      };
    }
  }
);

const baseRule = /* @__PURE__ */ castRuleModule(_baseRule);
const schema = Object.values(
  deepMerge(
    { ...baseRule.meta.schema },
    {
      1: {
        properties: {
          exceptAfterOverload: {
            type: "boolean",
            default: true
          }
        }
      }
    }
  )
);
var linesBetweenClassMembers = createRule({
  name: "lines-between-class-members",
  package: "ts",
  meta: {
    type: "layout",
    docs: {
      description: "Require or disallow an empty line between class members"
    },
    fixable: "whitespace",
    hasSuggestions: baseRule.meta.hasSuggestions,
    schema,
    messages: baseRule.meta.messages
  },
  defaultOptions: [
    "always",
    {
      exceptAfterOverload: true,
      exceptAfterSingleLine: false
    }
  ],
  create(context, [firstOption, secondOption]) {
    const rules = baseRule.create(context);
    const exceptAfterOverload = secondOption?.exceptAfterOverload && (firstOption === "always" || typeof firstOption !== "string" && firstOption?.enforce.some(({ blankLine, prev, next }) => blankLine === "always" && prev !== "field" && next !== "field"));
    function isOverload(node) {
      return (node.type === AST_NODE_TYPES.TSAbstractMethodDefinition || node.type === AST_NODE_TYPES.MethodDefinition) && node.value.type === AST_NODE_TYPES.TSEmptyBodyFunctionExpression;
    }
    return {
      ClassBody(node) {
        const body = exceptAfterOverload ? node.body.filter((node2) => !isOverload(node2)) : node.body;
        rules.ClassBody({ ...node, body });
      }
    };
  }
});

export { linesBetweenClassMembers as default };
