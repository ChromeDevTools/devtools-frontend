// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/lit-no-non-latin1.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('lit-no-non-latin1', rule, {
  valid: [
    {
      name: 'allows ASCII characters in Lit.html template',
      code: 'Lit.html`<div>Hello world</div>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows Latin1 characters in html template',
      code: 'html`<div>100\u00a0ms</div>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows Unicode escape sequences in html template',
      code: 'html`<span>\\u2026</span>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows non-Latin1 characters inside interpolated expressions',
      code: 'html`<span>${"…"}</span>`',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows non-Latin1 characters in non-Lit template literals',
      code: 'const str = `…`;',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows raw non-Latin1 character in html template',
      code: 'html`<span>…</span>`',
      filename: 'front_end/components/test.ts',
      errors: [
        {
          messageId: 'nonLatin1InLit',
          data: {
            codePoint: 'U+2026',
            escaped: '\\u2026',
          },
        },
      ],
    },
    {
      name: 'disallows raw non-Latin1 character in Lit.html template',
      code: 'Lit.html`<span>↳</span>`',
      filename: 'front_end/components/test.ts',
      errors: [
        {
          messageId: 'nonLatin1InLit',
          data: {
            codePoint: 'U+21B3',
            escaped: '\\u21b3',
          },
        },
      ],
    },
    {
      name: 'disallows raw astral plane character in html template',
      code: 'html`<span>\u{1F600}</span>`',
      filename: 'front_end/components/test.ts',
      errors: [
        {
          messageId: 'nonLatin1InLit',
          data: {
            codePoint: 'U+1F600',
            escaped: '\\u{1f600}',
          },
        },
      ],
    },
  ],
});
