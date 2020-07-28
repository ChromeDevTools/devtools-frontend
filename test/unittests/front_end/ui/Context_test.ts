// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UI from '../../../../front_end/ui/ui.js';

describe('Context', () => {
  it('can be instantiated without issues', () => {
    const context = new UI.Context.Context();
    assert.strictEqual(context.flavors().size, 0, 'context should not have any flavors upon instantiation');
  });

  // TODO continue writing tests here or use another describe block
});
