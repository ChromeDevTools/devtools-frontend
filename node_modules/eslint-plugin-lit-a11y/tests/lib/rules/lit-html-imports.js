/**
 * @fileoverview Images require alt text
 * @author open-wc
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const { RuleTester } = require('eslint');
const rule = require('../../../lib/rules/alt-text');

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const errors = [{ messageId: 'imgAttrs' }];

const defaultLitHtmlSourcesRuleTester = new RuleTester({
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2015,
  },
});

defaultLitHtmlSourcesRuleTester.run('lit-html-imports-default-config', rule, {
  valid: [
    /**
     * If a user doesn't specify a `litHtmlSources` option in the settings,
     * we want to lint any tagged template literal that starts with `html`
     *
     * In this case, the following cases are valid because `Lit.html`,
     * `h`, and `foo` are not linted
     */
    {
      code: `
        Lit.html\`<img />\``,
    },
    {
      code: `
        foo\`<img />\``,
    },
    {
      code: `
        h\`<img />\``,
    },
    // CASE: This does pass because `html` IS checked, and the img has alt
    {
      code: `
        html\`<img alt='' />\``,
    },

    // CASE: importing named, aliased, and namespaced from bare lit-html specifier
    {
      code: `
        import {html} from 'lit-html';
        html\`<img alt=''/>\``,
    },
    {
      code: `
        import {html as h} from 'lit-html';
        h\`<img alt=''/>\``,
    },
    {
      code: `
        import * as Lit from 'lit-html';
        Lit.html\`<img alt=''/>\``,
    },

    // CASE: importing named, aliased, and namespaced from qualified lit-html specifier
    {
      code: `
        import {html} from 'lit-html/lit-html.js';
        html\`<img alt=''/>\``,
    },
    {
      code: `
        import {html as h} from 'lit-html/lit-html.js';
        h\`<img alt=''/>\``,
    },
    {
      code: `
        import * as Lit from 'lit-html/lit-html.js';
        Lit.html\`<img alt=''/>\``,
    },

    // CASE: importing named, aliased, and namespaced from bare lit-element specifier
    {
      code: `
        import {html} from 'lit-element';
        html\`<img alt=''/>\``,
    },
    {
      code: `
        import {html as h} from 'lit-element';
        h\`<img alt=''/>\``,
    },
    {
      code: `
        import * as Lit from 'lit-element';
        Lit.html\`<img alt=''/>\``,
    },

    // invalid if it was lit-html, but passes because default export html is not a valid lithtmlsource
    {
      code: `
        import html from 'lit-html';
        html\`<img alt=''/>\``,
    },

    // invalid if it was lit-html, but `html` is not imported
    {
      code: `
        import {html as h} from 'lit-html';
        html\`<img alt=''/>\``,
    },

    // invalid if it was lit-html, but `html` is not imported
    {
      code: `
        import {html as h} from 'lit-element';
        html\`<img alt=''/>\``,
    },

    // invalid if it was lit-html, but no error because default export html is not a valid lithtmlsource
    {
      code: `
        import html from 'foo';
        html\`<img alt=''/>\``,
    },

    // invalid if it was lit-html, but `html` is not imported
    {
      code: `
        import {html as h} from 'foo';
        h\`<img alt=''/>\``,
    },

    {
      code: `
        import bar from 'lit-html';
        import {html} from 'lit-html';
        import * as foo from 'bar';
        import {baz} from 'baz';
        html\`<img alt=''/>\`
      `,
    },
  ],

  invalid: [
    {
      errors,
      code: `
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html} from 'foo';
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html as h} from 'lit-html';
        h\`<img/>\``,
    },
    {
      errors,
      code: `
        import * as Lit from 'lit-html';
        Lit.html\`<img/>\``,
    },

    {
      errors,
      code: `
        import {html} from 'lit-html/lit-html.js';
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html as h} from 'lit-html/lit-html.js';
        h\`<img/>\``,
    },
    {
      errors,
      code: `
        import * as Lit from 'lit-html/lit-html.js';
        Lit.html\`<img/>\``,
    },

    {
      errors,
      code: `
        import {html} from 'lit-element';
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html as h} from 'lit-element';
        h\`<img/>\``,
    },
    {
      errors,
      code: `
        import * as Lit from 'lit-element';
        Lit.html\`<img/>\``,
    },
  ],
});

const userLitHtmlSourcesRuleTester = new RuleTester({
  settings: { litHtmlSources: ['foo', '@bar/baz'] },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2015,
  },
});

userLitHtmlSourcesRuleTester.run('lit-html-imports-specific-packages-config', rule, {
  valid: [
    // CASE: importing named, aliased, and namespaced from bare lit-html specifier
    {
      code: `
        import {html} from 'lit-html';
        html\`<img alt=''/>\``,
    },
    {
      code: `
        import {html as h} from 'lit-html';
        h\`<img alt=''/>\``,
    },
    {
      code: `
        import * as Lit from 'lit-html';
        Lit.html\`<img alt=''/>\``,
    },

    // CASE: importing named, aliased, and namespaced from qualified lit-html specifier
    {
      code: `
        import {html} from 'lit-html/lit-html.js';
        html\`<img alt=''/>\``,
    },
    {
      code: `
        import {html as h} from 'lit-html/lit-html.js';
        h\`<img alt=''/>\``,
    },
    {
      code: `
        import * as Lit from 'lit-html/lit-html.js';
        Lit.html\`<img alt=''/>\``,
    },

    // CASE: importing named, aliased, and namespaced from bare user specifier
    {
      code: `
        import {html} from 'foo';
        html\`<img alt=''/>\``,
    },
    {
      code: `
        import {html as h} from 'foo';
        h\`<img alt=''/>\``,
    },
    {
      code: `
        import * as Lit from 'foo';
        Lit.html\`<img alt=''/>\``,
    },

    // CASE: importing named, aliased, and namespaced from qualified user specifier
    {
      code: `
        import {html} from 'foo/foo.js';
        html\`<img alt=''/>\``,
    },
    {
      code: `
        import {html as h} from 'foo/foo.js';
        h\`<img alt=''/>\``,
    },
    {
      code: `
        import * as Lit from 'foo/foo.js';
        Lit.html\`<img alt=''/>\``,
    },

    // CASE: importing named, aliased, and namespaced from bare user specifier
    {
      code: `
        import {html} from '@bar/baz';
        html\`<img alt=''/>\``,
    },
    {
      code: `
        import {html as h} from '@bar/baz';
        h\`<img alt=''/>\``,
    },
    {
      code: `
        import * as Lit from '@bar/baz';
        Lit.html\`<img alt=''/>\``,
    },

    // CASE: importing named, aliased, and namespaced from qualified user specifier
    {
      code: `
        import {html} from '@bar/baz/foo.js';
        html\`<img alt=''/>\``,
    },
    {
      code: `
        import {html as h} from '@bar/baz/foo.js';
        h\`<img alt=''/>\``,
    },
    {
      code: `
        import * as Lit from '@bar/baz/foo.js';
        Lit.html\`<img alt=''/>\``,
    },

    // invalid if it was lit-html, but no error because `bar` is not a valid lithtmlsource
    {
      code: `
        import {html} from 'bar';
        html\`<img alt=''/>\``,
    },

    // invalid, but no error because default export html is not a valid lithtmlsource
    {
      code: `
        import html from 'foo';
        html\`<img/>\``,
    },

    // invalid if it was lit-html, but `html` is not imported
    {
      code: `
        import {html as h} from 'lit-html';
        html\`<img/>\``,
    },

    // invalid if it was lit-html, but `html` is not imported
    {
      code: `
        import {html as h} from 'lit-element';
        html\`<img/>\``,
    },

    {
      code: `
        import bar from 'lit-html';
        import {html} from 'lit-html';
        import * as foo from 'bar';
        import {baz} from 'baz';
        html\`<img alt=''/>\``,
    },
  ],
  invalid: [
    {
      errors,
      code: `
        import {html} from 'lit-html';
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html as h} from 'lit-html';
        h\`<img/>\``,
    },
    {
      errors,
      code: `
        import * as Lit from 'lit-html';
        Lit.html\`<img/>\``,
    },

    {
      errors,
      code: `
        import {html} from 'lit-html/lit-html.js';
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html as h} from 'lit-html/lit-html.js';
        h\`<img/>\``,
    },
    {
      errors,
      code: `
        import * as Lit from 'lit-html/lit-html.js';
        Lit.html\`<img/>\``,
    },

    {
      errors,
      code: `
        import {html} from 'lit-element';
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html as h} from 'lit-element';
        h\`<img/>\``,
    },
    {
      errors,
      code: `
        import * as Lit from 'lit-element';
        Lit.html\`<img/>\``,
    },

    {
      errors,
      code: `
        import {html} from 'foo';
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html as h} from 'foo';
        h\`<img/>\``,
    },
    {
      errors,
      code: `
        import * as Lit from 'foo';
        Lit.html\`<img/>\``,
    },

    {
      errors,
      code: `
        import {html} from 'foo/foo.js';
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html as h} from 'foo/foo.js';
        h\`<img/>\``,
    },
    {
      errors,
      code: `
        import * as Lit from 'foo/foo.js';
        Lit.html\`<img/>\``,
    },

    {
      errors,
      code: `
        import {html} from '@bar/baz';
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html as h} from '@bar/baz';
        h\`<img/>\``,
    },
    {
      errors,
      code: `
        import * as Lit from '@bar/baz';
        Lit.html\`<img/>\``,
    },

    {
      errors,
      code: `
        import {html} from '@bar/baz/foo.js';
        html\`<img/>\``,
    },
    {
      errors,
      code: `
        import {html as h} from '@bar/baz/foo.js';
        h\`<img/>\``,
    },
    {
      errors,
      code: `
        import * as Lit from '@bar/baz/foo.js';
        Lit.html\`<img/>\``,
    },
  ],
});

const litHtmlSourcesTrue = new RuleTester({
  settings: { litHtmlSources: true },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2015,
  },
});

litHtmlSourcesTrue.run('lit-html-imports-lit-sources-true-config', rule, {
  valid: [
    // CASE: importing named, aliased, and namespaced from bare lit-html specifier
    {
      code: `
        import {html} from 'lit-html';
        html\`<img alt=''/>\``,
    },
    {
      code: `
        import {html as h} from 'lit-html';
        h\`<img alt=''/>\``,
    },
    {
      code: `
        import * as Lit from 'lit-html';
        Lit.html\`<img alt=''/>\``,
    },
    // not reported because foo is not a valid lit-html source
    {
      code: `
        import {html} from 'foo';
        html\`<img/>\``,
    },
    {
      code: `
        import {html} from 'bar';
        html\`<img/>\``,
    },
  ],
  invalid: [],
});
