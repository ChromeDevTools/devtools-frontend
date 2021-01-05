/**
 * @fileoverview aria-attr-valid-value
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const { aria } = require('aria-query');
const rule = require('../../../lib/rules/aria-attr-valid-value');

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

/**
 * @param {string} name
 */
const errorMessage = name => {
  // @ts-expect-error: see https://github.com/A11yance/aria-query/pull/74
  const { type, values: permittedValues } = aria.get(name.toLowerCase());

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

const ruleTester = new RuleTester({
  settings: { litHtmlSources: false },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2015,
  },
});

ruleTester.run('aria-attr-valid-value', rule, {
  valid: [
    { code: 'html`<div aria-foo="true" />`' },
    { code: 'html`<div abcaria-foo="true" />`' },
    { code: 'html`<div abcaria-foo="${true}" />`' },

    // BOOLEAN
    { code: 'html`<div aria-hidden="true" />`' },
    { code: 'html`<div aria-hidden />`' },

    // STRING
    { code: 'html`<div aria-label="Close" />`' },
    { code: 'html`<div aria-label=${"close"} />`' },

    // tristate
    { code: 'html`<div aria-checked="true" />`' },
    { code: 'html`<div aria-checked="${true}" />`' },
    { code: 'html`<div aria-checked />`' },
    { code: 'html`<div aria-checked="mixed" />`' },

    // int
    { code: 'html`<div aria-level="123" />`' },
    { code: 'html`<div aria-level="${foo}" />`' },

    // number
    { code: 'html`<div aria-valuemax="123" />`' },
    { code: 'html`<div aria-valuemax=${foo} />`' },
    { code: 'html`<div aria-valuemax=${this.foo} />`' },

    // token
    { code: 'html`<div aria-sort="ascending" />`' },
    { code: 'html`<div aria-sort="ASCENDING" />`' },
    { code: 'html`<div aria-sort="descending" />`' },
    { code: 'html`<div aria-sort="none" />`' },
    { code: 'html`<div aria-sort="other" />`' },
    { code: 'html`<div aria-invalid="true" />`' },
    { code: 'html`<div aria-invalid="false" />`' },
    { code: 'html`<div aria-invalid="grammar" />`' },
    { code: 'html`<div aria-invalid="spelling" />`' },

    // TOKENLIST
    { code: 'html`<div aria-relevant="additions" />`' },
    { code: 'html`<div aria-relevant="additions removals" />`' },
    { code: 'html`<div aria-relevant="additions additions" />`' },
    { code: 'html`<div aria-relevant="additions removals text" />`' },
    { code: 'html`<div aria-relevant="additions removals text all" />`' },

    // ID
    { code: 'html`<div aria-activedescendant="ascending" />`' },
    { code: 'html`<div aria-activedescendant="ASCENDING" />`' },
    { code: 'html`<div aria-activedescendant="descending" />`' },
    { code: 'html`<div aria-activedescendant="none" />`' },
    { code: 'html`<div aria-activedescendant="other" />`' },

    // IDLIST
    { code: 'html`<div aria-labelledby="additions" />`' },
    { code: 'html`<div aria-labelledby="additions removals" />`' },
    { code: 'html`<div aria-labelledby="additions additions" />`' },
    { code: 'html`<div aria-labelledby="additions removals text" />`' },
    { code: 'html`<div aria-labelledby="additions removals text all" />`' },

    // FUNCTION CALL
    { code: 'html`<div aria-label="${foo("foo")}"></div>`' },
    { code: 'html`<div aria-label="${this.foo("foo")}"></div>`' },

    // CONDITIONAL
    { code: 'html`<div aria-disabled="${this.foo ? "true" : "false"}"></div>`' },
  ],

  invalid: [
    // BOOLEAN
    { code: 'html`<div aria-hidden="yes" />`', errors: [errorMessage('aria-hidden')] },
    { code: 'html`<div aria-hidden="no" />`', errors: [errorMessage('aria-hidden')] },
    // STRING
    { code: 'html`<div aria-label />`', errors: [errorMessage('aria-label')] },
    // TRISTATE
    { code: 'html`<div aria-checked="yes" />`', errors: [errorMessage('aria-checked')] },
    { code: 'html`<div aria-checked="no" />`', errors: [errorMessage('aria-checked')] },
    // INTEGER
    { code: 'html`<div aria-level="yes" />`', errors: [errorMessage('aria-level')] },
    { code: 'html`<div aria-level="no" />`', errors: [errorMessage('aria-level')] },
    { code: 'html`<div aria-level />`', errors: [errorMessage('aria-level')] },
    // NUMBER
    { code: 'html`<div aria-valuemax="yes" />`', errors: [errorMessage('aria-valuemax')] },
    { code: 'html`<div aria-valuemax="no" />`', errors: [errorMessage('aria-valuemax')] },
    // TOKEN
    { code: 'html`<div aria-sort="" />`', errors: [errorMessage('aria-sort')] },
    { code: 'html`<div aria-sort="descnding" />`', errors: [errorMessage('aria-sort')] },
    { code: 'html`<div aria-sort />`', errors: [errorMessage('aria-sort')] },
    {
      code: 'html`<div aria-sort="ascending descending" />`',
      errors: [errorMessage('aria-sort')],
    },
    // TOKENLIST
    { code: 'html`<div aria-relevant="" />`', errors: [errorMessage('aria-relevant')] },
    {
      code: 'html`<div aria-relevant="foobar" />`',
      errors: [errorMessage('aria-relevant')],
    },
    { code: 'html`<div aria-relevant />`', errors: [errorMessage('aria-relevant')] },
    {
      code: 'html`<div aria-relevant="additions removalss" />`',
      errors: [errorMessage('aria-relevant')],
    },
    {
      code: 'html`<div aria-relevant="additions removalss " />`',
      errors: [errorMessage('aria-relevant')],
    },
  ],
});
