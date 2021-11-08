/**
 * @fileoverview aria-role
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { TemplateAnalyzer } = require('eslint-plugin-lit/lib/template-analyzer.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');
const { isConcreteAriaRole } = require('../utils/aria.js');
const { getLiteralAttributeValue } = require('../utils/getLiteralAttributeValue.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import("eslint").Rule.RuleModule} */
const AriaRoleRule = {
  meta: {
    type: 'suggestion',
    messages: {
      invalidRole: 'Invalid role "{{role}}".',
    },
    docs: {
      description: 'aria-role',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/aria-role.md',
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
                if (attr !== 'role') return;

                const role = getLiteralAttributeValue(
                  analyzer,
                  element,
                  'role',
                  context.getSourceCode(),
                );

                if (role === undefined) return;

                if (!isConcreteAriaRole(role)) {
                  const loc =
                    analyzer.getLocationForAttribute(element, attr, context.getSourceCode()) ??
                    node.loc;
                  if (loc) {
                    context.report({
                      loc,
                      messageId: 'invalidRole',
                      data: {
                        role,
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

module.exports = ruleExtender(AriaRoleRule, HasLitHtmlImportRuleExtension);
