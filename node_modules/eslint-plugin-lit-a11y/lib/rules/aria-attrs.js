/**
 * @fileoverview Elements cannot use an invalid ARIA attribute.
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { TemplateAnalyzer } = require('eslint-plugin-lit/lib/template-analyzer.js');
const { isInvalidAriaAttribute } = require('../utils/aria.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import("eslint").Rule.RuleModule} */
const AriaAttrsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Elements cannot use an invalid ARIA attribute.',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/aria-attrs.md',
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
              for (const attr of Object.keys(element.attribs)) {
                if (isInvalidAriaAttribute(attr)) {
                  const loc =
                    analyzer.getLocationForAttribute(element, attr, context.getSourceCode()) ??
                    node.loc;

                  if (loc) {
                    context.report({
                      loc,
                      message: 'Invalid ARIA attribute "{{attr}}".',
                      data: {
                        attr,
                      },
                    });
                  }
                }
              }
            },
          });
        }
      },
    };
  },
};

module.exports = ruleExtender(AriaAttrsRule, HasLitHtmlImportRuleExtension);
