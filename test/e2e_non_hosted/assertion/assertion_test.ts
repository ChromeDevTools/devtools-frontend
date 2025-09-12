// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectedErrors} from '../../conductor/events.js';

describe('Assertions', function() {
  it('console.assert', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.evaluate(() => {
      console.assert(false, 'expected failure 1');
    });
    await inspectedPage.goToResource('cross_tool/default.html');
    assert.isOk(expectedErrors.some(error => error.includes('expected failure 1')));
  });

  it('console.error', async ({devToolsPage, inspectedPage}) => {
    await devToolsPage.evaluate(() => {
      function foo() {
        console.error('expected failure 2');
      }
      foo();
    });
    await inspectedPage.goToResource('cross_tool/default.html');
    assert.isOk(expectedErrors.some(error => error.includes('expected failure 2')));
  });
});
