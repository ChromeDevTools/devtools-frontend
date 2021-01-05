/**
 * @fileoverview click-events-have-key-events
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/click-events-have-key-events');

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

ruleTester.run('click-events-have-key-events', rule, {
  valid: [
    { code: 'html`<div @click=${foo} aria-hidden></div>`' },
    { code: 'html`<div @click=${foo} aria-hidden="true"></div>`' },
    { code: 'html`<div @click=${foo} aria-hidden=${true}></div>`' },
    { code: 'html`<div @click=${foo} aria-hidden=${false} @keydown=${foo}></div>`' },
    { code: 'html`<a @click=${foo} href="http://x.y.z"></a>`' },
    { code: 'html`<a @click=${foo} href="http://x.y.z" tabindex="0"></a>`' },
    { code: 'html`<div @click=${foo} @keydown=${foo}></div>`' },
    { code: 'html`<div @click=${foo} @keyup=${foo}></div>`' },
    { code: 'html`<div @click=${foo} @keypress=${foo}></div>`' },
    { code: 'html`<input @click=${foo} />`' },
    { code: 'html`<div @click=${foo} @keydown=${foo}></div>`' },
    {
      code: 'html`<custom-button @click=${foo}></custom-button>`',
      options: [{ allowList: ['custom-button'] }],
    },
    {
      code: 'html`<another-button @click=${foo}></another-button>`',
      options: [{ allowList: ['another-button'] }],
    },
    {
      code: 'html`<custom-button @click=${foo}></custom-button>`',
      options: [{ allowCustomElements: true }],
    },
    {
      code: 'html`<another-button @click=${foo}></another-button>`',
      options: [{ allowCustomElements: true }],
    },
  ],

  invalid: [
    {
      code: 'html`<div @click=${foo}></div>`',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
    },
    {
      code: 'html`<div @click=${foo}></div>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
    },
    {
      code: 'html`<section @click=${foo}></section>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
    },
    {
      code: 'html`<main @click=${foo}></main>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
    },
    {
      code: 'html`<article @click=${foo}></article>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
    },
    {
      code: 'html`<header @click=${foo}></header>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
    },
    {
      code: 'html`<footer @click=${foo}></footer>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
    },
    {
      code: 'html`<a @click=${foo}></a>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
    },
    {
      code: 'html`<custom-button @click=${foo}></custom-button>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
      options: [{ allowCustomElements: false }],
    },
    {
      code: 'html`<another-button @click=${foo}></another-button>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
      options: [{ allowCustomElements: false }],
    },
    {
      code: 'html`<custom-button @click=${foo}></custom-button>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
      options: [{ allowCustomElements: false, allowList: ['another-button'] }],
    },
    {
      code: 'html`<another-button @click=${foo}></another-button>`;',
      errors: [{ messageId: 'clickableNonInteractiveElements' }],
      options: [{ allowCustomElements: false, allowList: ['custom-button'] }],
    },
  ],
});
