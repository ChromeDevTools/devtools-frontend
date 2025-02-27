// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../conductor/mocha-interface-helpers.js';

import {assert} from 'chai';

describe('Dummy', function() {
  it('dumb', async ({devToolsPage, inspectedPage, browser}) => {
    assert.isDefined(devToolsPage);
    assert.isDefined(inspectedPage);
    assert.isDefined(browser);
  });

  it('dumber', async ({}) => {
    assert.isTrue(true);
  });
  it('dumber1', async ({}) => {
    assert.isTrue(true);
  });
  it('dumber2', async ({}) => {
    assert.isTrue(true);
  });
  it('dumber3', async ({}) => {
    assert.isTrue(true);
  });
  it('dumber4', async ({}) => {
    assert.isTrue(true);
  });
  it('dumber5', async ({}) => {
    assert.isTrue(true);
  });
});
