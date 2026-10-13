// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {describe, it} from '../../e2e/conductor/mocha-interface.js';

describe('Test Harness E2E Fixture', () => {
  it('should run a basic e2e test successfully', async ({devToolsPage}) => {
    assert.isNotNull(devToolsPage, 'devToolsPage should be available');
  });
});
