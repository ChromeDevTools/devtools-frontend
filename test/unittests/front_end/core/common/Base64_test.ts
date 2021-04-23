// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';

describe('Base64 decoder', () => {
  function decode(str: string) {
    const encoded = btoa(str);
    const decoded = Common.Base64.decode(encoded);
    const view = new DataView(decoded);
    for (let idx = 0; idx < str.length; idx++) {
      assert.strictEqual(view.getUint8(idx), str.charCodeAt(idx));
    }
  }

  it('decodes correctly with double padding', () => {
    decode('ABCDEFG');  // Double-equals padded: QUJDREVGRw==
  });

  it('decodes correctly with padding', () => {
    decode('ABCDE');  // Single-equals padded: QUJDREU=
  });

  it('decodes correctly without padding', () => {
    decode('ABCDEF');  // Unpadded: QUJDREVG
  });
});
