// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {default as ServerTiming} from '/front_end/sdk/ServerTiming.js';

describe('ServerTiming', () => {
  it('can be instantiated correctly', () => {
    const serverTiming = new ServerTiming('example metric', 1, 'example description');
    assert.equal(serverTiming.metric, 'example metric','metric was not set correctly');
    assert.equal(serverTiming.value, 1,'value was not set correctly');
    assert.equal(serverTiming.description, 'example description','description was not set correctly');
  });

  // TODO continue writing tests here or use another describe block
});
