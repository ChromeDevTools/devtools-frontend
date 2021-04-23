// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

describeWithEnvironment('OverlayColorGenerator', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  it('generates colors for at least 100 iterations', () => {
    const generator = new SDK.OverlayColorGenerator.OverlayColorGenerator();
    let prevColor: Common.Color.Color|undefined;
    for (let i = 0; i < 100; i++) {
      const color = generator.next();
      assert(color instanceof Common.Color.Color);
      if (prevColor) {
        assert(color.asString() !== prevColor.asString());
      }
      prevColor = color;
    }
  });
});
