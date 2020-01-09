// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import '/front_end/common/common-legacy.js'
import {ListModel} from '/front_end/ui/ListModel.js';

describe('ListModel', () => {
  after(() => {
    // Clean up polluted globals.
    // TODO(https://crbug.com/1006759): These need removing once the ESM migration is complete.
    const globalObj = (self as any);
    delete globalObj.Common;
  });

  it('can be instantiated correctly without a list of items', () => {
    const listModel = new ListModel();
    assert.equal(listModel.length, 0, 'length of list model should be 0');
  });

  // TODO continue writing tests here or use another describe block
});
