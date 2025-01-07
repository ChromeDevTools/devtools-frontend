'use strict';

var utils = require('../utils.js');
require('eslint-visitor-keys');
require('espree');
require('estraverse');

const messages = {
  noSpaceBefore: "There should be no space before '='",
  noSpaceAfter: "There should be no space after '='",
  needSpaceBefore: "A space is required before '='",
  needSpaceAfter: "A space is required after '='"
};
var jsxEqualsSpacing = utils.createRule({
  name: "jsx-equals-spacing",
  package: "jsx",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce or disallow spaces around equal signs in JSX attributes"
    },
    fixable: "code",
    messages,
    schema: [
      {
        type: "string",
        enum: ["always", "never"]
      }
    ]
  },
  create(context) {
    const config = context.options[0] || "never";
    return {
      JSXOpeningElement(node) {
        node.attributes.forEach((attrNode) => {
          if (!(attrNode.type !== "JSXSpreadAttribute" && attrNode.value !== null))
            return;
          const sourceCode = context.sourceCode;
          const equalToken = sourceCode.getTokenAfter(attrNode.name);
          const spacedBefore = sourceCode.isSpaceBetweenTokens(attrNode.name, equalToken);
          const spacedAfter = sourceCode.isSpaceBetweenTokens(equalToken, attrNode.value);
          if (config === "never") {
            if (spacedBefore) {
              context.report({
                node: attrNode,
                messageId: "noSpaceBefore",
                loc: equalToken.loc.start,
                fix(fixer) {
                  return fixer.removeRange([attrNode.name.range[1], equalToken.range[0]]);
                }
              });
            }
            if (spacedAfter) {
              context.report({
                node: attrNode,
                messageId: "noSpaceAfter",
                loc: equalToken.loc.start,
                fix(fixer) {
                  return fixer.removeRange([equalToken.range[1], attrNode.value.range[0]]);
                }
              });
            }
          } else if (config === "always") {
            if (!spacedBefore) {
              context.report({
                messageId: "needSpaceBefore",
                node: attrNode,
                loc: equalToken.loc.start,
                fix(fixer) {
                  return fixer.insertTextBefore(equalToken, " ");
                }
              });
            }
            if (!spacedAfter) {
              context.report({
                node: attrNode,
                messageId: "needSpaceAfter",
                loc: equalToken.loc.start,
                fix(fixer) {
                  return fixer.insertTextAfter(equalToken, " ");
                }
              });
            }
          }
        });
      }
    };
  }
});

module.exports = jsxEqualsSpacing;
