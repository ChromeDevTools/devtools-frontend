/**
 * @fileoverview Enforce img alt attribute does not contain the word image, picture, or photo.
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/img-redundant-alt');

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

ruleTester.run('img-redundant-alt', rule, {
  valid: [
    { code: 'html`<img src="foo" alt="Foo eating a sandwich." />`' },
    { code: 'html`<img src="bar" aria-hidden alt="Picture of me taking a photo of an image" /> `' },
    { code: 'html`<img src="baz" alt=${`Baz taking a ${photo}`} />`' },
    { code: 'html`<img src="baz" alt=${"foo"} />`' },
  ],

  invalid: [
    {
      code: "html`<img src='foo' alt='Photo of foo being weird.' />`",
      errors: [{ messageId: 'imgRedundantAlt', data: { banned: 'photo', plural: 'word' } }],
    },
    {
      code: "html`<img src='foo' alt='Image of me at a bar!' />`",
      errors: [{ messageId: 'imgRedundantAlt', data: { banned: 'image', plural: 'word' } }],
    },
    {
      code: "html`<img src='foo' alt='Picture of baz fixing a bug.' />`",
      errors: [{ messageId: 'imgRedundantAlt', data: { banned: 'picture', plural: 'word' } }],
    },
    {
      code: "html`<img src='foo' alt='baz foo bar.' />`",
      options: [{ keywords: ['foo'] }],
      errors: [{ messageId: 'imgRedundantAlt', data: { banned: 'foo', plural: 'word' } }],
    },
    {
      code: "html`<img src='foo' alt='image of baz foo bar.' />`",
      options: [{ keywords: ['foo'] }],
      errors: [{ messageId: 'imgRedundantAlt', data: { banned: 'image or foo', plural: 'words' } }],
    },
    {
      code: "html`<img src='foo' alt='image of picture baz foo bar.' />`",
      options: [{ keywords: ['foo'] }],
      errors: [
        {
          messageId: 'imgRedundantAlt',
          data: { banned: 'image, picture, or foo', plural: 'words' },
        },
      ],
    },
    {
      code: 'html`<img src="baz" alt=${"photo of dog"} />`',
      errors: [
        {
          messageId: 'imgRedundantAlt',
          data: { banned: 'photo', plural: 'word' },
        },
      ],
    },
  ],
});
