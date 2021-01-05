/**
 * @fileoverview Enforce a clickable non-interactive element has at least 1 keyboard event listener.
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { TemplateAnalyzer } = require('../../template-analyzer/template-analyzer.js');
const { isIncludedInAOM } = require('../utils/isIncludedInAOM.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { isNonInteractiveElement } = require('../utils/isNonInteractiveElement.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import("eslint").Rule.RuleModule} */
const ClickEventsHaveKeyEventsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'click-events-have-key-events',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/click-events-have-key-events.md',
    },
    messages: {
      clickableNonInteractiveElements:
        'Clickable non-interactive elements must have at least 1 keyboard event listener',
    },
    fixable: null,
    schema: [
      {
        allowList: {
          type: 'array',
          description:
            'list of tag names which are permitted to have click listeners without key listeners',
          default: [],
          uniqueItems: true,
          additionalItems: false,
          items: {
            type: 'string',
            pattern: '^[a-z]\\w+-\\w+',
          },
        },
        allowCustomElements: {
          type: 'boolean',
          description:
            'When true, permits all custom elements to have click listeners without key listeners',
          default: true,
        },
      },
    ],
  },

  create(context) {
    /**
     * @param {import("parse5-htmlparser2-tree-adapter").Element} element
     * @return {boolean}
     */
    function hasClickListener(element) {
      return Object.keys(element.attribs).includes('@click');
    }

    /**
     * @param {import("parse5-htmlparser2-tree-adapter").Element} element
     * @return {boolean}
     */
    function hasKeyboardListener(element) {
      const requiredProps = ['@keydown', '@keyup', '@keypress'];
      return Object.keys(element.attribs).some(attr => requiredProps.includes(attr));
    }

    return {
      TaggedTemplateExpression(node) {
        if (isHtmlTaggedTemplate(node, context)) {
          const analyzer = TemplateAnalyzer.create(node);

          analyzer.traverse({
            enterElement(element) {
              const options = (context.options && context.options[0]) || {};

              if (
                hasClickListener(element) &&
                !hasKeyboardListener(element) && // doesn't keyboard listeners
                isIncludedInAOM(element) &&
                isNonInteractiveElement(element, options)
              ) {
                const loc = analyzer.getLocationFor(element);

                context.report({ loc, messageId: 'clickableNonInteractiveElements' });
              }
            },
          });
        }
      },
    };
  },
};

module.exports = ruleExtender(ClickEventsHaveKeyEventsRule, HasLitHtmlImportRuleExtension);
