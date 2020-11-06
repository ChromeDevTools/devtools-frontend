// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {createTarget} from '../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../helpers/MockConnection.js';
import * as Accessibility from '../../../../front_end/accessibility/accessibility.js';

describeWithMockConnection('AccessibilityModel', () => {
  it('can be instantiated', () => {
    assert.doesNotThrow(() => {
      const target = createTarget();
      new Accessibility.AccessibilityModel.AccessibilityModel(target);
    });
  });
});
