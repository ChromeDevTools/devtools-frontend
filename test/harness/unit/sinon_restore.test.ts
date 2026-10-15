// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

describe('sinon stub restore harness', () => {
  const realSetTimeout = globalThis.setTimeout;
  const target = {
    method(): string {
      return 'original';
    },
  };

  it('allows stubbing a method without manually restoring it at the end of the test', () => {
    assert.strictEqual(target.method(), 'original');
    sinon.stub(target, 'method').returns('stubbed');
    assert.strictEqual(target.method(), 'stubbed');
  });

  it('ensures stubs are automatically restored by the harness across tests', () => {
    assert.strictEqual(target.method(), 'original');
  });

  it('allows creating fake timers without manually restoring clock', () => {
    assert.strictEqual(globalThis.setTimeout, realSetTimeout);
    sinon.useFakeTimers();
    assert.notStrictEqual(globalThis.setTimeout, realSetTimeout);
  });

  it('ensures fake timers are automatically restored by the harness across tests', () => {
    assert.strictEqual(globalThis.setTimeout, realSetTimeout);
  });
});
