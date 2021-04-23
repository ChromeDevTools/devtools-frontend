// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Animation from '../../../../../front_end/panels/animation/animation.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('AnimationModel', () => {
  it('can be instantiated', () => {
    assert.doesNotThrow(() => {
      const target = createTarget();
      new Animation.AnimationModel.AnimationModel(target);
    });
  });
});
