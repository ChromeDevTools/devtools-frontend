// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createTarget} from '../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../test/unittests/front_end/helpers/MockConnection.js';

import * as SDK from './sdk.js';

const {assert} = chai;

describeWithMockConnection('AccessibilityModel', () => {
  it('can be instantiated', () => {
    assert.doesNotThrow(() => {
      const target = createTarget();
      new SDK.AccessibilityModel.AccessibilityModel(target);
    });
  });
});
