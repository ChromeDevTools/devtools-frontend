/**
 * @fileoverview Enforce that elements with ARIA roles must have all required attributes for that role.
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/role-has-required-aria-attrs');

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = new RuleTester({
  settings: { litHtmlSources: false },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2015,
  },
});

ruleTester.run('role-has-required-aria-attrs', rule, {
  valid: [
    { code: "html`<span role='alert' aria-atomic='foo' aria-live='foo'></span>`" },
    {
      code:
        'html`<span role="checkbox" aria-checked="false" aria-labelledby="foo" tabindex="0"></span>`',
    },
    { code: 'html`<span role="row"></span>`' },
    { code: 'html`<input type="checkbox" role="switch" aria-checked="true" />`' },
    { code: 'html`<div role="combobox" aria-controls="foo"  aria-expanded="foo"></div>`' },
  ],

  invalid: [
    {
      code: "html`<span role='checkbox'></span>`",
      errors: [{ message: 'The "checkbox" role requires the attribute "aria-checked".' }],
    },
    {
      code: "html`<div role='combobox'></div>`",
      errors: [
        {
          message:
            'The "combobox" role requires the attributes "aria-controls" and "aria-expanded".',
        },
      ],
    },
    {
      code: 'html`<div role="slider" ></div>`',
      errors: [{ message: 'The "slider" role requires the attribute "aria-valuenow".' }],
    },
  ],
});
