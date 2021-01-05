/**
 * @fileoverview &lt;iframe&gt; elements must have a unique title property.
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/iframe-title');

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

ruleTester.run('iframe-title', rule, {
  valid: [
    { code: 'html`<div></div>;`' },
    { code: 'html`<iframe title="Unique title"></iframe>`' },
    { code: 'html`<iframe title=${foo} ></iframe>`' },
    // give me some code that won't trigger a warning
  ],

  invalid: [
    {
      code: 'html`<iframe></iframe>`',
      errors: [{ messageId: 'iframeTitle' }],
    },
    {
      code: "html`<iframe title=''></iframe>`",
      errors: [{ messageId: 'iframeTitle' }],
    },
  ],
});
