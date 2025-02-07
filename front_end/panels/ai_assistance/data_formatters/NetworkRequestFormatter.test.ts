// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {NetworkRequestFormatter} from '../ai_assistance.js';

describe('NetworkRequestFormatter', () => {
  describe('allowHeader', () => {
    it('allows a header from the list', () => {
      assert.isTrue(NetworkRequestFormatter.allowHeader({name: 'content-type', value: 'foo'}));
    });

    it('disallows headers not on the list', () => {
      assert.isFalse(NetworkRequestFormatter.allowHeader({name: 'cookie', value: 'foo'}));
      assert.isFalse(NetworkRequestFormatter.allowHeader({name: 'set-cookie', value: 'foo'}));
      assert.isFalse(NetworkRequestFormatter.allowHeader({name: 'authorization', value: 'foo'}));
    });
  });

  describe('formatInitiatorUrl', () => {
    const tests = [
      {
        allowedResource: 'https://example.test',
        targetResource: 'https://example.test',
        shouldBeRedacted: false,
      },
      {
        allowedResource: 'https://example.test',
        targetResource: 'https://another-example.test',
        shouldBeRedacted: true,
      },
      {
        allowedResource: 'file://test',
        targetResource: 'https://another-example.test',
        shouldBeRedacted: true,
      },
      {
        allowedResource: 'https://another-example.test',
        targetResource: 'file://test',
        shouldBeRedacted: true,
      },
      {
        allowedResource: 'https://test.example.test',
        targetResource: 'https://example.test',
        shouldBeRedacted: true,
      },
      {
        allowedResource: 'https://test.example.test:9900',
        targetResource: 'https://test.example.test:9901',
        shouldBeRedacted: true,
      },
    ];

    for (const t of tests) {
      it(`${t.targetResource} test when allowed resource is ${t.allowedResource}`, () => {
        const formatted = NetworkRequestFormatter.formatInitiatorUrl(
            new URL(t.targetResource).origin, new URL(t.allowedResource).origin);
        if (t.shouldBeRedacted) {
          assert.strictEqual(
              formatted, '<redacted cross-origin initiator URL>', `${JSON.stringify(t)} was not redacted`);
        } else {
          assert.strictEqual(formatted, t.targetResource, `${JSON.stringify(t)} was redacted`);
        }
      });
    }
  });

  describe('formatHeaders', () => {
    it('does not redact a header from the list', () => {
      assert.strictEqual(
          NetworkRequestFormatter.formatHeaders('test:', [{name: 'content-type', value: 'foo'}]),
          'test:\ncontent-type: foo');
    });

    it('disallows headers not on the list', () => {
      assert.strictEqual(
          NetworkRequestFormatter.formatHeaders('test:', [{name: 'cookie', value: 'foo'}]),
          'test:\ncookie: <redacted>');
      assert.strictEqual(
          NetworkRequestFormatter.formatHeaders('test:', [{name: 'set-cookie', value: 'foo'}]),
          'test:\nset-cookie: <redacted>');
      assert.strictEqual(
          NetworkRequestFormatter.formatHeaders('test:', [{name: 'authorization', value: 'foo'}]),
          'test:\nauthorization: <redacted>');
    });
  });
});
