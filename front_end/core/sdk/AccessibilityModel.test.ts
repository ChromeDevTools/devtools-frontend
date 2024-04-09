// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

describeWithMockConnection('AccessibilityModel', () => {
  it('can be instantiated', () => {
    assert.doesNotThrow(() => {
      const target = createTarget();
      new SDK.AccessibilityModel.AccessibilityModel(target);
    });
  });
});
