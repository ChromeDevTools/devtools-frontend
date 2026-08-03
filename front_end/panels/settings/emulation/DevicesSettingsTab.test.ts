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

function select(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
                name: string): HTMLSelectElement {
  return editor.control(name) as HTMLSelectElement;
}

function fillFields(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
                    fieldValues: Record<string, string>): void {
  for (const [controlName, value] of Object.entries(fieldValues)) {
    input(editor, controlName).value = value;
  }
}

interface CutoutCase {
  cutout: EmulationModel.EmulatedDevices.Cutout;
  fields: Record<string, string>;
}

const CUTOUT_CASES: CutoutCase[] = [
  {
    cutout: {
      shape: EmulationModel.EmulatedDevices.CutoutShape.PILL,
      x: 134,
      y: 11,
      width: 125,
      height: 37,
      borderRadius: 19,
    },
    fields: {
      'cutout-x': '134',
      'cutout-y': '11',
      'cutout-width': '125',
      'cutout-height': '37',
      'cutout-border-radius': '19',
    },
  },
  {
    cutout: {
      shape: EmulationModel.EmulatedDevices.CutoutShape.NOTCH,
      x: 114,
      y: 0,
      width: 162,
      height: 34,
      upperRadius: 5,
      lowerRadius: 22,
    },
    fields: {
      'cutout-x': '114',
      'cutout-y': '0',
      'cutout-width': '162',
      'cutout-height': '34',
      'cutout-upper-radius': '5',
      'cutout-lower-radius': '22',
    },
  },
  {
    cutout: {
      shape: EmulationModel.EmulatedDevices.CutoutShape.CIRCLE,
      x: 183,
      y: 0,
      width: 55,
      height: 52,
      cx: 206,
      cy: 26,
      radius: 13,
    },
    fields: {
      'cutout-x': '183',
      'cutout-y': '0',
      'cutout-width': '55',
      'cutout-height': '52',
      'cutout-cx': '206',
      'cutout-cy': '26',
      'cutout-radius': '13',
    },
  },
  {
    cutout: {
      shape: EmulationModel.EmulatedDevices.CutoutShape.RECTANGLE,
      x: 126,
      y: 0,
      width: 141,
      height: 45,
    },
    fields: {
      'cutout-x': '126',
      'cutout-y': '0',
      'cutout-width': '141',
      'cutout-height': '45',
    },
  },
];

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

  for (const {cutout, fields} of CUTOUT_CASES) {
    it(`saves a ${cutout.shape} cutout with only its shape-specific fields`, () => {
      const tab = new DevicesSettingsTab();
      const device = createCustomDevice();
      const editor = tab.beginEdit(device);

      select(editor, 'cutout-shape').value = cutout.shape;
      fillFields(editor, {
        'cutout-border-radius': '99',
        'cutout-upper-radius': '99',
        'cutout-lower-radius': '99',
        'cutout-cx': '99',
        'cutout-cy': '99',
        'cutout-radius': '99',
        ...fields,
      });

      tab.commitEdit(device, editor, false);

      assert.deepEqual(device.modes[0].cutout, cutout);
      assert.isUndefined(device.modes[1].cutout);
    });

    it(`populates a saved ${cutout.shape} cutout`, () => {
      const tab = new DevicesSettingsTab();
      const device = createCustomDevice();
      device.modes[0].cutout = cutout;

      const editor = tab.beginEdit(device);

      assert.strictEqual(select(editor, 'cutout-shape').value, cutout.shape);
      for (const [controlName, expectedValue] of Object.entries(fields)) {
        assert.strictEqual(input(editor, controlName).value, expectedValue);
      }
    });
  }

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

  it('omits cutout data when no cutout is selected', () => {
    const tab = new DevicesSettingsTab();
    const device = createCustomDevice();
    device.modes[0].cutout = CUTOUT_CASES[0].cutout;
    const editor = tab.beginEdit(device);

    select(editor, 'cutout-shape').value = 'none';
    tab.commitEdit(device, editor, false);

    assert.isUndefined(device.modes[0].cutout);
  });

  it('exposes every supported cutout shape', () => {
    const editor = new DevicesSettingsTab().beginEdit(createCustomDevice());

    assert.deepEqual([...select(editor, 'cutout-shape').options].map(option => [option.value, option.textContent]), [
      ['none', 'No cutout'],
      [EmulationModel.EmulatedDevices.CutoutShape.PILL, 'Pill'],
      [EmulationModel.EmulatedDevices.CutoutShape.NOTCH, 'Notch'],
      [EmulationModel.EmulatedDevices.CutoutShape.CIRCLE, 'Circle'],
      [EmulationModel.EmulatedDevices.CutoutShape.RECTANGLE, 'Rectangle'],
    ]);
  });

  it('shows only fields that apply to the selected cutout shape', () => {
    const editor = new DevicesSettingsTab().beginEdit(createCustomDevice());
    const shape = select(editor, 'cutout-shape');
    const rectRow = input(editor, 'cutout-x').closest('.devices-edit-cutout-rect-row') as HTMLElement;
    const radiusRow = input(editor, 'cutout-border-radius').closest('.devices-edit-cutout-radius-row') as HTMLElement;
    const shapeSpecificControls = [
      'cutout-border-radius',
      'cutout-upper-radius',
      'cutout-lower-radius',
      'cutout-cx',
      'cutout-cy',
      'cutout-radius',
    ];

    function showShape(value: string): void {
      shape.value = value;
      shape.dispatchEvent(new Event('input'));
    }

    function visibleShapeSpecificControls(): string[] {
      return shapeSpecificControls.filter(controlName => !input(editor, controlName).hidden);
    }

    assert.isTrue(rectRow.hidden);
    assert.isTrue(radiusRow.hidden);
    assert.deepEqual(visibleShapeSpecificControls(), []);

    const expectations = [
      [EmulationModel.EmulatedDevices.CutoutShape.PILL, ['cutout-border-radius'], false],
      [EmulationModel.EmulatedDevices.CutoutShape.NOTCH, ['cutout-upper-radius', 'cutout-lower-radius'], false],
      [EmulationModel.EmulatedDevices.CutoutShape.CIRCLE, ['cutout-cx', 'cutout-cy', 'cutout-radius'], false],
      [EmulationModel.EmulatedDevices.CutoutShape.RECTANGLE, [], true],
    ] as const;
    for (const [shapeValue, visibleControls, radiusRowHidden] of expectations) {
      showShape(shapeValue);
      assert.isFalse(rectRow.hidden);
      assert.strictEqual(radiusRow.hidden, radiusRowHidden);
      assert.deepEqual(visibleShapeSpecificControls(), [...visibleControls]);
    }

    showShape('none');
    assert.isTrue(rectRow.hidden);
    assert.isTrue(radiusRow.hidden);
    assert.deepEqual(visibleShapeSpecificControls(), []);
  });

  it('populates the validation alert once when the cutout shape changes', () => {
    const editor = new DevicesSettingsTab().beginEdit(createCustomDevice());
    const shape = select(editor, 'cutout-shape');
    fillFields(editor, {
      'cutout-x': '0',
      'cutout-y': '0',
      'cutout-width': '125',
      'cutout-height': '37',
      'cutout-border-radius': '19',
      'user-agent': '',
    });
    const validationAlert = editor.element.querySelector<HTMLElement>('.list-widget-input-validation-error');
    assert.isNotNull(validationAlert);
    const observer = new MutationObserver(() => {});
    observer.observe(validationAlert, {childList: true});

    shape.value = EmulationModel.EmulatedDevices.CutoutShape.PILL;
    shape.dispatchEvent(new Event('input'));

    const alertPopulationCount = observer.takeRecords().filter(mutation => mutation.addedNodes.length > 0).length;
    observer.disconnect();
    assert.strictEqual(alertPopulationCount, 1);
    assert.include(validationAlert.textContent || '', 'User agent string can’t be empty.');
    assert.isFalse(input(editor, 'cutout-border-radius').hidden);
  });

  it('provides accessible names and orientation groups for safe-area and cutout fields', () => {
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
    const cutoutShape = select(editor, 'cutout-shape');
    const cutoutGroup = cutoutShape.closest('[role="group"]');
    assert.strictEqual(cutoutGroup?.getAttribute('aria-labelledby'), cutoutGroup?.querySelector('b')?.id);
    assert.strictEqual(cutoutGroup?.querySelector('b')?.textContent, 'Display cutout');
    assert.strictEqual(cutoutShape.getAttribute('aria-label'), 'Display cutout');
    assert.strictEqual(input(editor, 'cutout-width').getAttribute('aria-label'), 'Cutout width');
    assert.strictEqual(input(editor, 'cutout-cx').getAttribute('aria-label'), 'Center x');
  });
});
