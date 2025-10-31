// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/enforce-custom-element-prefix.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('enforce-custom-element-prefix', rule, {
  valid: [
    {
      code: `customElements.define('devtools-my-element', class extends HTMLElement {})`,
    },
    {
      code: 'customElements.define(`devtools-another-element`, class extends HTMLElement {})',
    },
    {
      code: `MyElements.define('my-element', class extends HTMLElement {})`,
    }
  ],
  invalid: [
    {
      code: `const myTag = 'my-element'; customElements.define(myTag, class extends HTMLElement {})`,
      errors: [{
        messageId: 'onlyStatic',
      }],
    },
    {
      code: `customElements.define('my-element', class extends HTMLElement {})`,
      errors: [{
        messageId: 'missingPrefix',
        data: {tagName: 'my-element'},
      }],
    },
    {
      code: 'customElements.define(`bad-element`, class extends HTMLElement {})',
      errors: [
        {messageId: 'missingPrefix', data: {tagName: 'bad-element'}},
      ],
    },
    {
      code: `customElements.define('', class extends HTMLElement {})`,
      errors: [{messageId: 'missingPrefix', data: {tagName: ''}}],
    },
    {
      code: `customElements.define('chrome-my-element', class extends HTMLElement {})`,
      errors: [
        {messageId: 'missingPrefix', data: {tagName: 'chrome-my-element'}},
      ],
    },
    {
      code: `customElements.define('DEVTOOLS-my-element', class extends HTMLElement {})`,
      errors: [
        {messageId: 'missingPrefix', data: {tagName: 'DEVTOOLS-my-element'}},
      ],
    },
    {
      code: `customElements.define('devtoolselement', class extends HTMLElement {})`,
      errors: [{messageId: 'missingPrefix', data: {tagName: 'devtoolselement'}}],
    },
  ],
});
