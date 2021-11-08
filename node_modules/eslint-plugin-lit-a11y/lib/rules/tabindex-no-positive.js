/**
 * @fileoverview Enforce tabIndex value is not greater than zero.
 * @author open-wc
 */
const ruleExtender = require('eslint-rule-extender');
const { TemplateAnalyzer } = require('eslint-plugin-lit/lib/template-analyzer.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import("eslint").Rule.RuleModule} */
const TabindexNoPositiveRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce tabIndex value is not greater than zero.',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/tabindex-no-positive.md',
    },
    messages: {
      tabindexNoPositive: 'Invalid tabindex value {{value}}.',
      avoidPositiveTabindex: 'Avoid positive tabindex.',
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    const tabIndexAttributes = ['tabindex', '.tabindex'];

    return {
      TaggedTemplateExpression(node) {
        if (isHtmlTaggedTemplate(node, context)) {
          const analyzer = TemplateAnalyzer.create(node);

          analyzer.traverse({
            enterElement(element) {
              Object.entries(element.attribs).forEach(([attributeName, attributeValue]) => {
                if (!tabIndexAttributes.includes(attributeName)) return;

                let literal = attributeValue;
                const expr = analyzer.getAttributeValue(
                  element,
                  attributeName,
                  context.getSourceCode(),
                );

                if (typeof expr !== 'string') {
                  // if the interpolated value a simple literal expression, we can analyze it
                  if (expr.type === 'Literal') literal = `${expr.value}`;
                  // if the interpolated value is a variable name or some other
                  // non-literal expression, we can't analyze it
                  else return;
                }

                const value = parseInt(literal, 10);

                if (Number.isNaN(value)) {
                  const loc =
                    analyzer.getLocationForAttribute(
                      element,
                      attributeName,
                      context.getSourceCode(),
                    ) ?? node.loc;
                  if (loc) {
                    context.report({
                      loc,
                      messageId: 'tabindexNoPositive',
                      data: { value: literal.toString() },
                    });
                  }
                  return;
                }

                if (value > 0) {
                  const loc =
                    analyzer.getLocationForAttribute(
                      element,
                      attributeName,
                      context.getSourceCode(),
                    ) ?? node.loc;
                  if (loc) {
                    context.report({ loc, messageId: 'avoidPositiveTabindex' });
                  }
                }
              });
            },
          });
        }
      },
    };
  },
};

module.exports = ruleExtender(TabindexNoPositiveRule, HasLitHtmlImportRuleExtension);
