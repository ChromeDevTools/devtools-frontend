/**
 * @fileoverview <iframe> elements must have a unique title property.
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
const IframeTitleRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '<iframe> elements must have a unique title property.',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/iframe-title.md',
    },
    messages: {
      iframeTitle: '<iframe> elements must have a unique title property.',
    },
    fixable: null,
    schema: [],
  },
  create(context) {
    /**
     * @param {import("parse5-htmlparser2-tree-adapter").Element} element
     */
    function isUntitledIframe(element) {
      return (
        element.name === 'iframe' && (!element.attribs.title || element.attribs.title === undefined)
      );
    }

    return {
      TaggedTemplateExpression(node) {
        if (isHtmlTaggedTemplate(node, context)) {
          const analyzer = TemplateAnalyzer.create(node);

          analyzer.traverse({
            enterElement(element) {
              if (isUntitledIframe(element)) {
                const loc = analyzer.getLocationFor(element);
                context.report({ loc, messageId: 'iframeTitle' });
              }
            },
          });
        }
      },
    };
  },
};

module.exports = ruleExtender(IframeTitleRule, HasLitHtmlImportRuleExtension);
