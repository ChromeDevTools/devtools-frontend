/**
 * @fileoverview Enforce distracting elements are not used.
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { TemplateAnalyzer } = require('eslint-plugin-lit/lib/template-analyzer.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const BANNED_ELEMENTS = ['blink', 'marquee'];

/** @type {import("eslint").Rule.RuleModule} */
const NoDistractingElementsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce distracting elements are not used.',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/no-distracting-elements.md',
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
              if (!element.sourceCodeLocation) {
                return; // probably a tree correction node
              }

              if (BANNED_ELEMENTS.includes(element.name)) {
                const loc =
                  analyzer.resolveLocation(
                    element.sourceCodeLocation.startTag,
                    context.getSourceCode(),
                  ) ?? node.loc;
                if (loc) {
                  context.report({
                    loc,
                    message: `<{{tagName}}> elements are distracting and must not be used.`,
                    data: {
                      tagName: element.name,
                    },
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

module.exports = ruleExtender(NoDistractingElementsRule, HasLitHtmlImportRuleExtension);
