// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/l10n-uistrings-sentence-punctuation.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('l10n-uistrings-sentence-punctuation', rule, {
  valid: [
    {
      code: 'const UIStrings = { foo: \'Single sentence without period\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'Is this a question?\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'Important warning!\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'Loading…\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'Loading...\' } as const;',
    },
    {
      code: 'const UIStrings = { period: \'.\' } as const;',
    },
    {
      code: 'const UIStrings = { dots: \'...\' } as const;',
    },
    {
      code: 'const UIStrings = { ellipsis: \'…\' } as const;',
    },
    {
      code: 'const UIStrings = { savingD: \'Saving… {PH1}%\' } as const;',
    },
    {
      code: 'const UIStrings = { skippingDMatchingLines: \'( … Skipping {PH1} matching lines … )\' } as const;',
    },
    {
      code: 'const UIStrings = { loadingNodesD: \'Loading nodes… {PH1}%\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'Timeline debug mode (trace event details, etc.)\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'First sentence. Second sentence.\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'First sentence. Learn more: https://developer.chrome.com\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'First sentence. Learn more: goo.gle/abc\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'Filter applied: {PH1}. Total: {PH2}\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'Value is 3.14 and ratio is 2.5. Next sentence.\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'Click `document.body` or `window.location`. Next sentence.\' } as const;',
    },
    {
      code:
          'const UIStrings = { foo: \'Supports multiple browsers (e.g. Chrome, Firefox) and environments (i.e. mobile vs. desktop)\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'{n, plural, =1 {# issue} other {# issues}}\' } as const;',
    },
    {
      code:
          'const UIStrings = { foo: \'{n, plural, =1 {One issue found. Fix it.} other {# issues found. Fix them.}}\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'Are you sure? This cannot be undone.\' } as const;',
    },
    {
      code: 'const UIStrings = { foo: \'This is permanent. Do you want to proceed?\' } as const;',
    },
    {
      code: `
        const UIStrings = { foo: 'Single sentence' } as const;
        const template = html\`<div>\${i18nString(UIStrings.foo)}</div>\`;
      `,
    },
    {
      code:
          'const UIStrings = { foo: \'The prerendered page used a forbidden JavaScript API that is currently not supported (Internal Mojo interface: {PH1})\' } as const;',
    },
    {
      code:
          'const UIStrings = { foo: \'Placement of DevTools relative to the page ({PH1} to restore last position)\' } as const;',
    },
    {
      code:
          'const UIStrings = { foo: \'The initiating page cannot perform prerendering, because it has an effective URL that is different from its normal URL. (For example, the New Tab Page, or hosted apps.)\' } as const;',
    },
    {
      code: 'const notUIStrings = { foo: \'Single sentence ending with period.\' } as const;',
    },
  ],
  invalid: [
    {
      code: 'const UIStrings = { foo: \'Single sentence ending with period.\' } as const;',
      output: 'const UIStrings = { foo: \'Single sentence ending with period\' } as const;',
      errors: [
        {
          messageId: 'singleSentenceEndingPeriod',
        },
      ],
    },
    {
      code: 'const UIStrings = { foo: \'No value found for "{PH1}".\' } as const;',
      output: 'const UIStrings = { foo: \'No value found for "{PH1}"\' } as const;',
      errors: [
        {
          messageId: 'singleSentenceEndingPeriod',
        },
      ],
    },
    {
      code: 'const UIStrings = { foo: \'This page is secure (valid HTTPS).\' } as const;',
      output: 'const UIStrings = { foo: \'This page is secure (valid HTTPS)\' } as const;',
      errors: [
        {
          messageId: 'singleSentenceEndingPeriod',
        },
      ],
    },
    {
      code: 'const UIStrings = { foo: \'First sentence. Second sentence without period\' } as const;',
      output: 'const UIStrings = { foo: \'First sentence. Second sentence without period.\' } as const;',
      errors: [
        {
          messageId: 'multiSentenceMissingPeriod',
        },
      ],
    },
    {
      code: 'const UIStrings = { foo: \'Are you sure? This cannot be undone\' } as const;',
      output: 'const UIStrings = { foo: \'Are you sure? This cannot be undone.\' } as const;',
      errors: [
        {
          messageId: 'multiSentenceMissingPeriod',
        },
      ],
    },
    {
      code: `
        const UIStrings = {
          label: 'More info:',
          detail: 'This is detail description.',
        } as const;
        const msg = i18nString(UIStrings.label) + ' ' + i18nString(UIStrings.detail);
      `,
      output: `
        const UIStrings = {
          label: 'More info:',
          detail: 'This is detail description',
        } as const;
        const msg = i18nString(UIStrings.label) + ' ' + i18nString(UIStrings.detail);
      `,
      errors: [
        {
          messageId: 'singleSentenceEndingPeriod',
        },
      ],
    },
    {
      code:
          'const UIStrings = { foo: \'{n, plural, =1 {# issue found in 1 frame.} other {# issues found in 1 frame.}}\' } as const;',
      output:
          'const UIStrings = { foo: \'{n, plural, =1 {# issue found in 1 frame} other {# issues found in 1 frame}}\' } as const;',
      errors: [
        {
          messageId: 'singleSentenceEndingPeriod',
        },
      ],
    },
    {
      code:
          'const UIStrings = { foo: \'The prerendered page used a forbidden JavaScript API that is currently not supported (Internal Mojo interface: {PH1}).\' } as const;',
      output:
          'const UIStrings = { foo: \'The prerendered page used a forbidden JavaScript API that is currently not supported (Internal Mojo interface: {PH1})\' } as const;',
      errors: [
        {
          messageId: 'singleSentenceEndingPeriod',
        },
      ],
    },
  ],
});
