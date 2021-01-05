/**
 * @fileoverview Enforce heading (h1, h2, etc) elements contain accessible content.
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/heading-has-content');

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

ruleTester.run('heading-has-content', rule, {
  valid: [
    { code: 'html`<h1>hello</h1>`' },
    { code: 'html`<h2>hello</h2>`' },
    { code: 'html`<h3>hello</h3>`' },
    { code: 'html`<h4>hello</h4>`' },
    { code: 'html`<h5>hello</h5>`' },
    { code: 'html`<h6>hello</h6>`' },
    { code: 'html`<h6>${"foo"}</h6>`' },
    { code: 'html`<h1>${foo}</h1>`' },
    { code: 'html`<h2>${foo}</h2>`' },
    { code: 'html`<h3>${foo}</h3>`' },
    { code: 'html`<h4>${foo}</h4>`' },
    { code: 'html`<h5>${foo}</h5>`' },
    { code: 'html`<h6>${foo}</h6>`' },
    { code: "html`<h1><div aria-hidden='true'>foo</div> foo</h1>`" },
    { code: 'html`<h1>${foo()}</h1>`' },
    { code: 'html`<h1>${foo("hello")}</h1>`' },
    { code: 'html`<h1>${foo(1)}</h1>`' },
    { code: 'html`<h1>${foo(true)}</h1>`' },
    { code: 'html`<h1>${foo(bar)}</h1>`' },
    { code: 'html`<h1>${foo(bar, "hello", 1, true)}</h1>`' },
    { code: 'html`<h1>${this.foo()}</h1>`' },
    {
      code: 'html`<custom-heading level="1">${this.foo()}</custom-heading>`',
      options: [
        {
          customHeadingElements: 'custom-heading',
        },
      ],
    },
  ],

  invalid: [
    {
      code: "html`<h1><div aria-hidden='true'>foo</div></h1>`",
      errors: [{ messageId: 'headingHasContent', data: { tagName: 'h1' } }],
    },
    {
      code: 'html`<h1></h1>`',
      errors: [{ messageId: 'headingHasContent', data: { tagName: 'h1' } }],
    },
    {
      code: 'html`<h2></h2>`',
      errors: [{ messageId: 'headingHasContent', data: { tagName: 'h2' } }],
    },
    {
      code: 'html`<h3></h3>`',
      errors: [{ messageId: 'headingHasContent', data: { tagName: 'h3' } }],
    },
    {
      code: 'html`<h4></h4>`',
      errors: [{ messageId: 'headingHasContent', data: { tagName: 'h4' } }],
    },
    {
      code: 'html`<h5></h5>`',
      errors: [{ messageId: 'headingHasContent', data: { tagName: 'h5' } }],
    },
    {
      code: 'html`<h6></h6>`',
      errors: [{ messageId: 'headingHasContent', data: { tagName: 'h6' } }],
    },
    {
      code: 'html`<custom-heading level="1"></custom-heading>`',
      errors: [{ messageId: 'headingHasContent', data: { tagName: 'custom-heading' } }],
      options: [
        {
          customHeadingElements: 'custom-heading',
        },
      ],
    },
  ],
});
