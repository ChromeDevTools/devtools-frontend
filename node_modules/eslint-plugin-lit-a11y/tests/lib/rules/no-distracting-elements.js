/**
 * @fileoverview Enforce distracting elements are not used.
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/no-distracting-elements');

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

ruleTester.run('no-distracting-elements', rule, {
  valid: [{ code: 'html`<div></div>`' }],

  invalid: [
    {
      code: 'html`<marquee></marquee>`',
      errors: [
        {
          message: '<marquee> elements are distracting and must not be used.',
        },
      ],
    },
    {
      code: 'html`<blink></blink>`',
      errors: [
        {
          message: '<blink> elements are distracting and must not be used.',
        },
      ],
    },
  ],
});
