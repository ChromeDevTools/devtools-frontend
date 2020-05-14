// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;
import {MultitargetNetworkManager} from '../../../../front_end/sdk/NetworkManager.js';

describe('MultitargetNetworkManager', () => {
  describe('_generateBrandVersionList', () => {
    it('produces expected things for M84', () => {
      // Matches ChromeContentBrowserClientTest.GenerateBrandVersionList
      const res = MultitargetNetworkManager._generateBrandVersionList(84, 'Totally A Brand', '84');
      assert.lengthOf(res, 3);
      assert.strictEqual(res[0].brand, '\\Not"A;Brand');
      assert.strictEqual(res[0].version, '99');
      assert.strictEqual(res[1].brand, 'Chromium');
      assert.strictEqual(res[1].version, '84');
      assert.strictEqual(res[2].brand, 'Totally A Brand');
      assert.strictEqual(res[2].version, '84');
    });
    it('produces a different shuffle for M85', () => {
      // See a different order for 85 and different non-brand. Also check at
      // non-integer version, just in case someone non-Chrome wants it.
      const res = MultitargetNetworkManager._generateBrandVersionList(85, 'Totally A Brand', '85.1');
      assert.lengthOf(res, 3);
      assert.strictEqual(res[0].brand, '\\Not;A"Brand');
      assert.strictEqual(res[0].version, '99');
      assert.strictEqual(res[1].brand, 'Totally A Brand');
      assert.strictEqual(res[1].version, '85.1');
      assert.strictEqual(res[2].brand, 'Chromium');
      assert.strictEqual(res[2].version, '85.1');
    });
    it('produces a different shuffle for M86', () => {
      // See a different order for 86.
      const res = MultitargetNetworkManager._generateBrandVersionList(86, 'Totally A Brand', '86');
      assert.lengthOf(res, 3);
      assert.strictEqual(res[0].brand, 'Chromium');
      assert.strictEqual(res[0].version, '86');
      assert.strictEqual(res[1].brand, '"Not\\A;Brand');
      assert.strictEqual(res[1].version, '99');
      assert.strictEqual(res[2].brand, 'Totally A Brand');
      assert.strictEqual(res[2].version, '86');
    });
  });
});
