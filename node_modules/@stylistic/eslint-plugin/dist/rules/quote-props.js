'use strict';

var utils = require('../utils.js');
var utils$1 = require('@typescript-eslint/utils');
var espree = require('espree');
require('eslint-visitor-keys');
require('estraverse');

var _baseRule = utils.createRule({
  name: "quote-props",
  package: "js",
  meta: {
    type: "layout",
    docs: {
      description: "Require quotes around object literal property names"
    },
    schema: {
      anyOf: [
        {
          type: "array",
          items: [
            {
              type: "string",
              enum: ["always", "as-needed", "consistent", "consistent-as-needed"]
            }
          ],
          minItems: 0,
          maxItems: 1
        },
        {
          type: "array",
          items: [
            {
              type: "string",
              enum: ["always", "as-needed", "consistent", "consistent-as-needed"]
            },
            {
              type: "object",
              properties: {
                keywords: {
                  type: "boolean"
                },
                unnecessary: {
                  type: "boolean"
                },
                numbers: {
                  type: "boolean"
                }
              },
              additionalProperties: false
            }
          ],
          minItems: 0,
          maxItems: 2
        }
      ]
    },
    fixable: "code",
    messages: {
      requireQuotesDueToReservedWord: "Properties should be quoted as '{{property}}' is a reserved word.",
      inconsistentlyQuotedProperty: "Inconsistently quoted property '{{key}}' found.",
      unnecessarilyQuotedProperty: "Unnecessarily quoted property '{{property}}' found.",
      unquotedReservedProperty: "Unquoted reserved word '{{property}}' used as key.",
      unquotedNumericProperty: "Unquoted number literal '{{property}}' used as key.",
      unquotedPropertyFound: "Unquoted property '{{property}}' found.",
      redundantQuoting: "Properties shouldn't be quoted as all quotes are redundant."
    }
  },
  create(context) {
    const MODE = context.options[0];
    const KEYWORDS = context.options[1] && context.options[1].keywords;
    const CHECK_UNNECESSARY = !context.options[1] || context.options[1].unnecessary !== false;
    const NUMBERS = context.options[1] && context.options[1].numbers;
    const sourceCode = context.sourceCode;
    function isKeyword(tokenStr) {
      return utils.KEYWORDS_JS.includes(tokenStr);
    }
    function areQuotesRedundant(rawKey, tokens, skipNumberLiterals = false) {
      return tokens.length === 1 && tokens[0].start === 0 && tokens[0].end === rawKey.length && (["Identifier", "Keyword", "Null", "Boolean"].includes(tokens[0].type) || tokens[0].type === "Numeric" && !skipNumberLiterals && String(+tokens[0].value) === tokens[0].value);
    }
    function getUnquotedKey(key) {
      return key.type === "Identifier" ? key.name : key.value;
    }
    function getQuotedKey(key) {
      if (key.type === "Literal" && typeof key.value === "string") {
        return sourceCode.getText(key);
      }
      return `"${key.type === "Identifier" ? key.name : key.value}"`;
    }
    function checkUnnecessaryQuotes(node) {
      const key = node.key;
      if (node.type !== "ImportAttribute" && (node.method || node.computed || node.shorthand))
        return;
      if (key.type === "Literal" && typeof key.value === "string") {
        let tokens;
        try {
          tokens = espree.tokenize(key.value);
        } catch {
          return;
        }
        if (tokens.length !== 1)
          return;
        const isKeywordToken = isKeyword(tokens[0].value);
        if (isKeywordToken && KEYWORDS)
          return;
        if (CHECK_UNNECESSARY && areQuotesRedundant(key.value, tokens, NUMBERS)) {
          context.report({
            node,
            messageId: "unnecessarilyQuotedProperty",
            data: { property: key.value },
            fix: (fixer) => fixer.replaceText(key, getUnquotedKey(key))
          });
        }
      } else if (KEYWORDS && key.type === "Identifier" && isKeyword(key.name)) {
        context.report({
          node,
          messageId: "unquotedReservedProperty",
          data: { property: key.name },
          fix: (fixer) => fixer.replaceText(key, getQuotedKey(key))
        });
      } else if (NUMBERS && key.type === "Literal" && utils.isNumericLiteral(key)) {
        context.report({
          node,
          messageId: "unquotedNumericProperty",
          data: { property: key.value },
          fix: (fixer) => fixer.replaceText(key, getQuotedKey(key))
        });
      }
    }
    function checkOmittedQuotes(node) {
      if (node.type !== "ImportAttribute" && (node.method || node.computed || node.shorthand))
        return;
      const key = node.key;
      if (key.type === "Literal" && typeof key.value === "string")
        return;
      context.report({
        node,
        messageId: "unquotedPropertyFound",
        data: { property: key.name || key.value },
        fix: (fixer) => fixer.replaceText(key, getQuotedKey(key))
      });
    }
    function checkConsistencyForObject(node, checkQuotesRedundancy) {
      checkConsistency(
        node.properties.filter((property) => property.type !== "SpreadElement" && property.key && !property.method && !property.computed && !property.shorthand),
        checkQuotesRedundancy
      );
    }
    function checkImportAttributes(attributes) {
      if (!attributes)
        return;
      if (MODE === "consistent")
        checkConsistency(attributes, false);
      if (MODE === "consistent-as-needed")
        checkConsistency(attributes, true);
    }
    function checkConsistency(properties, checkQuotesRedundancy) {
      const quotedProps = [];
      const unquotedProps = [];
      let keywordKeyName = null;
      let necessaryQuotes = false;
      properties.forEach((property) => {
        const key = property.key;
        if (key.type === "Literal" && typeof key.value === "string") {
          quotedProps.push(property);
          if (checkQuotesRedundancy) {
            let tokens;
            try {
              tokens = espree.tokenize(key.value);
            } catch {
              necessaryQuotes = true;
              return;
            }
            necessaryQuotes = necessaryQuotes || !areQuotesRedundant(key.value, tokens) || KEYWORDS && isKeyword(tokens[0].value);
          }
        } else if (KEYWORDS && checkQuotesRedundancy && key.type === "Identifier" && isKeyword(key.name)) {
          unquotedProps.push(property);
          necessaryQuotes = true;
          keywordKeyName = key.name;
        } else {
          unquotedProps.push(property);
        }
      });
      if (checkQuotesRedundancy && quotedProps.length && !necessaryQuotes) {
        quotedProps.forEach((property) => {
          const key = property.key;
          context.report({
            node: property,
            messageId: "redundantQuoting",
            fix: (fixer) => fixer.replaceText(key, getUnquotedKey(key))
          });
        });
      } else if (unquotedProps.length && keywordKeyName) {
        unquotedProps.forEach((property) => {
          context.report({
            node: property,
            messageId: "requireQuotesDueToReservedWord",
            data: { property: keywordKeyName },
            fix: (fixer) => fixer.replaceText(property.key, getQuotedKey(property.key))
          });
        });
      } else if (quotedProps.length && unquotedProps.length) {
        unquotedProps.forEach((property) => {
          context.report({
            node: property,
            messageId: "inconsistentlyQuotedProperty",
            data: { key: property.key.name || property.key.value },
            fix: (fixer) => fixer.replaceText(property.key, getQuotedKey(property.key))
          });
        });
      }
    }
    return {
      Property(node) {
        if (MODE === "always" || !MODE)
          checkOmittedQuotes(node);
        if (MODE === "as-needed")
          checkUnnecessaryQuotes(node);
      },
      ObjectExpression(node) {
        if (MODE === "consistent")
          checkConsistencyForObject(node, false);
        if (MODE === "consistent-as-needed")
          checkConsistencyForObject(node, true);
      },
      ImportAttribute(node) {
        if (MODE === "always" || !MODE)
          checkOmittedQuotes(node);
        if (MODE === "as-needed")
          checkUnnecessaryQuotes(node);
      },
      ImportDeclaration(node) {
        checkImportAttributes(node.attributes);
      },
      ExportAllDeclaration(node) {
        checkImportAttributes(node.attributes);
      },
      ExportNamedDeclaration(node) {
        checkImportAttributes(node.attributes);
      }
    };
  }
});

const baseRule = /* @__PURE__ */ utils.castRuleModule(_baseRule);
var quoteProps = utils.createRule({
  name: "quote-props",
  package: "ts",
  meta: {
    ...baseRule.meta,
    docs: {
      description: "Require quotes around object literal, type literal, interfaces and enums property names"
    }
  },
  defaultOptions: ["always"],
  create(context) {
    const rules = baseRule.create(context);
    return {
      ...rules,
      TSPropertySignature(node) {
        return rules.Property({
          ...node,
          type: utils$1.AST_NODE_TYPES.Property,
          shorthand: false,
          method: false,
          kind: "init",
          value: null
        });
      },
      TSMethodSignature(node) {
        return rules.Property({
          ...node,
          type: utils$1.AST_NODE_TYPES.Property,
          shorthand: false,
          method: true,
          kind: "init",
          value: null
        });
      },
      TSEnumMember(node) {
        return rules.Property({
          ...node,
          type: utils$1.AST_NODE_TYPES.Property,
          key: node.id,
          optional: false,
          shorthand: false,
          method: false,
          kind: "init",
          value: null
        });
      },
      TSTypeLiteral(node) {
        return rules.ObjectExpression({
          ...node,
          type: utils$1.AST_NODE_TYPES.ObjectExpression,
          properties: node.members
        });
      },
      TSInterfaceBody(node) {
        return rules.ObjectExpression({
          ...node,
          type: utils$1.AST_NODE_TYPES.ObjectExpression,
          properties: node.body
        });
      },
      TSEnumDeclaration(node) {
        const members = node.body?.members || node.members;
        return rules.ObjectExpression({
          ...node,
          type: utils$1.AST_NODE_TYPES.ObjectExpression,
          properties: members.map((member) => ({ ...member, key: member.id }))
        });
      }
    };
  }
});

module.exports = quoteProps;
