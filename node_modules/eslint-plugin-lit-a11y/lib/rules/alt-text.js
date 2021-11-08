/**
 * @fileoverview
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { TemplateAnalyzer } = require('eslint-plugin-lit/lib/template-analyzer.js');
const { elementHasAttribute, elementHasSomeAttribute } = require('../utils/elementHasAttribute.js');
const { isHiddenFromScreenReader } = require('../utils/isHiddenFromScreenReader.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type{import('eslint').Rule.RuleModule} */
const AltTextRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Images require alt text',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/alt-text.md',
    },
    messages: {
      roleImgAttrs: "elements with role '{{role}}' must have an {{attrs}} attribute.",
      imgAttrs: '<img> elements must have an alt attribute.',
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    // @ts-expect-error: since we allow node 10. Remove when we require node >= 12
    const formatter = new Intl.ListFormat('en', { style: 'long', type: 'disjunction' });

    /** These are the attributes which, if present, allow an element with role "img" to pass */
    const ALT_ATTRS = ['aria-label', 'aria-labelledby'];

    /**
     * Is the element an `<img>` with no `alt` attribute?
     * @param {import('parse5-htmlparser2-tree-adapter').Element} element
     * @return {boolean}
     */
    function isUnlabeledAOMImg(element) {
      return (
        element.name === 'img' &&
        element.attribs.role !== 'presentation' &&
        !isHiddenFromScreenReader(element) &&
        !elementHasAttribute(element, 'alt')
      );
    }

    /**
     * Does the element an `img` role with no label?
     * @param {import('parse5-htmlparser2-tree-adapter').Element} element
     * @return {boolean}
     */
    function isUnlabeledImgRole(element) {
      return (
        element.name !== 'img' &&
        element.attribs.role === 'img' &&
        !isHiddenFromScreenReader(element) &&
        !elementHasSomeAttribute(element, ALT_ATTRS)
      );
    }

    return {
      TaggedTemplateExpression(node) {
        if (isHtmlTaggedTemplate(node, context)) {
          const analyzer = TemplateAnalyzer.create(node);

          analyzer.traverse({
            enterElement(element) {
              if (!element.sourceCodeLocation) {
                return; // probably a tree correction element
              }

              const loc =
                analyzer.resolveLocation(
                  element.sourceCodeLocation.startTag,
                  context.getSourceCode(),
                ) ?? node.loc;

              if (!loc) {
                return;
              }

              if (isUnlabeledAOMImg(element)) {
                context.report({ loc, messageId: 'imgAttrs' });
              } else if (isUnlabeledImgRole(element)) {
                context.report({
                  loc,
                  messageId: 'roleImgAttrs',
                  data: {
                    role: 'img',
                    attrs: formatter.format(ALT_ATTRS),
                  },
                });
              }
            },
          });
        }
      },
    };
  },
};

module.exports = ruleExtender(AltTextRule, HasLitHtmlImportRuleExtension);
