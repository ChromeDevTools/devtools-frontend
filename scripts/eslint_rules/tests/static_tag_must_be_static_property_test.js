// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/static_tag_must_be_static_property.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('static_tag_must_be_static_property', rule, {
  valid: [
    {
      code: `class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`foo-bar\`;
      };

      LitHtml.html\`<\${Foo.litTagName}></\${Foo.litTagName}>\`
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`foo-bar\`;
      };

      LitHtml.html\`<\${Foo.litTagName}><p>\${someValue}</p></\${Foo.litTagName}>\`
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `notLitHtmlCall\`<\${anyThingGoes}><p>\${someValue}</p></\${Foo.litTagName}>\`
      `,
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: `class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`foo-bar\`;
      };

      LitHtml.html\`<\${Foo}></\${Foo}>\`
      `,
      filename: 'front_end/components/test.ts',
      // Two errors: one for opening, one for closing tag
      errors: [
        {messageId: 'invalidStaticProperty', column: 23, line: 5},
        {messageId: 'invalidStaticProperty', column: 32, line: 5}
      ]
    },
    {
      code: `class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`foo-bar\`;
      };

      LitHtml.html\`<\${Foo.litTagName}></\${Foo}>\`
      `,
      filename: 'front_end/components/test.ts',
      // One error: the closing tag is invalid.
      errors: [{messageId: 'invalidStaticProperty', column: 43, line: 5}]
    },
    {
      code: `class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`foo-bar\`;
      };

      LitHtml.html\`<\${Foo.invalidTagName}></\${Foo.otherInvalidName}>\`
      `,
      filename: 'front_end/components/test.ts',
      // Two errors: both use the wrong static property
      errors: [
        {messageId: 'invalidStaticProperty', column: 23, line: 5},
        {messageId: 'invalidStaticProperty', column: 47, line: 5}
      ]
    },
    {
      code: `class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`foo-bar\`;
      };

      LitHtml.html\`<\${foo.litTagName}></\${litTagName}>\`
      `,
      filename: 'front_end/components/test.ts',
      // Two errors: first uses lowercase "foo", second accesses the static directly, not via the class.
      errors: [
        {messageId: 'invalidStaticProperty', column: 23, line: 5},
        {messageId: 'invalidStaticProperty', column: 43, line: 5}
      ]
    },
  ]
});
