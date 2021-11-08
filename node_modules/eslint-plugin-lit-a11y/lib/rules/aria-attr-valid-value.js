/**
 * @fileoverview aria-attr-valid-value
 * @author open-wc
 */
const ruleExtender = require('eslint-rule-extender');
const { aria } = require('aria-query');
const { TemplateAnalyzer } = require('eslint-plugin-lit/lib/template-analyzer.js');
const { getElementAriaAttributes } = require('../utils/aria.js');
const { isHtmlTaggedTemplate } = require('../utils/isLitHtmlTemplate.js');
const { HasLitHtmlImportRuleExtension } = require('../utils/HasLitHtmlImportRuleExtension.js');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/**
 * Format the error message
 * @param {string} name
 * @param {string} type
 * @param {(string|number|boolean)[]} permittedValues
 */
const errorMessage = (name, type, permittedValues) => {
  switch (type) {
    case 'tristate':
      return `The value for ${name} must be a boolean or the string "mixed".`;
    case 'token':
      return `The value for ${name} must be a single token from the following: ${permittedValues}.`;
    case 'tokenlist':
      return `The value for ${name} must be a list of one or more \
tokens from the following: ${permittedValues}.`;
    case 'idlist':
      return `The value for ${name} must be a list of strings that represent DOM element IDs (idlist)`;
    case 'id':
      return `The value for ${name} must be a string that represents a DOM element ID`;
    case 'boolean':
    case 'string':
    case 'integer':
    case 'number':
    default:
      return `The value for ${name} must be a ${type}.`;
  }
};

/**
 * @param {string} value
 */
const extractTypeFromLiteral = value => {
  const normalizedStringValue = typeof value === 'string' && value.toLowerCase();
  if (normalizedStringValue === 'true' || normalizedStringValue === '') {
    return true;
  }

  if (normalizedStringValue === 'false') {
    return false;
  }

  return value;
};

/**
 * aria-hidden, boolean, []
 * @param {*} value
 * @param {'boolean'|'string'|'id'|'tristate'|'integer'|'number'|'token'|'idlist'|'tokenlist'} expectedType
 * @param {any[]} permittedValues
 * @return {boolean}
 */
const validityCheck = (value, expectedType, permittedValues) => {
  switch (expectedType) {
    case 'boolean':
      return typeof value === 'boolean';
    case 'string':
    case 'id':
      return typeof value === 'string';
    case 'tristate':
      return typeof value === 'boolean' || value === 'mixed';
    case 'integer':
    case 'number':
      // Booleans resolve to 0/1 values so hard check that it's not first.
      return typeof value !== 'boolean' && Number.isNaN(Number(value)) === false;
    case 'token':
      return permittedValues.indexOf(typeof value === 'string' ? value.toLowerCase() : value) > -1;
    case 'idlist':
      return (
        typeof value === 'string' && value.split(' ').every(token => validityCheck(token, 'id', []))
      );
    case 'tokenlist':
      return (
        typeof value === 'string' &&
        value.split(' ').every(token => permittedValues.indexOf(token.toLowerCase()) > -1)
      );
    default:
      return false;
  }
};

/** @type {import("eslint").Rule.RuleModule} */
const AriaAttrTypesRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'aria-attr-valid-value',
      category: 'Accessibility',
      recommended: false,
      url:
        'https://github.com/open-wc/open-wc/blob/master/packages/eslint-plugin-lit-a11y/docs/rules/aria-attr-valid-value.md',
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
              const ariaAttributes = getElementAriaAttributes(element);

              if (ariaAttributes.length > 0) {
                ariaAttributes.forEach(attr => {
                  const val = element.attribs[attr];

                  // Ignore the attribute if its value is null or undefined.
                  if (val == null) return;
                  if (val.startsWith('{{')) return;

                  // These are the attributes of the property/state to check against.
                  // @ts-expect-error: see https://github.com/A11yance/aria-query/pull/74
                  const { allowundefined = false, type, values } = aria.get(attr);

                  const permittedValues = values || [];

                  const isValid =
                    validityCheck(extractTypeFromLiteral(val), type, permittedValues) ||
                    (allowundefined && val === undefined);

                  if (isValid) {
                    return;
                  }

                  const loc =
                    analyzer.getLocationForAttribute(element, attr, context.getSourceCode()) ??
                    node.loc;

                  if (loc) {
                    context.report({
                      loc,
                      message: errorMessage(attr, type, permittedValues),
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

module.exports = ruleExtender(AriaAttrTypesRule, HasLitHtmlImportRuleExtension);
