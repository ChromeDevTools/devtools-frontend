// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as EmulationModel from '../../../models/emulation/emulation.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import type * as UI from '../../../ui/legacy/legacy.js';

import * as Emulation from './emulation.js';

const DevicesSettingsTab = Emulation.DevicesSettingsTab.DevicesSettingsTab;

function createCustomDevice(): EmulationModel.EmulatedDevices.EmulatedDevice {
  const device = new EmulationModel.EmulatedDevices.EmulatedDevice();
  device.title = 'Test phone';
  device.deviceScaleFactor = 3;
  device.userAgent = 'Mozilla/5.0';
  device.vertical.width = 390;
  device.vertical.height = 844;
  device.horizontal.width = 844;
  device.horizontal.height = 390;
  device.capabilities = [
    EmulationModel.EmulatedDevices.Capability.MOBILE,
    EmulationModel.EmulatedDevices.Capability.TOUCH,
  ];
  device.modes = [
    {
      title: '',
      orientation: EmulationModel.EmulatedDevices.Vertical,
      insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),
      image: null,
    },
    {
      title: '',
      orientation: EmulationModel.EmulatedDevices.Horizontal,
      insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),
      image: null,
    },
  ];
  return device;
}

function input(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
               name: string): HTMLInputElement {
  return editor.control(name) as HTMLInputElement;
}

function requestValidation(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
                           device = createCustomDevice()): void {
  editor.beginEdit(device, 0, 'Commit', () => {}, () => {});
  editor.requestValidation();
}

function fillFields(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
                    fieldValues: Record<string, string>): void {
  for (const [controlName, value] of Object.entries(fieldValues)) {
    input(editor, controlName).value = value;
  }
}

describeWithEnvironment('DevicesSettingsTab', () => {
  it('instantiates and renders categorized device groups without orphan node errors', () => {
    const tab = new DevicesSettingsTab();
    tab.markAsRoot();
    renderElementIntoDOM(tab);

    const groupTitles = tab.contentElement.querySelectorAll('.device-group-title');
    const titles = [...groupTitles].map(el => el.textContent);
    assert.include(titles, 'Mobile');
    assert.include(titles, 'Foldables');
    assert.include(titles, 'Tablets & Desktops');
    assert.include(titles, 'Smart Displays');

    tab.detach();
  });

  it('saves portrait and landscape safe-area values on their corresponding modes', () => {
    const tab = new DevicesSettingsTab();
    const device = createCustomDevice();
    const editor = tab.beginEdit(device);

    fillFields(editor, {
      'safe-area-left': '1',
      'safe-area-top': '47',
      'safe-area-right': '2',
      'safe-area-bottom': '34',
      'landscape-safe-area-left': '47',
      'landscape-safe-area-top': '0',
      'landscape-safe-area-right': '47',
      'landscape-safe-area-bottom': '21',
    });

    tab.commitEdit(device, editor, false);

    assert.deepEqual(device.modes[0].safeAreaInsets, new EmulationModel.DeviceModeModel.Insets(1, 47, 2, 34));
    assert.deepEqual(device.modes[1].safeAreaInsets, new EmulationModel.DeviceModeModel.Insets(47, 0, 47, 21));
  });

  it('treats blank safe-area fields as zero', () => {
    const tab = new DevicesSettingsTab();
    const device = createCustomDevice();
    const editor = tab.beginEdit(device);

    fillFields(editor, {
      'safe-area-left': '10',
      'safe-area-top': '',
      'safe-area-right': '20',
      'safe-area-bottom': '',
      'landscape-safe-area-left': '',
      'landscape-safe-area-top': '5',
      'landscape-safe-area-right': '',
      'landscape-safe-area-bottom': '15',
    });

    tab.commitEdit(device, editor, false);

    assert.deepEqual(device.modes[0].safeAreaInsets, new EmulationModel.DeviceModeModel.Insets(10, 0, 20, 0));
    assert.deepEqual(device.modes[1].safeAreaInsets, new EmulationModel.DeviceModeModel.Insets(0, 5, 0, 15));
  });

  it('does not persist out-of-range safe-area values', () => {
    const tab = new DevicesSettingsTab();
    const device = createCustomDevice();
    const editor = tab.beginEdit(device);
    const unsafeInteger = String(Number.MAX_SAFE_INTEGER + 1);
    const infiniteInteger = '9'.repeat(309);
    assert.isFalse(Number.isSafeInteger(Number(unsafeInteger)));
    assert.strictEqual(Number(infiniteInteger), Infinity);
    fillFields(editor, {'safe-area-left': unsafeInteger, 'landscape-safe-area-top': infiniteInteger});

    tab.commitEdit(device, editor, false);

    assert.isUndefined(device.modes[0].safeAreaInsets);
    assert.isUndefined(device.modes[1].safeAreaInsets);
    const serializedDevice = JSON.stringify(device.toJSON());
    assert.notInclude(serializedDevice, 'safe-area-insets');
    assert.isNotNull(EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(JSON.parse(serializedDevice)));
  });

  it('rejects invalid and out-of-range safe-area values', () => {
    const unsafeInteger = String(Number.MAX_SAFE_INTEGER + 1);
    const infiniteInteger = '9'.repeat(309);
    assert.isFalse(Number.isSafeInteger(Number(unsafeInteger)));
    assert.strictEqual(Number(infiniteInteger), Infinity);
    for (const invalidValue of ['-1', '1.5', 'not-a-number', unsafeInteger, infiniteInteger]) {
      const editor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      input(editor, 'safe-area-top').value = invalidValue;

      requestValidation(editor);

      assert.strictEqual(input(editor, 'safe-area-top').getAttribute('aria-invalid'), 'true');
      assert.include(editor.element.textContent || '',
                     'Portrait safe area: Top inset must be an integer from 0 to 9999.');
      const commitButton =
          [...editor.element.querySelectorAll<HTMLElement&{disabled: boolean}>('devtools-button')].find(
              button => button.textContent === 'Commit');
      assert.isTrue(commitButton?.disabled);
    }
  });

  it('populates saved safe-area values when editing a custom device', () => {
    const tab = new DevicesSettingsTab();
    const device = createCustomDevice();
    device.modes[0].safeAreaInsets = new EmulationModel.DeviceModeModel.Insets(1, 47, 2, 34);
    device.modes[1].safeAreaInsets = new EmulationModel.DeviceModeModel.Insets(47, 0, 47, 21);

    const editor = tab.beginEdit(device);

    assert.deepEqual(
        [
          input(editor, 'safe-area-left').value,
          input(editor, 'safe-area-top').value,
          input(editor, 'safe-area-right').value,
          input(editor, 'safe-area-bottom').value,
        ],
        ['1', '47', '2', '34']);
    assert.deepEqual(
        [
          input(editor, 'landscape-safe-area-left').value,
          input(editor, 'landscape-safe-area-top').value,
          input(editor, 'landscape-safe-area-right').value,
          input(editor, 'landscape-safe-area-bottom').value,
        ],
        ['47', '', '47', '21']);
  });

  it('provides accessible names and orientation groups for safe-area fields', () => {
    const editor = new DevicesSettingsTab().beginEdit(createCustomDevice());

    assert.strictEqual(input(editor, 'safe-area-top').getAttribute('aria-label'), 'Top inset');
    assert.strictEqual(input(editor, 'landscape-safe-area-left').getAttribute('aria-label'), 'Left inset');
    const portraitGroup = input(editor, 'safe-area-top').closest('[role="group"]');
    const landscapeGroup = input(editor, 'landscape-safe-area-left').closest('[role="group"]');
    assert.strictEqual(portraitGroup?.getAttribute('aria-labelledby'), portraitGroup?.querySelector('b')?.id);
    assert.strictEqual(portraitGroup?.querySelector('b')?.textContent, 'Portrait safe area');
    assert.strictEqual(landscapeGroup?.getAttribute('aria-labelledby'), landscapeGroup?.querySelector('b')?.id);
    assert.strictEqual(landscapeGroup?.querySelector('b')?.textContent, 'Landscape safe area');
    assert.notStrictEqual(portraitGroup?.getAttribute('aria-labelledby'),
                          landscapeGroup?.getAttribute('aria-labelledby'));
  });
});
