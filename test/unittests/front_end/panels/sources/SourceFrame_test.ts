// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SourceFrame from '../../../../../front_end/ui/legacy/components/source_frame/source_frame.js';

const {simplifyMimeType} = SourceFrame.SourceFrame.TEST_ONLY;

// Special cases are tested in different tests
const COMMON_MIME_TYPES_WITHOUT_SPECIAL_CASES = [
  'text/javascript',
  'text/jsx',
  'text/typescript',
  'text/typescript-jsx',
  'text/css',
  'text/x-scss',
  'text/html',
  'application/xml',
  'text/webassembly',
  'text/x-c++src',
  'text/x-java',
  'application/json',
  'application/x-httpd-php',
  'text/x-python',
  'text/markdown',
  'text/x-sh',
  'text/x-coffeescript',
  'text/x-clojure',
];

const {assert} = chai;

describe('SourceFrame', () => {
  describe('simplifyMimeType', () => {
    it('should return text/javascript when given mime type contains javascript, jscript, or ecmascript', () => {
      assert.strictEqual(simplifyMimeType('', 'text/javascript'), 'text/javascript');
      assert.strictEqual(simplifyMimeType('', 'text/jscript'), 'text/javascript');
      assert.strictEqual(simplifyMimeType('', 'text/ecmascript'), 'text/javascript');
    });

    it('should return application/x-httpd-php for PHP embedded in HTML', () => {
      assert.strictEqual(
          simplifyMimeType('<html><? print("goal"); ?></html>', 'text/x-php'), 'application/x-httpd-php');
    });

    it('should return text/webassembly when given mime is application/wasm', () => {
      assert.strictEqual(simplifyMimeType('', 'application/wasm'), 'text/webassembly');
    });

    it('should return other mime types as it is', () => {
      for (const mimeType of COMMON_MIME_TYPES_WITHOUT_SPECIAL_CASES) {
        assert.strictEqual(simplifyMimeType('', mimeType), mimeType);
      }
    });
  });
});
