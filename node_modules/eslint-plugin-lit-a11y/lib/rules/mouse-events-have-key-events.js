/**
 * @fileoverview Enforce @mouseover/@mouseout are accompanied by @focus/@blur.
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
const MouseEventsHaveKeyEventsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'mouse-events-have-key-events',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/mouse-events-have-key-events.md',
    },
    messages: {
      mouseEventsHaveKeyEvents: '@{{mouseevent}} must be accompanied by @{{keyevent}}',
    },
    fixable: null,
    schema: [
      {
        allowList: {
          type: 'array',
          description:
            'list of tag names which are permitted to have mouse event listeners without key listeners',
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
            'When true, permits all custom elements to have mouse event listeners without key listeners',
          default: true,
        },
      },
    ],
  },

  create(context) {
    return {
      TaggedTemplateExpression(node) {
        if (isHtmlTaggedTemplate(node, context)) {
          const analyzer = TemplateAnalyzer.create(node);

          analyzer.traverse({
            enterElement(element) {
              const { attribs } = element;
              // Check @mouseover / @focus pairing.
              const hasMouseoverHandler = Object.keys(attribs).includes('@mouseover');
              const mouseoverHandlerValue = attribs['@mouseover'];

              const options = (context.options && context.options[0]) || {};

              if (!isIncludedInAOM(element) || !isNonInteractiveElement(element, options)) return;

              if (hasMouseoverHandler && mouseoverHandlerValue != null) {
                const hasFocusHandler = Object.keys(attribs).includes('@focus');
                const focusHandlerValue = attribs['@focus'];

                if (
                  hasFocusHandler === false ||
                  focusHandlerValue === null ||
                  focusHandlerValue === undefined
                ) {
                  context.report({
                    node,
                    messageId: 'mouseEventsHaveKeyEvents',
                    data: {
                      mouseevent: 'mouseover',
                      keyevent: 'focus',
                    },
                  });
                }
              }

              // Checkout onmouseout / onblur pairing
              const onMouseOut = Object.keys(attribs).includes('@mouseout');
              const onMouseOutValue = attribs['@mouseout'];
              if (onMouseOut && onMouseOutValue != null) {
                const hasOnBlur = Object.keys(attribs).includes('@blur');
                const onBlurValue = attribs['@blur'];

                if (hasOnBlur === false || onBlurValue === null || onBlurValue === undefined) {
                  context.report({
                    node,
                    messageId: 'mouseEventsHaveKeyEvents',
                    data: {
                      mouseevent: 'mouseout',
                      keyevent: 'blur',
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

module.exports = ruleExtender(MouseEventsHaveKeyEventsRule, HasLitHtmlImportRuleExtension);
