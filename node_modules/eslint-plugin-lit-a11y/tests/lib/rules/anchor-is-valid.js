/**
 * @fileoverview anchor-is-valid
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/anchor-is-valid.js');

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

ruleTester.run('anchor-is-valid', rule, {
  valid: [
    { code: 'html`<a href="foo"></a>`' },
    { code: 'html`<a href=${foo}></a>`' },
    { code: 'html`<a href="/foo"></a>`' },
    { code: 'html`<a href="https://foo.bar.com"></a>`' },
    { code: 'html`<div href="foo"></div>`' },
    { code: 'html`<a href="javascript"></a>`' },
    { code: 'html`<a href="javascriptFoo"></a>`' },
    { code: 'html`<a href="#"></a>`' },
    { code: 'html`<a href="#foo"></a>`' },
    { code: 'html`<a href="#javascript"></a>`' },
    { code: 'html`<a href="#javascriptFoo"></a>`' },

    { code: 'html`<a href="foo" @click=${foo}></a>`' },
    { code: 'html`<a href=${foo} @click=${foo}></a>`' },
    { code: 'html`<a href="/foo" @click=${foo}></a>`' },
    { code: 'html`<a href="https://foo.bar.com" @click=${foo}></a>`' },
    { code: 'html`<div href="foo" @click=${foo}></div>`' },
    { code: 'html`<a href=${`#foo`} @click=${foo}></a>`' },
    { code: 'html`<a href="#foo" @click=${foo}></a>`' },

    { code: 'html`<a href=""></a>;`', options: [{ aspects: ['preferButton'] }] },
    { code: 'html`<a href="#"></a>`', options: [{ aspects: ['invalidHref'] }] },
    { code: 'html`<a href="${\'#\'}"></a>`', options: [{ aspects: ['invalidHref'] }] },
    { code: 'html`<a href="#"></a>`', options: [{ aspects: ['preferButton'] }] },
    { code: "html`<a href=${'#'}></a>`", options: [{ aspects: ['preferButton'] }] },
    { code: 'html`<a href="javascript:void(0)"></a>`', options: [{ aspects: ['preferButton'] }] },
    {
      code: 'html`<a href=${"javascript:void(0)"}></a>`',
      options: [{ aspects: ['preferButton'] }],
    },
    { code: 'html`<a href=""></a>;`', options: [{ aspects: ['noHref'] }] },
    { code: 'html`<a href="#"></a>`', options: [{ aspects: ['noHref'] }] },
    { code: "html`<a href=${'#'}></a>`", options: [{ aspects: ['noHref'] }] },
    { code: 'html`<a href="javascript:void(0)"></a>`', options: [{ aspects: ['noHref'] }] },
    { code: 'html`<a href=${"javascript:void(0)"}></a>`', options: [{ aspects: ['noHref'] }] },
    { code: 'html`<a href=""></a>;`', options: [{ aspects: ['noHref', 'preferButton'] }] },
    { code: 'html`<a href="#"></a>`', options: [{ aspects: ['noHref', 'preferButton'] }] },
    { code: "html`<a href=${'#'}></a>`", options: [{ aspects: ['noHref', 'preferButton'] }] },
    {
      code: 'html`<a href="javascript:void(0)"></a>`',
      options: [{ aspects: ['noHref', 'preferButton'] }],
    },
    {
      code: 'html`<a href=${"javascript:void(0)"}></a>`',
      options: [{ aspects: ['noHref', 'preferButton'] }],
    },

    { code: 'html`<a @click=${foo}></a>`', options: [{ aspects: ['invalidHref'] }] },
    { code: 'html`<a href="#" @click=${foo}></a>`', options: [{ aspects: ['invalidHref'] }] },
    {
      code: 'html`<a href="${\'#\'}" @click=${foo}></a>`',
      options: [{ aspects: ['invalidHref'] }],
    },
    { code: 'html`<a href="#" @click=${foo}></a>`', options: [{ aspects: ['noHref'] }] },
    {
      code: 'html`<a href="javascript:void(0)" @click=${foo}></a>`',
      options: [{ aspects: ['noHref'] }],
    },
    {
      code: 'html`<a href=${"javascript:void(0)"} @click=${foo}></a>`',
      options: [{ aspects: ['noHref'] }],
    },
  ],

  invalid: [
    { code: 'html`<a></a>`', errors: [{ messageId: 'noHrefErrorMessage' }] },
    // INVALID HREF
    { code: 'html`<a href=""></a>;`', errors: [{ messageId: 'invalidHrefErrorMessage' }] },
    {
      code: 'html`<a href="#"></a>`',
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
      options: [{ allowHash: false }],
    },
    {
      code: 'html`<a href="javascript:void(0)"></a>`',
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    // SHOULD BE BUTTON
    { code: 'html`<a @click=${foo}></a>`', errors: [{ messageId: 'preferButtonErrorMessage' }] },
    {
      code: 'html`<a href="#" @click=${foo}></a>`',
      errors: [{ messageId: 'preferButtonErrorMessage' }],
      options: [{ allowHash: false }],
    },
    {
      code: 'html`<a href="javascript:void(0)" @click=${foo}></a>`',
      errors: [{ messageId: 'preferButtonErrorMessage' }],
    },

    // WITH ASPECTS TESTS
    // NO HREF
    {
      code: 'html`<a></a>`',
      options: [{ aspects: ['noHref'] }],
      errors: [{ messageId: 'noHrefErrorMessage' }],
    },
    {
      code: 'html`<a></a>`',
      options: [{ aspects: ['noHref', 'preferButton'] }],
      errors: [{ messageId: 'noHrefErrorMessage' }],
    },
    {
      code: 'html`<a></a>`',
      options: [{ aspects: ['noHref', 'invalidHref'] }],
      errors: [{ messageId: 'noHrefErrorMessage' }],
    },

    // INVALID HREF
    {
      code: 'html`<a href=""></a>;`',
      options: [{ aspects: ['invalidHref'] }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href=""></a>;`',
      options: [{ aspects: ['noHref', 'invalidHref'] }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href=""></a>;`',
      options: [{ aspects: ['preferButton', 'invalidHref'] }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="#"></a>;`',
      options: [{ aspects: ['invalidHref'], allowHash: false }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="${\'#\'}">inf</a>;`',
      options: [{ aspects: ['invalidHref'], allowHash: false }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="#"></a>;`',
      options: [{ aspects: ['noHref', 'invalidHref'], allowHash: false }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="${\'#\'}"></a>;`',
      options: [{ aspects: ['noHref', 'invalidHref'], allowHash: false }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="#"></a>;`',
      options: [{ aspects: ['preferButton', 'invalidHref'], allowHash: false }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="${\'#\'}"></a>;`',
      options: [{ aspects: ['preferButton', 'invalidHref'], allowHash: false }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="javascript:void(0)"></a>;`',
      options: [{ aspects: ['invalidHref'] }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="javascript:void(0)"></a>;`',
      options: [{ aspects: ['noHref', 'invalidHref'] }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="javascript:void(0)"></a>;`',
      options: [{ aspects: ['preferButton', 'invalidHref'] }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },

    // SHOULD BE BUTTON
    {
      code: 'html`<a @click=${foo}></a>`',
      options: [{ aspects: ['preferButton'] }],
      errors: [{ messageId: 'preferButtonErrorMessage' }],
    },
    {
      code: 'html`<a @click=${foo}></a>`',
      options: [{ aspects: ['preferButton', 'invalidHref'] }],
      errors: [{ messageId: 'preferButtonErrorMessage' }],
    },
    {
      code: 'html`<a @click=${foo}></a>`',
      options: [{ aspects: ['noHref', 'preferButton'] }],
      errors: [{ messageId: 'preferButtonErrorMessage' }],
    },
    {
      code: 'html`<a @click=${foo}></a>`',
      options: [{ aspects: ['noHref'] }],
      errors: [{ messageId: 'noHrefErrorMessage' }],
    },
    {
      code: 'html`<a @click=${foo}></a>`',
      options: [{ aspects: ['noHref', 'invalidHref'] }],
      errors: [{ messageId: 'noHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="#" @click=${foo}></a>`',
      options: [{ aspects: ['preferButton'], allowHash: false }],
      errors: [{ messageId: 'preferButtonErrorMessage' }],
    },
    {
      code: 'html`<a href="#" @click=${foo}></a>`',
      options: [{ aspects: ['noHref', 'preferButton'], allowHash: false }],
      errors: [{ messageId: 'preferButtonErrorMessage' }],
    },
    {
      code: 'html`<a href="#" @click=${foo}></a>`',
      options: [{ aspects: ['preferButton', 'invalidHref'], allowHash: false }],
      errors: [{ messageId: 'preferButtonErrorMessage' }],
    },
    {
      code: 'html`<a href="#" @click=${foo}></a>`',
      options: [{ aspects: ['invalidHref'], allowHash: false }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="#" @click=${foo}></a>`',
      options: [{ aspects: ['noHref', 'invalidHref'], allowHash: false }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="javascript:void(0)" @click=${foo}></a>`',
      options: [{ aspects: ['preferButton'] }],
      errors: [{ messageId: 'preferButtonErrorMessage' }],
    },
    {
      code: 'html`<a href="javascript:void(0)" @click=${foo}></a>`',
      options: [{ aspects: ['noHref', 'preferButton'] }],
      errors: [{ messageId: 'preferButtonErrorMessage' }],
    },
    {
      code: 'html`<a href="javascript:void(0)" @click=${foo}></a>`',
      options: [{ aspects: ['preferButton', 'invalidHref'] }],
      errors: [{ messageId: 'preferButtonErrorMessage' }],
    },
    {
      code: 'html`<a href="javascript:void(0)" @click=${foo}></a>`',
      options: [{ aspects: ['invalidHref'] }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
    {
      code: 'html`<a href="javascript:void(0)" @click=${foo}></a>`',
      options: [{ aspects: ['noHref', 'invalidHref'] }],
      errors: [{ messageId: 'invalidHrefErrorMessage' }],
    },
  ],
});
