// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-customized-builtin-elements.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-customized-builtin-elements', rule, {
  valid: [
    {
      code: 'class Foo {}',
    },
    {
      code: 'customElements.define("devtools-foo", DevToolsFoo);',
    },
    {
      code: 'globalThis.customElements.define("devtools-foo", DevToolsFoo);',
    },
    {
      code: 'self.customElements.define("devtools-foo", DevToolsFoo);',
    },
    {
      code: 'window.customElements.define("devtools-foo", DevToolsFoo);',
    },
    {
      code: 'customElements.define("devtools-foo", DevToolsFoo, {});',
    },
    {
      code: 'globalThis.customElements.define("devtools-foo", DevToolsFoo, {});',
    },
    {
      code: 'self.customElements.define("devtools-foo", DevToolsFoo, {});',
    },
    {
      code: 'window.customElements.define("devtools-foo", DevToolsFoo, {});',
    },
    {
      code: 'class Foo extends HTMLElement {}',
    },
    {
      code: 'class Foo extends globalThis.HTMLElement {}',
    },
    {
      code: 'class Foo extends self.HTMLElement {}',
    },
    {
      code: 'class Foo extends window.HTMLElement {}',
    },
  ],

  invalid: [
    {
      code: 'customElements.define("devtools-foo", DevToolsFoo, {extends: "p"});',
      errors: [
        {
          messageId: 'unexpectedCustomElementsDefineWithExtends',
        },
      ],
    },
    {
      code: 'globalThis.customElements.define("devtools-foo", DevToolsFoo, {extends: "p"});',
      errors: [
        {
          messageId: 'unexpectedCustomElementsDefineWithExtends',
        },
      ],
    },
    {
      code: 'self.customElements.define("devtools-foo", DevToolsFoo, {extends: "p"});',
      errors: [
        {
          messageId: 'unexpectedCustomElementsDefineWithExtends',
        },
      ],
    },
    {
      code: 'window.customElements.define("devtools-foo", DevToolsFoo, {extends: "p"});',
      errors: [
        {
          messageId: 'unexpectedCustomElementsDefineWithExtends',
        },
      ],
    },
    {
      code: 'class Foo extends HTMLDivElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      code: 'class Foo extends HTMLSpanElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      code: 'class Foo extends globalThis.HTMLDivElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      code: 'class Foo extends globalThis.HTMLSpanElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      code: 'class Foo extends self.HTMLDivElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      code: 'class Foo extends self.HTMLSpanElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      code: 'class Foo extends window.HTMLDivElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      code: 'class Foo extends window.HTMLSpanElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
  ],
});
