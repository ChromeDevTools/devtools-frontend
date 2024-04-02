// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';

import * as Security from './security.js';

describe('SecurityModel', () => {
  describe('securityStateCompare', () => {
    const {securityStateCompare} = Security.SecurityModel;
    const {SecurityState} = Protocol.Security;

    it('identifies security states', () => {
      assert.strictEqual(securityStateCompare(SecurityState.Unknown, SecurityState.Unknown), 0);
      assert.strictEqual(securityStateCompare(SecurityState.Neutral, SecurityState.Neutral), 0);
      assert.strictEqual(securityStateCompare(SecurityState.Insecure, SecurityState.Insecure), 0);
      assert.strictEqual(securityStateCompare(SecurityState.Secure, SecurityState.Secure), 0);
      assert.strictEqual(securityStateCompare(SecurityState.Info, SecurityState.Info), 0);
      assert.strictEqual(securityStateCompare(SecurityState.InsecureBroken, SecurityState.InsecureBroken), 0);
    });

    it('ranks Info lowest', () => {
      assert.isBelow(securityStateCompare(SecurityState.Info, SecurityState.Unknown), 0);
      assert.isBelow(securityStateCompare(SecurityState.Info, SecurityState.Neutral), 0);
      assert.isBelow(securityStateCompare(SecurityState.Info, SecurityState.Insecure), 0);
      assert.isBelow(securityStateCompare(SecurityState.Info, SecurityState.Secure), 0);
      assert.isBelow(securityStateCompare(SecurityState.Info, SecurityState.InsecureBroken), 0);
    });

    it('ranks Unknown highest', () => {
      assert.isAbove(securityStateCompare(SecurityState.Unknown, SecurityState.Neutral), 0);
      assert.isAbove(securityStateCompare(SecurityState.Unknown, SecurityState.Insecure), 0);
      assert.isAbove(securityStateCompare(SecurityState.Unknown, SecurityState.Secure), 0);
      assert.isAbove(securityStateCompare(SecurityState.Unknown, SecurityState.Info), 0);
      assert.isAbove(securityStateCompare(SecurityState.Unknown, SecurityState.InsecureBroken), 0);
    });

    it('orders correctly from InsecureBroken to Secure', () => {
      assert.isBelow(securityStateCompare(SecurityState.InsecureBroken, SecurityState.Insecure), 0);
      assert.isBelow(securityStateCompare(SecurityState.Insecure, SecurityState.Neutral), 0);
      assert.isBelow(securityStateCompare(SecurityState.Neutral, SecurityState.Secure), 0);
    });
  });
});
