/**
 * @fileoverview Enforce that autofocus prop is not used on elements.
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/no-autofocus');

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

ruleTester.run('no-autofocus', rule, {
  valid: [
    { code: 'html`<div></div>`' },
    // give me some code that won't trigger a warning
  ],

  invalid: [
    {
      code: 'html`<div autofocus></div>`',
      errors: [{ messageId: 'noAutofocus', data: { type: 'attribute' } }],
    },
    {
      code: "html`<div autofocus='true'></div>`",
      errors: [{ messageId: 'noAutofocus', data: { type: 'attribute' } }],
    },
    {
      code: "html`<div autofocus='false'></div>`",
      errors: [{ messageId: 'noAutofocus', data: { type: 'attribute' } }],
    },
    {
      code: 'html`<div autofocus=${foo}></div>`',
      errors: [{ messageId: 'noAutofocus', data: { type: 'attribute' } }],
    },

    {
      code: "html`<div .autofocus='true'></div>`",
      errors: [{ messageId: 'noAutofocus', data: { type: 'property' } }],
    },
    {
      code: "html`<div .autofocus='false'></div>`",
      errors: [{ messageId: 'noAutofocus', data: { type: 'property' } }],
    },
    {
      code: 'html`<div .autofocus=${foo}></div>`',
      errors: [{ messageId: 'noAutofocus', data: { type: 'property' } }],
    },
  ],
});
