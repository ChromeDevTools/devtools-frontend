// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';

import * as Sensors from './sensors.js';

const {CPUPerformanceTier, CPUThrottlingManager} = SDK.CPUThrottlingManager;

describeWithEnvironment('SensorsView', () => {
  let view: Sensors.SensorsView.SensorsView;

  beforeEach(() => {
    view = new Sensors.SensorsView.SensorsView();
    renderElementIntoDOM(view);
  });

  it('updates the custom location select when the setting changes', () => {
    const customLocationsSetting =
        Common.Settings.Settings.instance().resolve(SettingsUI.EmulationSettings.emulationLocationsSettingDescriptor);

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

  describe('Location select', () => {
    const BERLIN = {
      title: 'Berlin',
      lat: 52.52,
      long: 13.405,
      timezoneId: 'Europe/Berlin',
      locale: 'de-DE',
      accuracy: 50,
    };
    const BERLIN_INPUT_VALUES = ['52.52', '13.405', 'Europe/Berlin', 'de-DE', '50'];

    let customLocationsSetting: Common.Settings.Setting<Sensors.LocationsSettingsTab.LocationDescription[]>;
    let locationSetting: Common.Settings.Setting<string>;
    let geolocationOverrides: Array<Protocol.Emulation.SetGeolocationOverrideRequest|null>;
    let timezoneOverrides: string[];
    let timezoneErrorMessage: string|undefined;
    let localeErrorMessage: string|undefined;

    beforeEach(async () => {
      geolocationOverrides = [];
      timezoneOverrides = [];
      timezoneErrorMessage = undefined;
      localeErrorMessage = undefined;

      const connection = new MockCDPConnection();
      connection.setSuccessHandler('Emulation.setGeolocationOverride', params => {
        geolocationOverrides.push(params ?? {});
        return {};
      });
      connection.setSuccessHandler('Emulation.clearGeolocationOverride', () => {
        geolocationOverrides.push(null);
        return {};
      });
      connection.setHandler('Emulation.setTimezoneOverride', params => {
        timezoneOverrides.push(params.timezoneId);
        return timezoneErrorMessage ? {error: {message: timezoneErrorMessage, code: -32000}} : {result: {}};
      });
      connection.setHandler('Emulation.setLocaleOverride', () => {
        return localeErrorMessage ? {error: {message: localeErrorMessage, code: -32000}} : {result: {}};
      });
      connection.setSuccessHandler('Emulation.setUserAgentOverride', () => ({}));
      const target = createTarget({connection});
      assert.exists(target.model(SDK.EmulationModel.EmulationModel));

      locationSetting = Common.Settings.Settings.instance().createSetting('emulation.location-override', '');
      customLocationsSetting =
          Common.Settings.Settings.instance().resolve(SettingsUI.EmulationSettings.emulationLocationsSettingDescriptor);
      customLocationsSetting.set([BERLIN]);
      await settled();
    });

    /** Waits for pending emulation requests and view updates. */
    async function settled(): Promise<void> {
      await raf();
      await UI.Widget.Widget.allUpdatesComplete;
    }

    function locationSelect(): HTMLSelectElement {
      const select = view.contentElement.querySelector<HTMLSelectElement>('.geo-fields select');
      assert.exists(select);
      return select;
    }

    async function selectLocation(valueOrTitle: string): Promise<void> {
      const select = locationSelect();
      const option =
          Array.from(select.options).find(option => option.value === valueOrTitle || option.text === valueOrTitle);
      assert.exists(option);
      select.selectedIndex = option.index;
      select.dispatchEvent(new Event('change'));
      await settled();
    }

    function selectedLocationTitle(): string {
      const select = locationSelect();
      return select.options[select.selectedIndex].text;
    }

    function locationInput(name: string): HTMLInputElement {
      const input = view.contentElement.querySelector<HTMLInputElement>(`#${name}-input`);
      assert.exists(input);
      return input;
    }

    function locationInputValues(): string[] {
      return ['latitude', 'longitude', 'timezone', 'locale', 'accuracy'].map(name => locationInput(name).value);
    }

    function locationInputsDisabled(): boolean {
      const fieldset = view.contentElement.querySelector<HTMLFieldSetElement>('#location-override-section');
      assert.exists(fieldset);
      return fieldset.disabled;
    }

    function errorMessage(name: string): string {
      const error = view.contentElement.querySelector(`.${name}-error`);
      assert.exists(error);
      return error.textContent.trim();
    }

    it('has no override and disabled inputs by default', () => {
      assert.strictEqual(selectedLocationTitle(), 'No override');
      assert.isTrue(locationInputsDisabled());
      assert.deepEqual(Array.from(locationSelect().options).map(option => option.text), [
        'No override',
        'Berlin',
        'Other…',
        'Location unavailable',
      ]);
    });

    it('applies a custom location from the list', async () => {
      await selectLocation('Berlin');

      assert.isFalse(locationInputsDisabled());
      assert.deepEqual(locationInputValues(), BERLIN_INPUT_VALUES);
      assert.strictEqual(locationSetting.get(), '52.52@13.405:Europe/Berlin:de-DE::50');
      assert.deepEqual(geolocationOverrides, [{latitude: 52.52, longitude: 13.405, accuracy: 50}]);
      assert.deepEqual(timezoneOverrides, ['Europe/Berlin']);
    });

    it('switches to "Other…" when the inputs of a custom location are edited', async () => {
      await selectLocation('Berlin');

      const latitudeInput = locationInput('latitude');
      latitudeInput.value = '10';
      latitudeInput.dispatchEvent(new Event('change'));
      await settled();

      assert.strictEqual(selectedLocationTitle(), 'Other…');
      assert.strictEqual(locationSetting.get(), '10@13.405:Europe/Berlin:de-DE::50');
      assert.deepEqual(geolocationOverrides.at(-1), {latitude: 10, longitude: 13.405, accuracy: 50});
    });

    it('applies the current input values when "Other…" is selected', async () => {
      await selectLocation('Berlin');
      await selectLocation('Location unavailable');
      await selectLocation('Other…');

      assert.isFalse(locationInputsDisabled());
      assert.deepEqual(locationInputValues(), BERLIN_INPUT_VALUES);
      assert.strictEqual(locationSetting.get(), '52.52@13.405:Europe/Berlin:de-DE::50');
    });

    it('emulates an unavailable location', async () => {
      await selectLocation('Berlin');
      await selectLocation('Location unavailable');

      assert.isFalse(locationInputsDisabled());
      assert.deepEqual(locationInputValues(), BERLIN_INPUT_VALUES);
      assert.strictEqual(locationSetting.get(), '0@0:::true:150');
      assert.deepEqual(geolocationOverrides.at(-1), {});
      assert.strictEqual(timezoneOverrides.at(-1), '');
    });

    it('clears the override and resets the inputs when "No override" is selected', async () => {
      await selectLocation('Berlin');
      await selectLocation('No override');

      assert.isTrue(locationInputsDisabled());
      assert.deepEqual(locationInputValues(), ['0', '0', '', '', '150']);
      assert.strictEqual(locationSetting.get(), '');
      assert.isNull(geolocationOverrides.at(-1));
    });

    it('keeps the selected location when the list of custom locations changes', async () => {
      await selectLocation('Berlin');

      customLocationsSetting.set([BERLIN, {...BERLIN, title: 'Paris', lat: 48.8566, long: 2.3522}]);
      await settled();

      assert.strictEqual(selectedLocationTitle(), 'Berlin');
      assert.isFalse(locationInputsDisabled());
      assert.deepEqual(locationInputValues(), BERLIN_INPUT_VALUES);
    });

    it('keeps the selected location when a custom location is inserted before it', async () => {
      await selectLocation('Berlin');

      customLocationsSetting.set([{...BERLIN, title: 'Paris', lat: 48.8566, long: 2.3522}, BERLIN]);
      await settled();

      assert.strictEqual(selectedLocationTitle(), 'Berlin');
      assert.deepEqual(locationInputValues(), BERLIN_INPUT_VALUES);
    });

    it('shows an error when the timezone cannot be emulated', async () => {
      timezoneErrorMessage = 'Invalid timezone';
      await selectLocation('Berlin');

      assert.strictEqual(errorMessage('timezone'), 'Invalid timezone');
      assert.strictEqual(errorMessage('locale'), '');
    });

    it('shows an error when the locale cannot be emulated', async () => {
      localeErrorMessage = 'Invalid locale';
      await selectLocation('Berlin');

      assert.strictEqual(errorMessage('locale'), 'Invalid locale');
      assert.strictEqual(errorMessage('timezone'), '');
    });

    it('clears the timezone error when the selection changes', async () => {
      timezoneErrorMessage = 'Invalid timezone';
      await selectLocation('Berlin');
      timezoneErrorMessage = undefined;

      await selectLocation('No override');

      assert.strictEqual(errorMessage('timezone'), '');
    });
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

      latitudeInput.value = '100';  // Latitude must be <= 90
      latitudeInput.dispatchEvent(new Event('input'));
      assert.isFalse(latitudeInput.checkValidity());
      assert.isTrue(latitudeInput.matches(':invalid'));

      latitudeInput.value = '90';  // Inclusive bound
      latitudeInput.dispatchEvent(new Event('input'));
      assert.isTrue(latitudeInput.checkValidity());
      assert.isFalse(latitudeInput.matches(':invalid'));

      latitudeInput.value = '45';
      latitudeInput.dispatchEvent(new Event('input'));
      assert.isTrue(latitudeInput.checkValidity());
      assert.isFalse(latitudeInput.matches(':invalid'));
    });

    it('validates timezone input and adds error class if invalid', () => {
      const timezoneInput = view.contentElement.querySelector('#timezone-input') as HTMLInputElement;
      assert.exists(timezoneInput);

      timezoneInput.value = '12345';  // Pattern requires a-zA-Z
      timezoneInput.dispatchEvent(new Event('input'));
      assert.isFalse(timezoneInput.checkValidity());
      assert.isTrue(timezoneInput.matches(':invalid'));

      timezoneInput.value = 'Europe/Berlin';
      timezoneInput.dispatchEvent(new Event('input'));
      assert.isTrue(timezoneInput.checkValidity());
      assert.isFalse(timezoneInput.matches(':invalid'));
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

  describe('Device Orientation select', () => {
    const LANDSCAPE_LEFT = {alpha: 90, beta: 0, gamma: -90};

    let orientationSetting: Common.Settings.Setting<string>;
    let orientationOverrides: Array<Protocol.DeviceOrientation.SetDeviceOrientationOverrideRequest|null>;

    beforeEach(() => {
      orientationOverrides = [];
      const connection = new MockCDPConnection();
      connection.setSuccessHandler('DeviceOrientation.setDeviceOrientationOverride', params => {
        orientationOverrides.push(params);
        return {};
      });
      connection.setSuccessHandler('DeviceOrientation.clearDeviceOrientationOverride', () => {
        orientationOverrides.push(null);
        return {};
      });
      const target = createTarget({connection});
      assert.exists(target.model(SDK.EmulationModel.EmulationModel));

      orientationSetting =
          Common.Settings.Settings.instance().createSetting('emulation.device-orientation-override', '');
    });

    /** Waits for pending emulation requests and view updates. */
    async function settled(): Promise<void> {
      await raf();
      await UI.Widget.Widget.allUpdatesComplete;
    }

    function query<T extends HTMLElement>(selector: string): T {
      const element = view.contentElement.querySelector<T>(selector);
      assert.exists(element);
      return element;
    }

    async function selectOrientation(title: string): Promise<void> {
      const select = query<HTMLSelectElement>('.orientation-fields select');
      const option = Array.from(select.options).find(option => option.text === title);
      assert.exists(option);
      select.selectedIndex = option.index;
      select.dispatchEvent(new Event('change'));
      await settled();
    }

    function selectedOrientationTitle(): string {
      const select = query<HTMLSelectElement>('.orientation-fields select');
      return select.options[select.selectedIndex].text;
    }

    function orientationInputValues(): string[] {
      const inputs = view.contentElement.querySelectorAll<HTMLInputElement>('.orientation-axis-input-container input');
      return Array.from(inputs, input => input.value);
    }

    function orientationInputsDisabled(): boolean {
      return query<HTMLFieldSetElement>('.device-orientation-override-section').disabled;
    }

    function stage(): HTMLElement {
      return query('.orientation-stage');
    }

    function boxTransform(): string {
      return query('.orientation-layer').style.transform;
    }

    async function dragStage(from: {x: number, y: number}, to: {x: number, y: number}): Promise<void> {
      const rect = stage().getBoundingClientRect();
      const eventInit = (position: {x: number, y: number}): PointerEventInit => ({
        clientX: rect.left + position.x * rect.width,
        clientY: rect.top + position.y * rect.height,
        buttons: 1,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      stage().dispatchEvent(new PointerEvent('pointerdown', eventInit(from)));
      stage().dispatchEvent(new PointerEvent('pointermove', eventInit(to)));
      stage().dispatchEvent(new PointerEvent('pointerup', eventInit(to)));
      await settled();
    }

    it('is off by default with disabled inputs and stage', () => {
      assert.strictEqual(selectedOrientationTitle(), 'Off');
      assert.isTrue(orientationInputsDisabled());
      assert.deepEqual(orientationInputValues(), ['0', '0', '0']);
      assert.isTrue(stage().classList.contains('disabled'));
      assert.strictEqual(stage().title, 'Enable orientation to rotate');
      assert.strictEqual(boxTransform(), 'rotateY(0deg) rotateX(0deg) rotateZ(0deg)');
    });

    it('applies a preset', async () => {
      await selectOrientation('Landscape left');

      assert.isFalse(orientationInputsDisabled());
      assert.deepEqual(orientationInputValues(), ['90', '0', '-90']);
      assert.isFalse(stage().classList.contains('disabled'));
      assert.isTrue(stage().classList.contains('is-animating'));
      assert.strictEqual(stage().title, 'Shift+drag horizontally to rotate around the y-axis');
      assert.strictEqual(boxTransform(), 'rotateY(90deg) rotateX(0deg) rotateZ(-90deg)');
      assert.deepEqual(JSON.parse(orientationSetting.get()), LANDSCAPE_LEFT);
      assert.deepEqual(orientationOverrides, [LANDSCAPE_LEFT]);
    });

    it('resets to portrait when "Custom orientation" is selected', async () => {
      await selectOrientation('Custom orientation');

      assert.strictEqual(selectedOrientationTitle(), 'Portrait');
      assert.isFalse(orientationInputsDisabled());
      assert.deepEqual(orientationInputValues(), ['0', '90', '0']);
      assert.deepEqual(orientationOverrides, [{alpha: 0, beta: 90, gamma: 0}]);
    });

    it('switches to "Custom orientation" when the inputs of a preset are edited', async () => {
      await selectOrientation('Landscape left');

      const betaInput = query<HTMLInputElement>('#beta-input');
      betaInput.value = '45';
      betaInput.dispatchEvent(new Event('change'));
      await settled();

      assert.strictEqual(selectedOrientationTitle(), 'Custom orientation');
      assert.strictEqual(boxTransform(), 'rotateY(90deg) rotateX(-45deg) rotateZ(-90deg)');
      assert.deepEqual(orientationOverrides.at(-1), {alpha: 90, beta: 45, gamma: -90});
    });

    it('resets to portrait when the reset button is clicked', async () => {
      await selectOrientation('Landscape left');

      query('.orientation-reset-button').click();
      await settled();

      assert.strictEqual(selectedOrientationTitle(), 'Portrait');
      assert.deepEqual(orientationInputValues(), ['0', '90', '0']);
      assert.strictEqual(boxTransform(), 'rotateY(0deg) rotateX(-90deg) rotateZ(0deg)');
      assert.deepEqual(orientationOverrides.at(-1), {alpha: 0, beta: 90, gamma: 0});
    });

    it('resets inputs that hold a value which was not applied', async () => {
      await selectOrientation('Portrait');
      // Out of range, so the value is not applied and the orientation stays the same as after the reset.
      query<HTMLInputElement>('#beta-input').value = '999';

      query('.orientation-reset-button').click();
      await settled();

      assert.deepEqual(orientationInputValues(), ['0', '90', '0']);
    });

    it('clears the override but keeps the values when "Off" is selected', async () => {
      await selectOrientation('Landscape left');
      await selectOrientation('Off');

      assert.isTrue(orientationInputsDisabled());
      assert.isTrue(stage().classList.contains('disabled'));
      assert.strictEqual(stage().title, 'Enable orientation to rotate');
      assert.deepEqual(orientationInputValues(), ['90', '0', '-90']);
      assert.deepEqual(JSON.parse(orientationSetting.get()), LANDSCAPE_LEFT);
      assert.isNull(orientationOverrides.at(-1));
    });

    it('rotates the device when the stage is dragged', async () => {
      await selectOrientation('Landscape left');

      await dragStage({x: 0.5, y: 0.5}, {x: 0.6, y: 0.5});

      assert.strictEqual(selectedOrientationTitle(), 'Custom orientation');
      assert.isFalse(stage().classList.contains('is-animating'));
      assert.notDeepEqual(orientationInputValues(), ['90', '0', '-90']);
      assert.notDeepEqual(orientationOverrides.at(-1), LANDSCAPE_LEFT);
    });

    it('ignores drags on the stage while the override is off', async () => {
      await dragStage({x: 0.5, y: 0.5}, {x: 0.6, y: 0.5});

      assert.strictEqual(selectedOrientationTitle(), 'Off');
      assert.deepEqual(orientationInputValues(), ['0', '0', '0']);
      assert.isEmpty(orientationOverrides);
    });
  });

  describe('Device Orientation input events', () => {
    let alphaInput: HTMLInputElement;

    beforeEach(() => {
      const select = view.contentElement.querySelector('.orientation-content select') as HTMLSelectElement;
      assert.exists(select);
      select.value = 'custom';
      select.dispatchEvent(new Event('change'));

      alphaInput = view.contentElement.querySelector('#alpha-input') as HTMLInputElement;
      assert.exists(alphaInput);
    });

    it('validates alpha input and adds error class if invalid', () => {
      alphaInput.value = '1000';  // alpha must be <= 359.9999
      alphaInput.dispatchEvent(new Event('input'));
      assert.isFalse(alphaInput.checkValidity());
      assert.isTrue(alphaInput.matches(':invalid'));

      alphaInput.value = '360';  // exclusive bound
      alphaInput.dispatchEvent(new Event('input'));
      assert.isFalse(alphaInput.checkValidity());
      assert.isTrue(alphaInput.matches(':invalid'));

      alphaInput.value = '45';
      alphaInput.dispatchEvent(new Event('input'));
      assert.isTrue(alphaInput.checkValidity());
      assert.isFalse(alphaInput.matches(':invalid'));
    });

    it('updates emulation.device-orientation-override setting on valid input', () => {
      alphaInput.value = '45';
      alphaInput.dispatchEvent(new Event('input'));
      alphaInput.dispatchEvent(new Event('change'));

      const orientationSetting =
          Common.Settings.Settings.instance().createSetting('emulation.device-orientation-override', '');
      assert.isTrue(orientationSetting.get().includes('45'));
    });

    it('modifies alpha input on ArrowUp key', () => {
      alphaInput.value = '45';

      const event = new KeyboardEvent('keydown', {key: 'ArrowUp'});
      alphaInput.dispatchEvent(event);

      // Default step for orientation (without modifier) is 1
      assert.strictEqual(alphaInput.value, '46');
    });

    it('modifies alpha input on ArrowDown key with Shift', () => {
      alphaInput.value = '45';

      const event = new KeyboardEvent('keydown', {key: 'ArrowDown', shiftKey: true});
      alphaInput.dispatchEvent(event);

      // Shift increases/decreases by 10
      assert.strictEqual(alphaInput.value, '35');
    });
  });

  describe('Setting selects', () => {
    function settingSelect(section: string): HTMLSelectElement {
      const select = view.contentElement.querySelector<HTMLSelectElement>(`.${section}-section select`);
      assert.exists(select);
      return select;
    }

    function optionTitles(section: string): string[] {
      return Array.from(settingSelect(section).options, option => option.text.trim());
    }

    function selectedTitle(section: string): string {
      const select = settingSelect(section);
      return select.options[select.selectedIndex].text.trim();
    }

    async function selectSetting(section: string, title: string): Promise<void> {
      const select = settingSelect(section);
      const option = Array.from(select.options).find(option => option.text.trim() === title);
      assert.exists(option);
      select.selectedIndex = option.index;
      select.dispatchEvent(new Event('change'));
      await UI.Widget.Widget.allUpdatesComplete;
    }

    it('renders the touch select and updates the setting', async () => {
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.touchSettingDescriptor);
      assert.deepEqual(optionTitles('touch'), ['Device-based', 'Force enabled']);
      assert.strictEqual(selectedTitle('touch'), 'Device-based');

      await selectSetting('touch', 'Force enabled');

      assert.strictEqual(setting.get(), 'force');
    });

    it('renders the idle detection select and updates the setting', async () => {
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.idleDetectionSettingDescriptor);
      assert.deepEqual(optionTitles('idle'), [
        'No idle emulation',
        'User active, screen unlocked',
        'User active, screen locked',
        'User idle, screen unlocked',
        'User idle, screen locked',
      ]);
      assert.strictEqual(selectedTitle('idle'), 'No idle emulation');

      await selectSetting('idle', 'User idle, screen locked');

      assert.strictEqual(setting.get(), '{"isUserActive":false,"isScreenUnlocked":false}');
    });

    it('renders the CPU pressure select and updates the setting', async () => {
      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.cpuPressureSettingDescriptor);
      assert.deepEqual(optionTitles('pressure'), ['No override', 'Nominal', 'Fair', 'Serious', 'Critical']);
      assert.strictEqual(selectedTitle('pressure'), 'No override');

      await selectSetting('pressure', 'Critical');

      assert.strictEqual(setting.get(), 'critical');
    });
  });

  describe('Hardware concurrency section', () => {
    const DEFAULT_CONCURRENCY = 8;

    let concurrencyOverrides: number[];

    beforeEach(async () => {
      concurrencyOverrides = [];
      const connection = new MockCDPConnection();
      connection.setSuccessHandler('Runtime.evaluate', ({expression}) => {
        assert.strictEqual(expression, 'navigator.hardwareConcurrency');
        return {result: {value: DEFAULT_CONCURRENCY, type: Protocol.Runtime.RemoteObjectType.Number}};
      });
      connection.setSuccessHandler('Emulation.setHardwareConcurrencyOverride', params => {
        concurrencyOverrides.push(params.hardwareConcurrency);
        return {};
      });
      const target = createTarget({connection});
      assert.exists(target.model(SDK.EmulationModel.EmulationModel));

      // The throttling manager singleton outlives the per-test SDK singletons,
      // so the view needs a fresh one to observe the target created above.
      MobileThrottling.ThrottlingManager.ThrottlingManager.instance({forceNew: true});
      view.detach();
      view = new Sensors.SensorsView.SensorsView();
      renderElementIntoDOM(view);
      await settled();
    });

    /** Waits for pending requests to the target and view updates. */
    async function settled(): Promise<void> {
      await raf();
      await UI.Widget.Widget.allUpdatesComplete;
    }

    function query<T extends HTMLElement>(selector: string): T {
      const element = view.contentElement.querySelector<T>(`.concurrency-section ${selector}`);
      assert.exists(element);
      return element;
    }

    const checkbox = (): UI.UIUtils.CheckboxLabel => query('devtools-checkbox');
    const numericInput = (): HTMLInputElement => query('.concurrency-details input');
    const resetButton = (): HTMLElement => query('[aria-label="Reset to the default value"]');
    const warning = (): HTMLElement =>
        query('[aria-label="Exceeding the default value may degrade system performance"]');
    const isVisible = (element: HTMLElement): boolean => getComputedStyle(element).visibility === 'visible';

    async function toggleOverride(checked: boolean): Promise<void> {
      checkbox().checked = checked;
      checkbox().dispatchEvent(new Event('change'));
      await settled();
    }

    async function setConcurrency(value: number): Promise<void> {
      numericInput().value = String(value);
      numericInput().dispatchEvent(new Event('input'));
      await settled();
    }

    it('shows the default hardware concurrency in a disabled input', () => {
      assert.isFalse(checkbox().disabled);
      assert.isFalse(checkbox().checked);
      assert.isTrue(numericInput().disabled);
      assert.strictEqual(numericInput().value, String(DEFAULT_CONCURRENCY));
      assert.isFalse(isVisible(resetButton()));
      assert.isFalse(isVisible(warning()));
    });

    it('overrides the hardware concurrency', async () => {
      await toggleOverride(true);
      assert.isFalse(numericInput().disabled);

      await setConcurrency(4);

      assert.strictEqual(concurrencyOverrides.at(-1), 4);
      assert.isTrue(isVisible(resetButton()));
      assert.isFalse(isVisible(warning()));
    });

    it('warns when the override exceeds the default', async () => {
      await toggleOverride(true);
      await setConcurrency(16);

      assert.strictEqual(concurrencyOverrides.at(-1), 16);
      assert.isTrue(isVisible(resetButton()));
      assert.isTrue(isVisible(warning()));
    });

    it('restores the default when the reset button is clicked', async () => {
      await toggleOverride(true);
      await setConcurrency(16);

      resetButton().click();
      await settled();

      assert.strictEqual(numericInput().value, String(DEFAULT_CONCURRENCY));
      assert.strictEqual(concurrencyOverrides.at(-1), DEFAULT_CONCURRENCY);
      assert.isFalse(isVisible(resetButton()));
      assert.isFalse(isVisible(warning()));
    });

    it('restores the default when the override is disabled', async () => {
      await toggleOverride(true);
      await setConcurrency(4);

      await toggleOverride(false);

      assert.isTrue(numericInput().disabled);
      assert.strictEqual(concurrencyOverrides.at(-1), DEFAULT_CONCURRENCY);
    });
  });

  describe('CPU Performance section', () => {
    let mockHostTier = CPUPerformanceTier.Ultra;

    beforeEach(async () => {
      // Set the default host tier to "Ultra".
      mockHostTier = CPUPerformanceTier.Ultra;
      const connection = new MockCDPConnection();
      connection.setSuccessHandler('Runtime.evaluate', ({expression}) => {
        assert.strictEqual(expression, 'navigator.cpuPerformance');
        return {
          result: {
            value: SDK.CPUThrottlingManager.tierToNumber(mockHostTier),
            type: Protocol.Runtime.RemoteObjectType.Number,
          },
        };
      });
      createTarget({connection});
      await CPUThrottlingManager.instance().updateHostDefaultCPUPerformanceTier();
      await UI.Widget.Widget.allUpdatesComplete;
    });

    it('shows the default host tier in "no-override" option label on startup', () => {
      const select = view.contentElement.querySelector('.cpu-performance-section select') as HTMLSelectElement;
      assert.exists(select);

      const option = select.querySelector('option[value="no-override"]') as HTMLOptionElement;
      assert.exists(option);
      assert.strictEqual(option.text, 'No override (Tier 4: ULTRA)');
      assert.strictEqual(CPUThrottlingManager.instance().effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);
    });

    it('updates emulation.cpu-performance setting and effective tier when dropdown value changes', () => {
      const select = view.contentElement.querySelector('.cpu-performance-section select') as HTMLSelectElement;
      assert.exists(select);

      select.value = 'mid';
      select.dispatchEvent(new Event('change'));

      const setting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.cpuPerformanceSettingDescriptor);
      assert.strictEqual(setting.get(), 'mid');
      assert.strictEqual(CPUThrottlingManager.instance().effectiveCPUPerformanceTier(), CPUPerformanceTier.Mid);
    });

    it('dynamically updates "no-override" label when host default tier changes', async () => {
      const select = view.contentElement.querySelector('.cpu-performance-section select') as HTMLSelectElement;
      assert.exists(select);

      const option = select.querySelector('option[value="no-override"]') as HTMLOptionElement;
      assert.exists(option);

      mockHostTier = CPUPerformanceTier.Low;
      await CPUThrottlingManager.instance().updateHostDefaultCPUPerformanceTier();

      assert.strictEqual(option.text, 'No override (Tier 1: LOW)');
      assert.strictEqual(CPUThrottlingManager.instance().effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);
    });

    it('dynamically updates "no-override" label when CPU throttling rate changes', () => {
      const select = view.contentElement.querySelector('.cpu-performance-section select') as HTMLSelectElement;
      assert.exists(select);

      const option = select.querySelector('option[value="no-override"]') as HTMLOptionElement;
      assert.exists(option);

      assert.strictEqual(option.text, 'No override (Tier 4: ULTRA)');

      CPUThrottlingManager.instance().setCPUThrottlingRate(4);
      assert.strictEqual(option.text, 'No override (Tier 2: MID)');
      assert.strictEqual(CPUThrottlingManager.instance().effectiveCPUPerformanceTier(), CPUPerformanceTier.Mid);

      CPUThrottlingManager.instance().setCPUThrottlingRate(1);
      assert.strictEqual(option.text, 'No override (Tier 4: ULTRA)');
      assert.strictEqual(CPUThrottlingManager.instance().effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);
    });

    it('dynamically updates "no-override" label when CPU throttling rate changes even with active override', () => {
      const select = view.contentElement.querySelector('.cpu-performance-section select') as HTMLSelectElement;
      assert.exists(select);

      const option = select.querySelector('option[value="no-override"]') as HTMLOptionElement;
      assert.exists(option);

      select.value = 'low';
      select.dispatchEvent(new Event('change'));
      assert.strictEqual(CPUThrottlingManager.instance().effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);
      assert.strictEqual(option.text, 'No override (Tier 4: ULTRA)');

      CPUThrottlingManager.instance().setCPUThrottlingRate(4);
      assert.strictEqual(CPUThrottlingManager.instance().effectiveCPUPerformanceTier(), CPUPerformanceTier.Low);
      assert.strictEqual(option.text, 'No override (Tier 2: MID)');
    });

    it('shows the throttled tier in "no-override" option label when throttling is active on startup', () => {
      CPUThrottlingManager.instance().setCPUThrottlingRate(4);

      const localView = new Sensors.SensorsView.SensorsView();

      const select = localView.contentElement.querySelector('.cpu-performance-section select') as HTMLSelectElement;
      assert.exists(select);

      const option = select.querySelector('option[value="no-override"]') as HTMLOptionElement;
      assert.exists(option);

      assert.strictEqual(option.text, 'No override (Tier 2: MID)');
      assert.strictEqual(CPUThrottlingManager.instance().effectiveCPUPerformanceTier(), CPUPerformanceTier.Mid);
    });

    it('resets effective tier when "no-override" is selected after an override', () => {
      const select = view.contentElement.querySelector('.cpu-performance-section select') as HTMLSelectElement;
      assert.exists(select);

      select.value = 'mid';
      select.dispatchEvent(new Event('change'));
      assert.strictEqual(CPUThrottlingManager.instance().effectiveCPUPerformanceTier(), CPUPerformanceTier.Mid);

      select.value = 'no-override';
      select.dispatchEvent(new Event('change'));
      assert.strictEqual(CPUThrottlingManager.instance().effectiveCPUPerformanceTier(), CPUPerformanceTier.Ultra);
    });
  });
});

describeWithEnvironment('SensorsView screenshots', () => {
  let view: Sensors.SensorsView.SensorsView;

  beforeEach(async () => {
    Common.Settings.Settings.instance().resolve(SettingsUI.EmulationSettings.emulationLocationsSettingDescriptor).set([{
      title: 'Berlin',
      lat: 52.52,
      long: 13.405,
      timezoneId: 'Europe/Berlin',
      locale: 'de-DE',
      accuracy: 50,
    }]);
    // The view is taller than the screenshot viewport. Render it at a fixed
    // size and let it scroll, like the drawer does.
    view = renderElementIntoDOM(new Sensors.SensorsView.SensorsView(),
                                {includeCommonStyles: true, width: 600, height: 480});
    view.element.style.overflowY = 'auto';
    await UI.Widget.Widget.allUpdatesComplete;
  });

  function select(selector: string, value: string): void {
    const element = view.contentElement.querySelector<HTMLSelectElement>(selector);
    assert.exists(element);
    const option = Array.from(element.options).find(option => option.value === value || option.text === value);
    assert.exists(option);
    element.selectedIndex = option.index;
    element.dispatchEvent(new Event('change'));
  }

  function finishAnimations(): void {
    for (const animation of view.contentElement.getAnimations({subtree: true})) {
      animation.finish();
    }
  }

  it('renders the default state', async () => {
    await assertScreenshot('sensors/SensorsView/default.png');
  });

  it('renders the settings sections', async () => {
    view.element.scrollTop = view.element.scrollHeight;
    await assertScreenshot('sensors/SensorsView/settings-sections.png');
  });

  it('renders a location override', async () => {
    select('.geo-fields select', 'Berlin');
    await UI.Widget.Widget.allUpdatesComplete;
    await assertScreenshot('sensors/SensorsView/location-override.png');
  });

  it('renders an orientation override', async () => {
    select('.orientation-fields select', '[90, 0, -90]');
    await UI.Widget.Widget.allUpdatesComplete;
    finishAnimations();
    await assertScreenshot('sensors/SensorsView/orientation-override.png');
  });
});
