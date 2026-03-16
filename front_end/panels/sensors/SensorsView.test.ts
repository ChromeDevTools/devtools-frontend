// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Sensors from './sensors.js';

describeWithEnvironment('SensorsView', () => {
  let view: Sensors.SensorsView.SensorsView;

  beforeEach(() => {
    view = new Sensors.SensorsView.SensorsView();
    renderElementIntoDOM(view);
  });

  it('updates the custom location select when the setting changes', () => {
    const customLocationsSetting =
        Common.Settings.Settings.instance().moduleSetting<Sensors.LocationsSettingsTab.LocationDescription[]>(
            'emulation.locations');

    customLocationsSetting.set([{
      title: 'Test Location',
      lat: 10,
      long: 20,
      timezoneId: 'Europe/Berlin',
      locale: 'en-US',
      accuracy: 0,
    }]);

    const select = view.contentElement.querySelector('.geo-fields select') as HTMLSelectElement;
    assert.exists(select);

    const options = Array.from(select.options).map(option => option.textContent);
    assert.include(options, 'Test Location');
  });
});
