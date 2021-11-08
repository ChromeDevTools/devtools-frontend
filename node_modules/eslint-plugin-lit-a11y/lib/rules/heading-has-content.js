/**
 * @fileoverview Enforce heading (h1, h2, etc) elements contain accessible content.
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { TemplateAnalyzer } = require('eslint-plugin-lit/lib/template-analyzer.js');
const { hasAccessibleChildren } = require('../utils/hasAccessibleChildren.js');
const { isCustomElement } = require('../utils/isCustomElement.js');
const { isHiddenFromScreenReader } = require('../utils/isHiddenFromScreenReader.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/** @type {import("eslint").Rule.RuleModule} */
const HeadingHasContentRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce heading (h1, h2, etc) elements contain accessible content.',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/heading-has-content.md',
    },
    messages: {
      headingHasContent: '<{{tagName}}> elements must have accessible content.',
    },
    fixable: null,
    schema: [
      {
        customHeadingElements: {
          type: 'array',
          description: 'list of custom elements tag names which should be considered headings',
          default: [],
          uniqueItems: true,
          additionalItems: false,
          items: {
            type: 'string',
            pattern: '^[a-z]\\w+-\\w+',
          },
        },
      },
    ],
  },
  create(context) {
    /**
     * Is it a heading element?
     * @param {import("parse5-htmlparser2-tree-adapter").Element} element
     * @param {string[]} customHeadingElements list of custom elements tag names which should be considered headings
     * @return {boolean}
     */
    function isHeading(element, customHeadingElements = []) {
      if (isCustomElement(element)) return customHeadingElements.includes(element.name);
      return headings.includes(element.name);
    }

    return {
      TaggedTemplateExpression(node) {
        if (isHtmlTaggedTemplate(node, context)) {
          const analyzer = TemplateAnalyzer.create(node);

          const options = (context.options && context.options[0]) || {};

          analyzer.traverse({
            enterElement(element) {
              if (!element.sourceCodeLocation) {
                return; // probably a tree correction node
              }

              if (
                isHeading(element, options.customHeadingElements) &&
                !hasAccessibleChildren(element) &&
                !isHiddenFromScreenReader(element)
              ) {
                const loc =
                  analyzer.resolveLocation(
                    element.sourceCodeLocation.startTag,
                    context.getSourceCode(),
                  ) ?? node.loc;

                const messageId = 'headingHasContent';

                const data = { tagName: element.name };

                if (loc) {
                  context.report({ loc, messageId, data });
                }
              }
            },
          });
        }
      },
    };
  },
};

module.exports = ruleExtender(HeadingHasContentRule, HasLitHtmlImportRuleExtension);
