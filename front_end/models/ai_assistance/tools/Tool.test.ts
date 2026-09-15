// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../../core/sdk/sdk.js';
import * as AiAssistance from '../ai_assistance.js';

describe('Tool origin helpers', () => {
  describe('isOriginAllowedByLock', () => {
    it('returns false when origin lock is uninitialized', () => {
      const targetOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isFalse(AiAssistance.Tool.isOriginAllowedByLock({status: 'UNINITIALIZED'}, targetOrigin));
    });

    it('returns false when origin lock is blocked', () => {
      const targetOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isFalse(AiAssistance.Tool.isOriginAllowedByLock({status: 'BLOCKED_BY_NAVIGATION'}, targetOrigin));
    });

    it('returns false when established origin is opaque', () => {
      const opaqueEstablished = SDK.SecurityOrigin.SecurityOrigin.createUniqueOpaque();
      const targetOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isFalse(AiAssistance.Tool.isOriginAllowedByLock({status: 'ESTABLISHED_ORIGIN', origin: opaqueEstablished},
                                                             targetOrigin));
    });

    it('returns false when target origin is undefined', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isFalse(
          AiAssistance.Tool.isOriginAllowedByLock({status: 'ESTABLISHED_ORIGIN', origin: established}, undefined));
    });

    it('returns false when target origin is null', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isFalse(
          AiAssistance.Tool.isOriginAllowedByLock({status: 'ESTABLISHED_ORIGIN', origin: established}, null));
    });

    it('returns false when target origin is opaque', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const opaqueTarget = SDK.SecurityOrigin.SecurityOrigin.createUniqueOpaque();
      assert.isFalse(
          AiAssistance.Tool.isOriginAllowedByLock({status: 'ESTABLISHED_ORIGIN', origin: established}, opaqueTarget));
    });

    it('returns false when target origin does not match established origin', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const crossOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com');
      assert.isFalse(
          AiAssistance.Tool.isOriginAllowedByLock({status: 'ESTABLISHED_ORIGIN', origin: established}, crossOrigin));
    });

    it('returns true when target origin matches established origin', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const sameOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      assert.isTrue(
          AiAssistance.Tool.isOriginAllowedByLock({status: 'ESTABLISHED_ORIGIN', origin: established}, sameOrigin));
    });
  });

  describe('resolveOriginFromLock', () => {
    it('returns error when origin lock is uninitialized', () => {
      const result = AiAssistance.Tool.resolveOriginFromLock({status: 'UNINITIALIZED'});
      assert.deepEqual(result, {error: 'No origin established for this conversation.'});
    });

    it('returns error when origin lock is blocked by navigation', () => {
      const result = AiAssistance.Tool.resolveOriginFromLock({status: 'BLOCKED_BY_NAVIGATION'});
      assert.deepEqual(result, {error: 'Cross-origin access blocked due to navigation.'});
    });

    it('returns error when established origin is opaque', () => {
      const opaqueEstablished = SDK.SecurityOrigin.SecurityOrigin.createUniqueOpaque();
      const result = AiAssistance.Tool.resolveOriginFromLock({
        status: 'ESTABLISHED_ORIGIN',
        origin: opaqueEstablished,
      });
      assert.deepEqual(result, {error: 'No origin available or not allowed.'});
    });

    it('returns established origin when valid', () => {
      const established = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
      const result = AiAssistance.Tool.resolveOriginFromLock({
        status: 'ESTABLISHED_ORIGIN',
        origin: established,
      });
      assert.deepEqual(result, {origin: established});
    });
  });
});
