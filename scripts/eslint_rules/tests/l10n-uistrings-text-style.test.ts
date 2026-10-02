// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/l10n-uistrings-text-style.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('l10n-uistrings-text-style', rule, {
  valid: [
    {
      name: 'allows curly apostrophe in contraction',
      code: 'const UIStrings = { foo: \'Don’t show\' } as const;',
    },
    {
      name: 'allows curly apostrophe in possessive',
      code: 'const UIStrings = { foo: \'Chrome’s language\' } as const;',
    },
    {
      name: 'allows single quotes around word',
      code: 'const UIStrings = { foo: \'Click \\\'Add\\\'\' } as const;',
    },
    {
      name: 'allows uppercase URL',
      code: 'const UIStrings = { foo: \'Enter a URL\' } as const;',
    },
    {
      name: 'allows lowercase url inside placeholder',
      code: 'const UIStrings = { foo: \'Screenshot {url} should specify a size\' } as const;',
    },
    {
      name: 'allows url in locked backtick phrase',
      code: 'const UIStrings = { foo: \'e.g. `url:a.com`\' } as const;',
    },
    {
      name: 'allows partially locked phrase with backticks',
      code: 'const UIStrings = { foo: \'Locking part of phrase `foo` is allowed\' } as const;',
    },
    {
      name: 'allows multiple placeholders',
      code: 'const UIStrings = { foo: \'Multiple {PH1} placeholders {PH2}\' } as const;',
    },
    {
      name: 'allows straight apostrophe in non-UIStrings object',
      code: 'const variableNotNamedUIStrings = { foo: \'don\\\'t\' } as const;',
    },
    {
      name: 'allows mixed case Url in non-UIStrings object',
      code: 'const variableNotNamedUIStrings = { foo: \'Enter a Url\' } as const;',
    },
    {
      name: 'allows Unicode ellipsis',
      code: 'const UIStrings = { foo: \'Loading…\' } as const;',
    },
    {
      name: 'allows three dots inside locked backtick code span',
      code: 'const UIStrings = { foo: \'Call `foo(...)` to start\' } as const;',
    },
    {
      name: 'allows three dots in non-UIStrings object',
      code: 'const variableNotNamedUIStrings = { foo: \'Loading...\' } as const;',
    },
    {
      name: 'allows contraction inside locked backtick code span',
      code: 'const UIStrings = { foo: \'Value `is not` valid\' } as const;',
    },
    {
      name: 'allows uncontracted phrase in non-UIStrings object',
      code: 'const variableNotNamedUIStrings = { foo: \'Do not show\' } as const;',
    },
  ],
  invalid: [
    {
      name: 'disallows fully locked phrase with backticks',
      code: 'const UIStrings = { foo: \'`fully locked phrase`\' } as const;',
      errors: [
        {
          messageId: 'fullyLockedPhrase',
        },
      ],
    },
    {
      name: 'disallows single placeholder phrase',
      code: 'const UIStrings = { foo: \'{PH1}\' } as const;',
      errors: [
        {
          messageId: 'singlePlaceholderPhrase',
        },
      ],
    },
    {
      name: 'disallows straight apostrophe in contraction',
      code: 'const UIStrings = { foo: \'don\\\'t\' } as const;',
      errors: [
        {
          messageId: 'useCurlyApostrophe',
          data: {
            PH1: 'don\'t',
          },
        },
      ],
    },
    {
      name: 'disallows straight apostrophe in possessive',
      code: 'const UIStrings = { foo: \'debugger\\\'s\' } as const;',
      errors: [
        {
          messageId: 'useCurlyApostrophe',
          data: {
            PH1: 'debugger\'s',
          },
        },
      ],
    },
    {
      name: 'disallows titlecase Url',
      code: 'const UIStrings = { foo: \'Enter a Url\' } as const;',
      errors: [
        {
          messageId: 'useUppercaseUrl',
          data: {
            PH1: 'Url',
            PH2: 'Enter a Url',
          },
        },
      ],
    },
    {
      name: 'disallows lowercase url outside placeholder or backticks',
      code: 'const UIStrings = { foo: \'invalid url given\' } as const;',
      errors: [
        {
          messageId: 'useUppercaseUrl',
          data: {
            PH1: 'url',
            PH2: 'invalid url given',
          },
        },
      ],
    },
    {
      name: 'disallows curly double quotes',
      code: 'const UIStrings = { foo: \'Click “Add”\' } as const;',
      errors: [
        {
          messageId: 'useStraightDoubleQuote',
          data: {
            PH1: 'Click “Add”',
          },
        },
      ],
    },
    {
      name: 'disallows three dots and auto-fixes to Unicode ellipsis',
      code: 'const UIStrings = { foo: \'Loading...\' } as const;',
      output: 'const UIStrings = { foo: \'Loading…\' } as const;',
      errors: [
        {
          messageId: 'useUnicodeEllipsis',
          data: {
            PH1: 'Loading...',
          },
        },
      ],
    },
    {
      name: 'preserves three dots inside backticks when auto-fixing unquoted three dots',
      code: 'const UIStrings = { foo: \'Calling `foo(...)`...\' } as const;',
      output: 'const UIStrings = { foo: \'Calling `foo(...)`…\' } as const;',
      errors: [
        {
          messageId: 'useUnicodeEllipsis',
          data: {
            PH1: 'Calling `foo(...)`...',
          },
        },
      ],
    },
    {
      name: 'disallows uncontracted phrase and auto-fixes with preserved capitalization',
      code: 'const UIStrings = { foo: \'Do not show\' } as const;',
      output: 'const UIStrings = { foo: \'Don’t show\' } as const;',
      errors: [
        {
          messageId: 'useContraction',
          data: {
            PH1: 'Don’t',
            PH2: 'Do not',
            PH3: 'Do not show',
          },
        },
      ],
    },
    {
      name: 'disallows uncontracted cannot and auto-fixes while preserving backtick spans',
      code: 'const UIStrings = { foo: \'Value `cannot` be empty and cannot be null\' } as const;',
      output: 'const UIStrings = { foo: \'Value `cannot` be empty and can’t be null\' } as const;',
      errors: [
        {
          messageId: 'useContraction',
          data: {
            PH1: 'can’t',
            PH2: 'cannot',
            PH3: 'Value `cannot` be empty and cannot be null',
          },
        },
      ],
    },
  ],
});
