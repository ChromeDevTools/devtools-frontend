// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FormatterWorker from './formatter_worker.js';

describe('FormatterWorker', () => {
  describe('format', () => {
    const {format} = FormatterWorker.FormatterWorker;
    it('correctly formats Web app manifests', () => {
      const inputText = '{"name":"My Web App","start_url":"."}';
      const formattedText = `{
    "name": "My Web App",
    "start_url": "."
}`;
      assert.strictEqual(format('application/manifest+json', inputText).content, formattedText);
    });
  });
});
