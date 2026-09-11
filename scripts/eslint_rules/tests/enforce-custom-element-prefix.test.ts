// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/enforce-custom-element-prefix.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('enforce-custom-element-prefix', rule, {
  valid: [
    {
      name: 'allows customElements.define with devtools- prefix string literal',
      code: `customElements.define('devtools-my-element', class extends HTMLElement {})`,
    },
    {
      name: 'allows customElements.define with devtools- prefix template literal',
      code: 'customElements.define(`devtools-another-element`, class extends HTMLElement {})',
    },
    {
      name: 'allows non-customElements define calls',
      code: `MyElements.define('my-element', class extends HTMLElement {})`,
    },
  ],
  invalid: [
    {
      name: 'disallows variable expression in customElements.define',
      code: `const myTag = 'my-element'; customElements.define(myTag, class extends HTMLElement {})`,
      errors: [{
        messageId: 'onlyStatic',
      }],
    },
    {
      name: 'disallows tag name without devtools- prefix',
      code: `customElements.define('my-element', class extends HTMLElement {})`,
      errors: [{
        messageId: 'missingPrefix',
        data: {tagName: 'my-element'},
      }],
    },
    {
      name: 'disallows template literal without devtools- prefix',
      code: 'customElements.define(`bad-element`, class extends HTMLElement {})',
      errors: [
        {messageId: 'missingPrefix', data: {tagName: 'bad-element'}},
      ],
    },
    {
      name: 'disallows empty string tag name',
      code: `customElements.define('', class extends HTMLElement {})`,
      errors: [{messageId: 'missingPrefix', data: {tagName: ''}}],
    },
    {
      name: 'disallows chrome- prefix instead of devtools- prefix',
      code: `customElements.define('chrome-my-element', class extends HTMLElement {})`,
      errors: [
        {messageId: 'missingPrefix', data: {tagName: 'chrome-my-element'}},
      ],
    },
    {
      name: 'disallows uppercase DEVTOOLS- prefix',
      code: `customElements.define('DEVTOOLS-my-element', class extends HTMLElement {})`,
      errors: [
        {messageId: 'missingPrefix', data: {tagName: 'DEVTOOLS-my-element'}},
      ],
    },
    {
      name: 'disallows prefix without hyphen',
      code: `customElements.define('devtoolselement', class extends HTMLElement {})`,
      errors: [{messageId: 'missingPrefix', data: {tagName: 'devtoolselement'}}],
    },
  ],
});
