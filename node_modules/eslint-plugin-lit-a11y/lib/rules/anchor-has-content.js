/**
 * @fileoverview Enforce anchor elements to contain accessible content.
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { TemplateAnalyzer } = require('../../template-analyzer/template-analyzer.js');
const { hasAccessibleChildren } = require('../utils/hasAccessibleChildren.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
const AnchorHasContentRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce anchor elements to contain accessible content.',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/anchor-has-content.md',
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    return {
      TaggedTemplateExpression(node) {
        if (isHtmlTaggedTemplate(node, context)) {
          const analyzer = TemplateAnalyzer.create(node);

          analyzer.traverse({
            enterElement(element) {
              if (element.name === 'a') {
                if (!hasAccessibleChildren(element)) {
                  const loc = analyzer.getLocationFor(element);
                  context.report({
                    loc,
                    message: 'Anchor should contain accessible content.',
                  });
                }
              }
            },
          });
        }
      },
    };
  },
};

module.exports = ruleExtender(AnchorHasContentRule, HasLitHtmlImportRuleExtension);
