// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {InspectorBackend} from '/front_end/protocol/InspectorBackend.js';

describe('InspectorBackend', () => {
  it('can be instantiated successfully', () => {
    const inspectorBackend = new InspectorBackend();
    assert.isFalse(inspectorBackend.isInitialized(), 'it should not be initialized when instantiated');
  });

  // TODO continue writing tests here or use another describe block
});
