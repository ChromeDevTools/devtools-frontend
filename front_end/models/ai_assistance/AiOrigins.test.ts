// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as AiAssistance from './ai_assistance.js';

describeWithEnvironment('AiOrigins', () => {
  describe('isOpaqueOrigin', () => {
    it('identifies opaque origins', () => {
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('null'));
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('data:'));
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('about://'));
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('about:srcdoc'));
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('detached'));
      assert.isTrue(AiAssistance.AiOrigins.isOpaqueOrigin('detached:123'));
      assert.isFalse(AiAssistance.AiOrigins.isOpaqueOrigin('https://google.com'));
    });
  });

  describe('extractContextOrigin', () => {
    it('extracts origin from URLs', () => {
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('https://google.com/path'), 'https://google.com');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('null'), 'null');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('data:'), 'data:');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('about:blank'), 'about:blank');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('detached'), 'detached');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('trace-1-10'), 'trace-1-10');
      assert.strictEqual(AiAssistance.AiOrigins.extractContextOrigin('invalid-url'), '');
    });

    it('extracts origin from URLs with long paths, queries and hashes', () => {
      assert.strictEqual(
          AiAssistance.AiOrigins.extractContextOrigin(
              'https://google.com/some/long/path/to/file.html?query=1&other=2#hash'),
          'https://google.com');
    });

    it('extracts origin from URLs with subdomains', () => {
      assert.strictEqual(
          AiAssistance.AiOrigins.extractContextOrigin('https://subdomain.google.com/path'),
          'https://subdomain.google.com');
    });
  });

  describe('areOriginsEquivalent', () => {
    it('returns true for identical non-opaque origins', () => {
      assert.isTrue(AiAssistance.AiOrigins.areOriginsEquivalent('https://a.com', 'https://a.com'));
    });

    it('returns false for different non-opaque origins', () => {
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('https://a.com', 'https://b.com'));
    });

    it('never says opaque origins are equivalent even if they are the same string', () => {
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('data:', 'data:'));
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('null', 'null'));
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('about:blank', 'about:blank'));
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('detached', 'detached'));
    });

    it('returns false if one origin is opaque', () => {
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('https://a.com', 'null'));
      assert.isFalse(AiAssistance.AiOrigins.areOriginsEquivalent('null', 'https://a.com'));
    });
  });
});
