// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from 'mocha';

import {registerTestTeardown} from '../../../front_end/testing/TestTeardown.js';

describe('Unexpected console error harness', () => {
  it('fails when console.error is called', () => {
    console.error('boom');
  });

  it('fails when console.warn is called', () => {
    console.warn('careful');
  });

  it('fails when teardown calls console.error', () => {
    registerTestTeardown(() => {
      console.error('teardown boom');
    });
  });

  it('preserves original failure when console.error is also called', () => {
    console.error('secondary error');
    throw new Error('original failure');
  });

  it('passes subsequent clean test', () => {});
});
