// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-customized-builtin-elements.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-customized-builtin-elements', rule, {
  valid: [
    {
      name: 'allows empty class',
      code: 'class Foo {}',
    },
    {
      name: 'allows customElements.define without options',
      code: 'customElements.define("devtools-foo", DevToolsFoo);',
    },
    {
      name: 'allows globalThis.customElements.define without options',
      code: 'globalThis.customElements.define("devtools-foo", DevToolsFoo);',
    },
    {
      name: 'allows self.customElements.define without options',
      code: 'self.customElements.define("devtools-foo", DevToolsFoo);',
    },
    {
      name: 'allows window.customElements.define without options',
      code: 'window.customElements.define("devtools-foo", DevToolsFoo);',
    },
    {
      name: 'allows customElements.define with empty options',
      code: 'customElements.define("devtools-foo", DevToolsFoo, {});',
    },
    {
      name: 'allows globalThis.customElements.define with empty options',
      code: 'globalThis.customElements.define("devtools-foo", DevToolsFoo, {});',
    },
    {
      name: 'allows self.customElements.define with empty options',
      code: 'self.customElements.define("devtools-foo", DevToolsFoo, {});',
    },
    {
      name: 'allows window.customElements.define with empty options',
      code: 'window.customElements.define("devtools-foo", DevToolsFoo, {});',
    },
    {
      name: 'allows class extending HTMLElement',
      code: 'class Foo extends HTMLElement {}',
    },
    {
      name: 'allows class extending globalThis.HTMLElement',
      code: 'class Foo extends globalThis.HTMLElement {}',
    },
    {
      name: 'allows class extending self.HTMLElement',
      code: 'class Foo extends self.HTMLElement {}',
    },
    {
      name: 'allows class extending window.HTMLElement',
      code: 'class Foo extends window.HTMLElement {}',
    },
  ],

  invalid: [
    {
      name: 'flags customElements.define with extends option',
      code: 'customElements.define("devtools-foo", DevToolsFoo, {extends: "p"});',
      errors: [
        {
          messageId: 'unexpectedCustomElementsDefineWithExtends',
        },
      ],
    },
    {
      name: 'flags globalThis.customElements.define with extends option',
      code: 'globalThis.customElements.define("devtools-foo", DevToolsFoo, {extends: "p"});',
      errors: [
        {
          messageId: 'unexpectedCustomElementsDefineWithExtends',
        },
      ],
    },
    {
      name: 'flags self.customElements.define with extends option',
      code: 'self.customElements.define("devtools-foo", DevToolsFoo, {extends: "p"});',
      errors: [
        {
          messageId: 'unexpectedCustomElementsDefineWithExtends',
        },
      ],
    },
    {
      name: 'flags window.customElements.define with extends option',
      code: 'window.customElements.define("devtools-foo", DevToolsFoo, {extends: "p"});',
      errors: [
        {
          messageId: 'unexpectedCustomElementsDefineWithExtends',
        },
      ],
    },
    {
      name: 'flags class extending HTMLDivElement',
      code: 'class Foo extends HTMLDivElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      name: 'flags class extending HTMLSpanElement',
      code: 'class Foo extends HTMLSpanElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      name: 'flags class extending globalThis.HTMLDivElement',
      code: 'class Foo extends globalThis.HTMLDivElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      name: 'flags class extending globalThis.HTMLSpanElement',
      code: 'class Foo extends globalThis.HTMLSpanElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      name: 'flags class extending self.HTMLDivElement',
      code: 'class Foo extends self.HTMLDivElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      name: 'flags class extending self.HTMLSpanElement',
      code: 'class Foo extends self.HTMLSpanElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      name: 'flags class extending window.HTMLDivElement',
      code: 'class Foo extends window.HTMLDivElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
    {
      name: 'flags class extending window.HTMLSpanElement',
      code: 'class Foo extends window.HTMLSpanElement {}',
      errors: [
        {
          messageId: 'unexpectedExtendsBuiltinElement',
        },
      ],
    },
  ],
});
