// @ts-nocheck
/**
 * @fileoverview Ensure autocomplete attribute is correct.
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { runVirtualRule } = require('axe-core');
const { TemplateAnalyzer } = require('../../template-analyzer/template-analyzer.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import("eslint").Rule.RuleModule} */
const AutocompleteValidRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Ensure autocomplete attribute is correct.',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/autocomplete-valid.md',
    },
    fixable: null,
    schema: [],
  },

  create(context) {
    /**
     * @param {import('parse5-htmlparser2-tree-adapter').Element} element
     */
    function isInputElementWithAutoComplete(element) {
      return (
        element.name === 'input' &&
        element.attribs &&
        typeof element.attribs.autocomplete === 'string'
      );
    }

    return {
      TaggedTemplateExpression(node) {
        if (isHtmlTaggedTemplate(node, context)) {
          const analyzer = TemplateAnalyzer.create(node);

          analyzer.traverse({
            enterElement(element) {
              if (isInputElementWithAutoComplete(element)) {
                if (element.attribs.autocomplete.startsWith('{{')) {
                  return; // autocomplete is interpolated. assume it's legit and move on.
                }

                const { violations } = runVirtualRule('autocomplete-valid', {
                  nodeName: 'input',
                  attributes: {
                    autocomplete: element.attribs.autocomplete,
                    // Which autocomplete is valid depends on the input type
                    type: element.attribs.type === null ? undefined : element.attribs.type,
                  },
                });

                if (violations.length === 0) {
                  return;
                }

                const loc = analyzer.getLocationFor(element);
                context.report({
                  loc,
                  message: violations[0].nodes[0].all[0].message,
                });
              }
            },
          });
        }
      },
    };
  },
};

module.exports = ruleExtender(AutocompleteValidRule, HasLitHtmlImportRuleExtension);
