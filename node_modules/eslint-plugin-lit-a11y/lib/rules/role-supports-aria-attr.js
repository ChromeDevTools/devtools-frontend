/**
 * @fileoverview
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { roles, aria } = require('aria-query');
const { TemplateAnalyzer } = require('../../template-analyzer/template-analyzer.js');
const { isAriaPropertyName } = require('../utils/aria.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import("eslint").Rule.RuleModule} */
const RoleSupportsAriaAttrRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce that elements with a defined role contain only supported ARIA attributes for that role.',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/role-supports-aria-attrs.md',
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
              if (Object.keys(element.attribs).includes('role')) {
                /** @type {element['attribs'] & { role?: import("aria-query").ARIARole }} */
                const { role } = element.attribs;
                if (role.startsWith('{{')) return; // role is interpolated, assume its OK
                const { props: propKeyValues } = roles.get(role);
                const propertySet = Object.keys(propKeyValues);
                const invalidAriaPropsForRole = [...aria.keys()].filter(
                  attribute => propertySet.indexOf(attribute) === -1,
                );

                Object.keys(element.attribs)
                  .filter(isAriaPropertyName)
                  .forEach(attr => {
                    if (invalidAriaPropsForRole.includes(attr)) {
                      const loc = analyzer.getLocationForAttribute(element, attr);
                      context.report({
                        loc,
                        message: `The "{{role}}" role must not be used with the "${attr}" attribute.'`,
                        data: {
                          role,
                          attr,
                        },
                      });
                    }
                  });
              }
            },
          });
        }
      },
    };
  },
};

module.exports = ruleExtender(RoleSupportsAriaAttrRule, HasLitHtmlImportRuleExtension);
