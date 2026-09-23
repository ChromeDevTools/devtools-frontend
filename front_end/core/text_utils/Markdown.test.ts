// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as TextUtils from './text_utils.js';

describe('Markdown', () => {
  it('tokenizes {PLACEHOLDER_*} into placeholder AST tokens without substituting strings', () => {
    const tokens = TextUtils.Markdown.tokenizeWithPlaceholders(
        'Check {PLACEHOLDER_Link} here.',
        new Map([['PLACEHOLDER_Link', '[Spoofed](https://example.com)']]),
    );

    const paragraph = tokens.find(t => t.type === 'paragraph');
    assert.exists(paragraph);
    const inlineTokens = 'tokens' in paragraph && paragraph.tokens ? paragraph.tokens : [];
    const placeholderToken = inlineTokens.find(
        (t): t is TextUtils.Markdown.PlaceholderToken => t.type === 'placeholder',
    );
    assert.exists(placeholderToken);
    assert.strictEqual(placeholderToken.key, 'PLACEHOLDER_Link');
    assert.strictEqual(placeholderToken.raw, '{PLACEHOLDER_Link}');
    assert.isFalse(inlineTokens.some(t => t.type === 'link'));
  });

  it('validates invalid, missing, and unused placeholders when substitutions are provided', () => {
    assert.throws(() => {
      TextUtils.Markdown.tokenizeWithPlaceholders(
          'Missing {PLACEHOLDER_PH1}',
          new Map(),
      );
    }, /No replacement provided for placeholder 'PLACEHOLDER_PH1'/);

    assert.throws(() => {
      TextUtils.Markdown.tokenizeWithPlaceholders(
          'Invalid key',
          new Map([['invalid_ph', 'foo']]),
      );
    }, /Invalid placeholder 'invalid_ph' provided/);

    assert.throws(() => {
      TextUtils.Markdown.tokenizeWithPlaceholders(
          'No placeholders used here',
          new Map([['PLACEHOLDER_Unused', 'foo']]),
      );
    }, /Unused replacements provided: PLACEHOLDER_Unused/);
  });
});
