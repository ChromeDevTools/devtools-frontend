// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../../core/sdk/sdk.js';
import * as AiAssistance from '../ai_assistance.js';

describe('Tool origin helpers', () => {
  describe('isOriginAllowedByLock', () => {
    it('returns false when established origin is undefined', () => {
      const targetOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isFalse(AiAssistance.Tool.isOriginAllowedByLock(undefined, targetOrigin));
    });

    it('returns false when established origin is opaque', () => {
      const opaqueEstablished = SDK.SecurityOrigin.SecurityOrigin.createUniqueOpaque();
      const targetOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isFalse(AiAssistance.Tool.isOriginAllowedByLock(opaqueEstablished, targetOrigin));
    });

    it('returns false when target origin is undefined', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isFalse(AiAssistance.Tool.isOriginAllowedByLock(established, undefined));
    });

    it('returns false when target origin is null', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isFalse(AiAssistance.Tool.isOriginAllowedByLock(established, null));
    });

    it('returns false when target origin is opaque', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const opaqueTarget = SDK.SecurityOrigin.SecurityOrigin.createUniqueOpaque();
      assert.isFalse(AiAssistance.Tool.isOriginAllowedByLock(established, opaqueTarget));
    });

    it('returns false when target origin does not match established origin', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const crossOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      assert.isFalse(AiAssistance.Tool.isOriginAllowedByLock(established, crossOrigin));
    });

    it('returns true when target origin matches established origin', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const sameOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isTrue(AiAssistance.Tool.isOriginAllowedByLock(established, sameOrigin));
    });
  });
});
