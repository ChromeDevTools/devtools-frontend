// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Context} from '../../../../front_end/ui/Context.js';

describe('Context', () => {
  it('can be instantiated without issues', () => {
    const context = new Context();
    assert.equal(context.flavors().size, 0, 'context should not have any flavors upon instantiation');
  });

  // TODO continue writing tests here or use another describe block
});
