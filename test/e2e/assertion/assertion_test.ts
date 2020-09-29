// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {fatalErrors} from '../../conductor/hooks.js';
import {getBrowserAndPages, goToResource, step} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';

describe('Assertions', async function() {
  it('console.assert', async () => {
    const {frontend} = getBrowserAndPages();
    await step('Check the evaluation results from console', async () => {
      frontend.evaluate(() => {
        console.assert(false, 'expected failure 1');
      });
    });
    await goToResource('cross_tool/default.html');
    assert.strictEqual(fatalErrors.length, 1);
    assert.ok(fatalErrors[0].includes('expected failure 1'));
  });

  it('console.error', async () => {
    const {frontend} = getBrowserAndPages();
    await step('Check the evaluation results from console', async () => {
      frontend.evaluate(() => {
        console.error('expected failure 2');
      });
    });
    await goToResource('cross_tool/default.html');
    assert.strictEqual(fatalErrors.length, 1);
    assert.ok(fatalErrors[0].includes('expected failure 2'));
  });

  this.afterEach(() => {
    // Clear logged fatal errors so that we end up passing this test.
    fatalErrors.length = 0;
  });
});
