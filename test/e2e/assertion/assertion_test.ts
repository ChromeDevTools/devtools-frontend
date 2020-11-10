// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectedErrors} from '../../conductor/hooks.js';
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
    assert.strictEqual(expectedErrors.length, 1);
    assert.ok(expectedErrors[0].includes('expected failure 1'));
  });

  // Suspected flaky console.errors are persisting from previous e2e-tests
  it.skip('[crbug.com/1145969]: console.error', async () => {
    const {frontend} = getBrowserAndPages();
    await step('Check the evaluation results from console', async () => {
      frontend.evaluate(() => {
        function foo() {
          console.error('expected failure 2');
        }
        foo();
      });
    });
    await goToResource('cross_tool/default.html');
    assert.strictEqual(expectedErrors.length, 2);
    assert.ok(expectedErrors[1].includes('expected failure 2'));
  });
});
