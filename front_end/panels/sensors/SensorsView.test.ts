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

  describe('Location input events', () => {
    beforeEach(() => {
      const select = view.contentElement.querySelector('.geo-fields select') as HTMLSelectElement;
      assert.exists(select);
      select.value = 'custom';
      select.dispatchEvent(new Event('change'));
    });

    it('validates latitude input and adds error class if invalid', () => {
      const latitudeInput = view.contentElement.querySelector('#latitude-input') as HTMLInputElement;
      assert.exists(latitudeInput);

      latitudeInput.value = 'invalid-value';
      latitudeInput.dispatchEvent(new Event('input'));
      assert.isTrue(latitudeInput.classList.contains('error-input'));

      latitudeInput.value = '45';
      latitudeInput.dispatchEvent(new Event('input'));
      assert.isFalse(latitudeInput.classList.contains('error-input'));
    });

    it('validates timezone input and adds error class if invalid', () => {
      const timezoneInput = view.contentElement.querySelector('#timezone-input') as HTMLInputElement;
      assert.exists(timezoneInput);

      timezoneInput.value = '12345';
      timezoneInput.dispatchEvent(new Event('input'));
      assert.isTrue(timezoneInput.classList.contains('error-input'));

      timezoneInput.value = 'Europe/Berlin';
      timezoneInput.dispatchEvent(new Event('input'));
      assert.isFalse(timezoneInput.classList.contains('error-input'));
    });

    it('updates emulation.location-override setting on valid input', () => {
      const latitudeInput = view.contentElement.querySelector('#latitude-input') as HTMLInputElement;
      assert.exists(latitudeInput);

      latitudeInput.value = '45';
      latitudeInput.dispatchEvent(new Event('input'));
      latitudeInput.dispatchEvent(new Event('change'));

      const locationSetting = Common.Settings.Settings.instance().createSetting('emulation.location-override', '');
      assert.isTrue(locationSetting.get().includes('45'));
    });

    it('modifies latitude input on ArrowUp key', () => {
      const latitudeInput = view.contentElement.querySelector('#latitude-input') as HTMLInputElement;
      assert.exists(latitudeInput);
      latitudeInput.value = '45';

      const event = new KeyboardEvent('keydown', {key: 'ArrowUp'});
      latitudeInput.dispatchEvent(event);

      // modifierMultiplier = 0.1, ArrowUp = 1. Result: 45 + 0.1*1 = 45.1
      assert.strictEqual(latitudeInput.value, '45.1');
    });

    it('modifies latitude input on ArrowDown key with Shift', () => {
      const latitudeInput = view.contentElement.querySelector('#latitude-input') as HTMLInputElement;
      assert.exists(latitudeInput);
      latitudeInput.value = '45';

      const event = new KeyboardEvent('keydown', {key: 'ArrowDown', shiftKey: true});
      latitudeInput.dispatchEvent(event);

      // modifierMultiplier = 0.1, Shift = 10. Result: 45 - 0.1*10 = 44
      assert.strictEqual(latitudeInput.value, '44');
    });

    it('modifies latitude input on ArrowUp key with Alt', () => {
      const latitudeInput = view.contentElement.querySelector('#latitude-input') as HTMLInputElement;
      assert.exists(latitudeInput);
      latitudeInput.value = '45';

      const event = new KeyboardEvent('keydown', {key: 'ArrowUp', altKey: true});
      latitudeInput.dispatchEvent(event);

      // modifierMultiplier = 0.1, Alt = 0.1. Result: 45 + 0.1*0.1 = 45.01
      assert.strictEqual(latitudeInput.value, '45.01');
    });
  });
});
