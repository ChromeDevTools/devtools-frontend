/**
 * @fileoverview Enforce explicit role property is not the same as implicit/default role property on element.
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/no-redundant-role');

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

ruleTester.run('no-redundant-role', rule, {
  valid: [
    { code: 'html`<div></div>`' },
    { code: 'html`<main><h1>foo</h1></main>`' },
    { code: 'html`<button></button>`' },
    { code: 'html`<div role="button"></div>`' },
    { code: 'html`<img role="presentation"/>`' },
  ],

  invalid: [
    {
      code: "html`<button role='button'></button>`",
      errors: [{ message: '"button" role is implicit in <button> element.' }],
    },
    {
      code: "html`<a href='foo' role='link'></a>`",
      errors: [{ message: '"link" role is implicit in <a> element.' }],
    },
    {
      code: "html`<area href='foo' role='link'></area>`",
      errors: [{ message: '"link" role is implicit in <area> element.' }],
    },
    {
      code: "html`<article role='article'></article>`",
      errors: [{ message: '"article" role is implicit in <article> element.' }],
    },
    {
      code: "html`<aside role='complementary'></aside>`",
      errors: [{ message: '"complementary" role is implicit in <aside> element.' }],
    },
    {
      code: "html`<datalist role='listbox'></datalist>`",
      errors: [{ message: '"listbox" role is implicit in <datalist> element.' }],
    },
    {
      code: "html`<details role='group'></details>`",
      errors: [{ message: '"group" role is implicit in <details> element.' }],
    },
    {
      code: "html`<dialog role='dialog'></dialog>`",
      errors: [{ message: '"dialog" role is implicit in <dialog> element.' }],
    },
    {
      code: "html`<dl role='list'></dl>`",
      errors: [{ message: '"list" role is implicit in <dl> element.' }],
    },
    {
      code: "html`<h1 role='heading'></h1>`",
      errors: [{ message: '"heading" role is implicit in <h1> element.' }],
    },
    {
      code: "html`<hr role='separator'></hr>`",
      errors: [{ message: '"separator" role is implicit in <hr> element.' }],
    },
    {
      code: "html`<img alt='foo' role='img'></img>`",
      errors: [{ message: '"img" role is implicit in <img> element.' }],
    },
    {
      code: "html`<img role='img'></img>`",
      errors: [{ message: '"img" role is implicit in <img> element.' }],
    },
  ],
});
