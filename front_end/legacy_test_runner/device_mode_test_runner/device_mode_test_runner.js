// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as EmulationModel from '../../models/emulation/emulation.js';

/**
 * @file using private properties isn't a Closure violation in tests.
 */
export const DeviceModeTestRunner = {};

DeviceModeTestRunner.buildFakePhone = function(overrides) {
  const StandardPhoneJSON = {
    'show-by-default': false,
    title: 'Fake Phone 1',

    screen: {
      horizontal: {width: 480, height: 320},

      'device-pixel-ratio': 2,

      vertical: {width: 320, height: 480},
    },

    capabilities: ['touch', 'mobile'],
    'user-agent': 'fakeUserAgent',
    type: 'phone',

    modes: [
      {
        title: 'default',
        orientation: 'vertical',
      },
      {
        title: 'default',
        orientation: 'horizontal',
      },
    ],
  };

  const json = Object.assign(StandardPhoneJSON, overrides || {});
  return EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(json);
};
