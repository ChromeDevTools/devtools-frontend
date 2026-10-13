// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

describe('screenshot test with retries', () => {
  it('should fail with screenshot error', async () => {
    const doc = window.document;
    const el = doc.createElement('div');
    el.style.width = '10px';
    el.style.height = '10px';
    el.style.backgroundColor = 'red';
    el.id = 'test-screenshot-el-1';
    doc.body.appendChild(el);

    let errStr;
    try {
      // @ts-expect-error global screenshot binding.
      errStr = await window.assertScreenshot('#test-screenshot-el-1', 'this-does-not-exist.png');
    } finally {
      el.remove();
    }
    if (errStr) {
      throw new Error(errStr);
    }
  });

  it('should fail with another screenshot error', async () => {
    const doc = window.document;
    const el = doc.createElement('div');
    el.style.width = '10px';
    el.style.height = '10px';
    el.style.backgroundColor = 'blue';
    el.id = 'test-screenshot-el-2';
    doc.body.appendChild(el);

    let errStr;
    try {
      // @ts-expect-error global screenshot binding.
      errStr = await window.assertScreenshot('#test-screenshot-el-2', 'another-does-not-exist.png');
    } finally {
      el.remove();
    }
    if (errStr) {
      throw new Error(errStr);
    }
  });
});
