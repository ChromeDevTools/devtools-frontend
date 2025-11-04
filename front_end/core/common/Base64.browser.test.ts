// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

describe('Base64 encoder', () => {
  it('encodes ArrayBuffers correctly', async () => {
    const buffer1 = new Uint8Array([0]);
    assert.strictEqual(await Common.Base64.encode(buffer1.buffer), 'AA==');

    const buffer2 = new Uint8Array([0, 1]);
    assert.strictEqual(await Common.Base64.encode(buffer2.buffer), 'AAE=');

    const buffer3 = new Uint8Array([0, 1, 2]);
    assert.strictEqual(await Common.Base64.encode(buffer3.buffer), 'AAEC');
  });
});
