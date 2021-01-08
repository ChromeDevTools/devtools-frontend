// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/lit_html_data_as_type.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('lit_html_data_as_type', rule, {
  valid: [
    {
      code: 'LitHtml.html`<devtools-foo .data=${{name: "jack"} as FooData}>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'html`<devtools-foo .data=${{name: "jack"} as FooData}>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'html`<p><span></span><devtools-foo .data=${{name: "jack"} as FooData}></devtools-foo></p>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'notLitHtmlCall`<devtools-blah .data=${"FOO"}></devtools-blah>`',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'Foo.blah`<devtools-blah .data=${"FOO"}></devtools-blah>`',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: 'LitHtml.html`<devtools-foo .data=${{name: "jack"}}>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: 'LitHtml .data=${} calls must be typecast (.data=${{...} as X}).'}]
    },
    {
      code: 'LitHtml.html`<devtools-foo .data=${{name: "jack"} as FooData} .data=${{name: "jack"}}>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: 'LitHtml .data=${} calls must be typecast (.data=${{...} as X}).'}]
    },
    {
      code: 'LitHtml.html`<devtools-foo .data=${{name: "jack"}} .data=${{name: "jack"}}>`',
      filename: 'front_end/components/test.ts',
      errors: [
        {message: 'LitHtml .data=${} calls must be typecast (.data=${{...} as X}).'},
        {message: 'LitHtml .data=${} calls must be typecast (.data=${{...} as X}).'}
      ]
    },
    {
      code: 'html`<p><span></span><devtools-foo .data=${{name: "jack"}}></devtools-foo></p>`',
      filename: 'front_end/components/test.ts',
      errors: [{message: 'LitHtml .data=${} calls must be typecast (.data=${{...} as X}).'}]
    },
    {
      code: 'LitHtml.html`<devtools-foo .data=${{name: "jack"} as {name: string}}>`',
      filename: 'front_end/components/test.ts',
      errors: [{
        message: 'LitHtml .data=${} calls must be typecast to a type reference (e.g. `as FooInterface`), not a literal.'
      }]
    },
    {
      code: 'html`<devtools-foo .data=${{name: "jack"} as {name: string}}>`',
      filename: 'front_end/components/test.ts',
      errors: [{
        message: 'LitHtml .data=${} calls must be typecast to a type reference (e.g. `as FooInterface`), not a literal.'
      }]
    },
    {
      code: 'html`<devtools-foo some-other-attribute-first .data=${{name: "jack"} as {name: string}}>`',
      filename: 'front_end/components/test.ts',
      errors: [{
        message: 'LitHtml .data=${} calls must be typecast to a type reference (e.g. `as FooInterface`), not a literal.'
      }]
    },
  ]
});
