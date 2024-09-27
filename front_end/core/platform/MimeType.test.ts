// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from './platform.js';

describe('parseContentType', () => {
  interface ContentTypeTest {
    contentType: string;
    expectedMimeType?: string|null;
    expectedCharset?: string|null;
  }

  const TEST_CASES: ContentTypeTest[] = [
    {
      contentType: 'text/html',
      expectedMimeType: 'text/html',
    },
    {
      contentType: 'text/html;',
      expectedMimeType: 'text/html',
    },
    {
      contentType: 'text/html; charset=utf-8',
      expectedMimeType: 'text/html',
      expectedCharset: 'utf-8',
    },
    // Parameter name is "charset " not "charset".
    {
      contentType: 'text/html; charset =utf-8',
      expectedMimeType: 'text/html',
    },
    {
      contentType: 'text/html; charset= utf-8',
      expectedMimeType: 'text/html',
      expectedCharset: 'utf-8',
    },
    {
      contentType: 'text/html; charset=utf-8 ',
      expectedMimeType: 'text/html',
      expectedCharset: 'utf-8',
    },
    {
      contentType: 'text/html; charset',
      expectedMimeType: 'text/html',
    },
    {
      contentType: 'text/html; charset=',
      expectedMimeType: 'text/html',
    },
    {
      contentType: 'text/html; charset= ',
      expectedMimeType: 'text/html',
    },
    {
      contentType: 'text/html; charset= ;',
      expectedMimeType: 'text/html',
    },
    // Empty quotes are allowed.
    {
      contentType: 'text/html; charset=""',
      expectedMimeType: 'text/html',
      expectedCharset: '',
    },
    // Leading/trailing whitespace in quotes is trimmed
    {
      contentType: 'text/html; charset=" "',
      expectedMimeType: 'text/html',
      expectedCharset: '',
    },
    {
      contentType: 'text/html; charset=" foo "',
      expectedMimeType: 'text/html',
      expectedCharset: 'foo',
    },
    // With multiple values, should use the first one
    {
      contentType: 'text/html; charset=foo; charset=utf-8',
      expectedMimeType: 'text/html',
      expectedCharset: 'foo',
    },
    {
      contentType: 'text/html; charset; charset=; charset=utf-8',
      expectedMimeType: 'text/html',
      expectedCharset: 'utf-8',
    },
    {
      contentType: 'text/html; charset=utf-8; charset=; charset',
      expectedMimeType: 'text/html',
      expectedCharset: 'utf-8',
    },
    // Stray quotes ignored.
    {
      contentType: 'text/html; " ""; charset=utf-8',
      expectedMimeType: 'text/html',
      expectedCharset: 'utf-8',
    },
    // Non-leading quotes kept as-is.
    {
      contentType: 'text/html; charset=u"tf-8"',
      expectedMimeType: 'text/html',
      expectedCharset: 'u"tf-8"',
    },
    {
      contentType: 'text/html; charset="utf-8"',
      expectedMimeType: 'text/html',
      expectedCharset: 'utf-8',
    },
    // No closing quote.
    {
      contentType: 'text/html; charset="utf-8',
      expectedMimeType: 'text/html',
      expectedCharset: 'utf-8',
    },
    // Check that \ is treated as an escape character.
    {
      contentType: 'text/html; charset="\\utf\\-\\8"',
      expectedMimeType: 'text/html',
      expectedCharset: 'utf-8',
    },
    // More interseting escape character test - test escaped backslash, escaped
    // quote, and backslash at end of input in unterminated quoted string.
    {
      contentType: 'text/html; charset="\\\\\\"\\',
      expectedMimeType: 'text/html',
      expectedCharset: '\\"\\',
    },
    // Check quoted semicolon
    {
      contentType: 'text/html; charset=";charset=utf-8;"',
      expectedMimeType: 'text/html',
      expectedCharset: ';charset=utf-8;',
    },
    // Single quotes are not delimiters but must be treated as part of charset.
    {
      contentType: 'text/html; charset=\'utf-8\'',
      expectedMimeType: 'text/html',
      expectedCharset: '\'utf-8\'',
    },
    // Empty subtype should be accepted.
    {
      contentType: 'text/',
      expectedMimeType: 'text/',
    },
    // */* is ignored unless it has parmas or is not an exact match.
    {
      contentType: '*/*',
      expectedMimeType: null,
    },
    {
      contentType: '*/* ',
      expectedMimeType: '*/*',
    },
    {
      contentType: '*/*; charset=utf-8',
      expectedMimeType: '*/*',
      expectedCharset: 'utf-8',
    },
    // mime type is lowercase.
    {
      contentType: 'teXT/html',
      expectedMimeType: 'text/html',
    },
  ];

  for (const test of TEST_CASES) {
    it(`parses '${test.contentType}'`, () => {
      const {mimeType, charset} = Platform.MimeType.parseContentType(test.contentType);
      assert.strictEqual(mimeType, test.expectedMimeType ?? null);
      assert.strictEqual(charset, test.expectedCharset ?? null);
    });
  }
});

describe('isTextType', () => {
  const TEST_CASES = new Map<string, boolean>([
    ['text/html', true],
    ['application/pdf', false],
    ['application/json', true],
    ['image/svg+xml', true],
    ['application/manifest+json', true],
    ['multipart/mixed', true],
    ['application/vnd.linkedin.normalized+json+2.1', true],
  ]);

  it('determines if a mime type has text content', () => {
    for (const [mimeType, expectedResult] of TEST_CASES) {
      assert.strictEqual(Platform.MimeType.isTextType(mimeType), expectedResult);
    }
  });
});
