/**
 * @fileoverview Enforce anchor elements to contain accessible content.
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/anchor-has-content');

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

ruleTester.run('anchor-has-content', rule, {
  valid: [
    { code: "html`<a href='#'>foo</a>`" },
    { code: "html`<a href='#'>${'foo'}</a>`" },
    { code: "html`<a href='#'><div>asdf</div></a>`" },
    { code: "html`<a><div aria-hidden='true'>foo</div>foo</a>`" },
    { code: "html`<a><div aria-hidden='true'>foo</div><div>foo</div></a>`" },
  ],

  invalid: [
    {
      code: 'html`<a></a>`',
      errors: [
        {
          message: 'Anchor should contain accessible content.',
        },
      ],
    },
    {
      code: "html`<a><div aria-hidden='true'>foo</div></a>`",
      errors: [
        {
          message: 'Anchor should contain accessible content.',
        },
      ],
    },
  ],
});
