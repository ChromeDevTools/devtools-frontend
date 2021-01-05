/**
 * @fileoverview Enforce no accesskey attribute on element.
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { TemplateAnalyzer } = require('../../template-analyzer/template-analyzer.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import("eslint").Rule.RuleModule} */
const NoAccessKeyRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce no accesskey attribute on element.',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/no-access-key.md',
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
              if (Object.keys(element.attribs).includes('accesskey')) {
                const loc = analyzer.getLocationForAttribute(element, 'accesskey');
                context.report({
                  loc,
                  message: `Avoid using the accesskey attribute.`,
                });
              }
            },
          });
        }
      },
    };
  },
};

module.exports = ruleExtender(NoAccessKeyRule, HasLitHtmlImportRuleExtension);
