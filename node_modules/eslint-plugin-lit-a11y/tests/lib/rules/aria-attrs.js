/**
 * @fileoverview Elements cannot use an invalid ARIA attribute.
 * @author passle
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/aria-attrs');

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

ruleTester.run('aria-attrs', rule, {
  valid: [
    {
      code: "html`<div aria-labelledby='foo'></div>`",
    },
    // give me some code that won't trigger a warning
  ],

  invalid: [
    {
      code: "html`<div aria-foo=''></div>`",
      errors: [
        {
          message: 'Invalid ARIA attribute "aria-foo".',
        },
      ],
    },
  ],
});
