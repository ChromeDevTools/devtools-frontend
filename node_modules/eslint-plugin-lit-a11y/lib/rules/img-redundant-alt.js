/**
 * @fileoverview
 * @author open-wc
 */

const ruleExtender = require('eslint-rule-extender');
const { TemplateAnalyzer } = require('../../template-analyzer/template-analyzer.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { isAriaHidden } = require('../utils/aria.js');
const { elementHasAttribute } = require('../utils/elementHasAttribute.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

if (!('ListFormat' in Intl)) {
  /* eslint-disable global-require */
  // @ts-expect-error: since we allow node 10. Remove when we require node >= 12
  require('intl-list-format');
  // eslint-disable-next-line global-require
  // @ts-expect-error: since we allow node 10. Remove when we require node >= 12
  require('intl-list-format/locale-data/en');
  /* eslint-enable global-require */
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

const DEFAULT_KEYWORDS = ['image', 'picture', 'photo'];

/** @type {import("eslint").Rule.RuleModule} */
const ImgRedundantAltRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce img alt attribute does not contain the word image, picture, or photo.',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/img-redundant-alt.md',
    },
    messages: {
      imgRedundantAlt:
        '<img> alt attribute must be descriptive; it cannot contain the banned {{plural}} {{banned}}.',
    },
    fixable: null,
    schema: [
      {
        keywords: {
          type: 'array',
          default: DEFAULT_KEYWORDS,
          items: {
            type: 'string',
          },
          uniqueItems: true,
          additionalItems: false,
        },
      },
    ],
  },

  create(context) {
    // @ts-expect-error: since we allow node 10. Remove when we require node >= 12
    const formatter = new Intl.ListFormat('en', { style: 'long', type: 'disjunction' });

    return {
      TaggedTemplateExpression(node) {
        if (isHtmlTaggedTemplate(node, context)) {
          const analyzer = TemplateAnalyzer.create(node);

          analyzer.traverse({
            enterElement(element) {
              if (
                element.name !== 'img' ||
                !elementHasAttribute(element, 'alt') ||
                isAriaHidden(element)
              ) {
                return;
              }

              const optionsKeywords =
                (context.options && context.options[0] && context.options[0].keywords) || [];

              const bannedKeywords = [...DEFAULT_KEYWORDS, ...optionsKeywords];

              const { value } = analyzer.describeAttribute(element.attribs.alt);

              if (!value) return;

              const alt = value.toString();

              const contraband = bannedKeywords.filter(keyword =>
                alt.toString().toLowerCase().includes(keyword.toLowerCase()),
              );

              if (contraband.length > 0) {
                const banned = formatter.format(contraband);
                const loc = analyzer.getLocationForAttribute(element, 'alt');

                context.report({
                  loc,
                  messageId: 'imgRedundantAlt',
                  data: {
                    banned,
                    plural: contraband.length > 1 ? 'words' : 'word',
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

module.exports = ruleExtender(ImgRedundantAltRule, HasLitHtmlImportRuleExtension);
