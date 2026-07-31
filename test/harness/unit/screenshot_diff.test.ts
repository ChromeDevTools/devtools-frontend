// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

describe('screenshot test with diff', () => {
  it('should fail with screenshot diff', async () => {
    const doc = window.document;
    const el = doc.createElement('div');
    el.style.width = '100px';
    el.style.height = '100px';
    el.style.backgroundColor = 'red';
    el.id = 'test-screenshot-diff-el';
    doc.body.appendChild(el);

    let errStr;
    try {
      // @ts-expect-error global screenshot binding.
      errStr = await window.assertScreenshot('#test-screenshot-diff-el', 'application/webmcp-empty.png');
    } finally {
      el.remove();
    }
    if (errStr) {
      throw new Error(errStr);
    }
  });
});
