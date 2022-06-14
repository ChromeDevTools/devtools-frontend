// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const rule = require('../lib/check_component_naming.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('check_component_naming', rule, {
  valid: [
    {
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-foo', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts'
    },
    {
      // Multiple components in one file is valid.
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      export class Bar extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-bar\`
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-bar', Bar);
      ComponentHelpers.CustomElements.defineComponent('devtools-foo', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
          'devtools-bar': Bar
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts'
    },
    {
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      defineComponent('devtools-foo', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts'
    }
  ],
  invalid: [
    // Missing static litTagName
    {
      code: `export class Foo extends HTMLElement {
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-not-foo', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{messageId: 'noStaticTagName'}]
    },
    // static is not a string
    {
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`\${someVar}\`
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-foo', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{
        messageId: 'staticLiteralInvalid'

      }]
    },
    // Static is not readonly
    {
      code: `export class Foo extends HTMLElement {
        static litTagName = LitHtml.literal\`devtools-foo\`;
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-foo', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{
        messageId: 'staticLiteralNotReadonly'

      }]
    },
    // defineComponent call uses wrong name
    {
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-not-foo', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{messageId: 'noDefineCall'}]
    },
    // defineComponent call uses non literal
    {
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      const name = 'devtools-foo';
      ComponentHelpers.CustomElements.defineComponent(name, Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{
        messageId: 'defineCallNonLiteral'

      }]
    },
    // defineComponent call missing
    {
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{
        messageId: 'noDefineCall'

      }]
    },
    // TS interface is incorrect
    {
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-foo', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-not-foo': Foo
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{messageId: 'noTSInterface'}]
    },
    // TS interface is missing
    {
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-foo', Foo);`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{messageId: 'noTSInterface', data: {tagName: 'devtools-foo'}}]
    },
    {
      // Not using LitHtml.literal
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = 'devtools-foo';
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-foo', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{messageId: 'litTagNameNotLiteral'}]
    },
    {
      // Multiple components in one file is valid.
      // But here devtools-foo is fine, but devtools-bar is missing a define call
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      export class Bar extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-bar\`
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-foo', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
          'devtools-bar': Bar
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{messageId: 'noDefineCall', data: {tagName: 'devtools-bar'}}]
    },
    {
      // Multiple components in one file is valid.
      // But here devtools-foo is fine, but devtools-bar has the wrong static tag name
      code: `export class Foo extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      export class Bar extends HTMLElement {
        static readonly litTagName = LitHtml.literal\`devtools-foo\`
      }

      ComponentHelpers.CustomElements.defineComponent('devtools-foo', Foo);
      ComponentHelpers.CustomElements.defineComponent('devtools-bar', Foo);

      declare global {
        interface HTMLElementTagNameMap {
          'devtools-foo': Foo
          'devtools-bar': Bar
        }
      }`,
      filename: 'front_end/ui/components/Foo.ts',
      errors: [{messageId: 'duplicateStaticLitTagName', data: {tagName: 'devtools-foo'}}]
    },
  ]
});
