// @ts-nocheck
/**
 * @fileoverview Ensure autocomplete attribute is correct.
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/autocomplete-valid');

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

ruleTester.run('autocomplete-valid', rule, {
  valid: [
    { code: 'html`<input type="text" autocomplete="name" />`;' },
    { code: 'html`<input type="text" autocomplete="" />`;' },
    { code: 'html`<input type="text" autocomplete="off" />`;' },
    { code: 'html`<input type="text" autocomplete="on" />`;' },
    { code: 'html`<input type="text" autocomplete="billing family-name" />;`' },
    { code: 'html`<input type="text" autocomplete="section-blue shipping street-address" />;`' },
    { code: 'html`<input type="text" autocomplete="section-somewhere shipping work email" />;`' },
    { code: 'html`<input type="text" autocomplete />;`' },
    { code: 'html`<input type="text" autocomplete=${autocompl} />;`' },
    { code: 'html`<input type="text" autocomplete="${autocompl || \'name\'}" />;`' },
    { code: 'html`<input type="text" autocomplete="${autocompl || \'foo\'}" />;`' },
  ],

  invalid: [
    {
      code: 'html`<input type="text" autocomplete="foo" />`;',
      errors: [
        {
          message: 'the autocomplete attribute is incorrectly formatted',
        },
      ],
    },
    {
      code: 'html`<input type="text" autocomplete="name invalid" />`;',
      errors: [
        {
          message: 'the autocomplete attribute is incorrectly formatted',
        },
      ],
    },
    {
      code: 'html`<input type="text" autocomplete="invalid name" />`;',
      errors: [
        {
          message: 'the autocomplete attribute is incorrectly formatted',
        },
      ],
    },
    {
      code: 'html`<input type="text" autocomplete="home url" />`;',
      errors: [
        {
          message: 'the autocomplete attribute is incorrectly formatted',
        },
      ],
    },
    {
      code: 'html`<input type="date" autocomplete="email" />;`',
      errors: [
        {
          message: 'the autocomplete value is inappropriate for this type of input',
        },
      ],
    },
    {
      code: 'html`<input type="number" autocomplete="url" />;`',
      errors: [
        {
          message: 'the autocomplete value is inappropriate for this type of input',
        },
      ],
    },
    {
      code: 'html`<input type="month" autocomplete="tel" />;`',
      errors: [
        {
          message: 'the autocomplete value is inappropriate for this type of input',
        },
      ],
    },
  ],
});
