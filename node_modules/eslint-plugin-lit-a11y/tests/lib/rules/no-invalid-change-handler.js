/**
 * @fileoverview Enforce usage of onBlur over onChange for accessibility.
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/no-invalid-change-handler');

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

ruleTester.run('no-invalid-change-handler', rule, {
  valid: [{ code: 'html`<select @blur=${foo}></select>`' }, { code: 'html`<div></div>`' }],

  invalid: [
    {
      code: 'html`<select @change=${foo}></select>`',
      errors: [
        {
          message:
            '@blur must be used instead of @change on <select>, unless absolutely necessary and it causes no negative consequences for keyboard only or screen reader users.',
        },
      ],
    },
    {
      code: 'html`<option @change=${foo}></option>`',
      errors: [
        {
          message:
            '@blur must be used instead of @change on <option>, unless absolutely necessary and it causes no negative consequences for keyboard only or screen reader users.',
        },
      ],
    },
  ],
});
