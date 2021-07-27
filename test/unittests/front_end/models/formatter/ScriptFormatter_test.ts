// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Formatter from '../../../../../front_end/models/formatter/formatter.js';

describe('ScriptFormatter', () => {
  const indentString = '  ';

  it('can format a HTML document', async () => {
    const {formattedContent} = await Formatter.ScriptFormatter.format(
        Common.ResourceType.ResourceType.fromMimeType('text/html'), 'text/html',
        '<html><head></head><body></body></html>', indentString);
    assert.strictEqual(formattedContent, `<html>
  <head></head>
  <body></body>
</html>
`);
  });

  it('can map original locations to formatted locations for HTML documents', async () => {
    const {formattedMapping} = await Formatter.ScriptFormatter.format(
        Common.ResourceType.ResourceType.fromMimeType('text/html'), 'text/html',
        '<html><head></head><body></body></html>', indentString);
    // The start of <head>
    assert.deepEqual(formattedMapping.originalToFormatted(0, 6), [1, 2]);
  });

  it('can map original lines to formatted locations for HTML documents', async () => {
    const {formattedMapping} = await Formatter.ScriptFormatter.format(
        Common.ResourceType.ResourceType.fromMimeType('text/html'), 'text/html', `<html><head>
</head><body></body></html>`,
        indentString);
    // The start of </head>
    assert.deepEqual(formattedMapping.originalToFormatted(1), [1, 8]);
  });

  it('can map formatted locations to original locations for HTML documents', async () => {
    const {formattedMapping} = await Formatter.ScriptFormatter.format(
        Common.ResourceType.ResourceType.fromMimeType('text/html'), 'text/html',
        '<html><head></head><body></body></html>', indentString);
    // The start of <head>
    assert.deepEqual(formattedMapping.formattedToOriginal(1, 2), [0, 6]);
  });

  it('can map formatted lines to original locations for HTML documents', async () => {
    const {formattedMapping} = await Formatter.ScriptFormatter.format(
        Common.ResourceType.ResourceType.fromMimeType('text/html'), 'text/html',
        '<html><head></head><body></body></html>', indentString);
    // The start of <head>
    assert.deepEqual(formattedMapping.formattedToOriginal(1), [0, 6]);
  });

  describe('for documents that cant be formatted', () => {
    // Technically we can format SVG files, but for this test we pretend its
    // mimetype is an image, which we consider unformattable.
    const originalContent = `<svg>
  <rect x="10" y="-10" /></svg>`;
    const mimeType = 'image/svg';
    const resourceType = Common.ResourceType.ResourceType.fromMimeType(mimeType);

    it('returns the original content', async () => {
      const {formattedContent} =
          await Formatter.ScriptFormatter.format(resourceType, mimeType, originalContent, indentString);
      assert.deepEqual(formattedContent, originalContent);
    });

    it('maps to the same locations from formatted locations', async () => {
      const {formattedMapping} =
          await Formatter.ScriptFormatter.format(resourceType, mimeType, originalContent, indentString);
      assert.deepEqual(formattedMapping.formattedToOriginal(1, 2), [1, 2]);
    });

    it('defaults column number to zero from formatted locations', async () => {
      const {formattedMapping} =
          await Formatter.ScriptFormatter.format(resourceType, mimeType, originalContent, indentString);
      assert.deepEqual(formattedMapping.formattedToOriginal(1), [1, 0]);
    });

    it('maps to the same locations from original locations', async () => {
      const {formattedMapping} =
          await Formatter.ScriptFormatter.format(resourceType, mimeType, originalContent, indentString);
      assert.deepEqual(formattedMapping.originalToFormatted(1, 4), [1, 4]);
    });

    it('defaults column number to zero from original locations', async () => {
      const {formattedMapping} =
          await Formatter.ScriptFormatter.format(resourceType, mimeType, originalContent, indentString);
      assert.deepEqual(formattedMapping.originalToFormatted(1), [1, 0]);
    });
  });
});
