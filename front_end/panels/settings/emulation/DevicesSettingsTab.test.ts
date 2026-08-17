// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as EmulationModel from '../../../models/emulation/emulation.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
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

    },
    {
      title: '',
      orientation: EmulationModel.EmulatedDevices.Horizontal,
      insets: new EmulationModel.DeviceModeModel.Insets(0, 0, 0, 0),

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

function validationErrorCount(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>): number {
  const errorContainer = editor.element.querySelector('.list-widget-input-validation-error');
  return errorContainer?.textContent ? errorContainer.querySelectorAll('br').length + 1 : 0;
}

function fillFields(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
                    fieldValues: Record<string, string>): void {
  for (const [controlName, value] of Object.entries(fieldValues)) {
    input(editor, controlName).value = value;
  }
}

function fillCutoutRect(editor: UI.ListWidget.Editor<EmulationModel.EmulatedDevices.EmulatedDevice>,
                        values: {x?: string, y?: string, width?: string, height?: string} = {}): void {
  fillFields(editor, {
    'cutout-x': values.x ?? '0',
    'cutout-y': values.y ?? '0',
    'cutout-width': values.width ?? '162',
    'cutout-height': values.height ?? '34',
  });
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

  it('omits safe-area and cutout fields when mobile safe area emulation is disabled', () => {
    updateHostConfig({
      devToolsMobileSafeAreaEmulation: {enabled: false},
    });
    const tab = new DevicesSettingsTab();
    const device = createCustomDevice();
    const editor = tab.beginEdit(device);
    assert.throws(() => editor.control('safe-area-left'));
    assert.throws(() => editor.control('cutout-shape'));
  });

  describe('custom device safe-area and cutout fields', () => {
    beforeEach(() => {
      updateHostConfig({
        devToolsMobileSafeAreaEmulation: {enabled: true},
      });
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

    it('keeps a saved zero-valued cutout valid through the editor lifecycle', () => {
      const tab = new DevicesSettingsTab();
      const device = createCustomDevice();
      device.modes[0].cutout = {
        shape: EmulationModel.EmulatedDevices.CutoutShape.NOTCH,
        x: 0,
        y: 0,
        width: 162,
        height: 34,
        upperRadius: 0,
        lowerRadius: 0,
      };

      const editor = tab.beginEdit(device);
      requestValidation(editor, device);

      assert.deepEqual(
          ['cutout-x', 'cutout-y', 'cutout-upper-radius', 'cutout-lower-radius'].map(name => input(editor, name).value),
          ['0', '0', '0', '0']);
      assert.strictEqual(validationErrorCount(editor), 0);
      const commitButton = editor.element.querySelector('.editor-buttons devtools-button:last-child') as HTMLElement &
          {disabled: boolean};
      assert.isFalse(commitButton.disabled);
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

    it('omits cutout data when no cutout is selected', () => {
      const tab = new DevicesSettingsTab();
      const device = createCustomDevice();
      device.modes[0].cutout = CUTOUT_CASES[0].cutout;
      const editor = tab.beginEdit(device);

      select(editor, 'cutout-shape').value = 'none';
      fillFields(editor, {'cutout-x': '-1', 'cutout-radius': '-1'});
      requestValidation(editor, device);
      tab.commitEdit(device, editor, false);

      assert.notInclude(editor.element.textContent || '', 'must be an integer from 0 to 9999.');
      assert.isUndefined(device.modes[0].safeAreaInsets);
      assert.isUndefined(device.modes[1].safeAreaInsets);
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

    it('provides accessible names, orientation groups, and validation announcements', () => {
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

      fillFields(editor, {'safe-area-left': '300', 'safe-area-right': '300'});
      requestValidation(editor);
      const error = editor.element.querySelector('.list-widget-input-validation-error');

      assert.strictEqual(input(editor, 'safe-area-right').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(error?.getAttribute('role'), 'alert');
      assert.strictEqual(error?.getAttribute('aria-live'), 'polite');
      assert.include(error?.textContent || '',
                     'Portrait safe area: Left and right insets must not exceed the device width.');
    });

    it('validates portrait and landscape safe areas against their orientation dimensions', () => {
      const portraitEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      fillFields(portraitEditor, {'safe-area-left': '300', 'safe-area-right': '300'});
      requestValidation(portraitEditor);
      assert.include(portraitEditor.element.textContent || '',
                     'Portrait safe area: Left and right insets must not exceed the device width.');
      assert.strictEqual(validationErrorCount(portraitEditor), 1);
      assert.strictEqual(input(portraitEditor, 'safe-area-right').getAttribute('aria-invalid'), 'true');
      for (const controlName of ['safe-area-left', 'safe-area-top', 'safe-area-bottom']) {
        assert.isNull(input(portraitEditor, controlName).getAttribute('aria-invalid'));
      }

      const landscapeEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      fillFields(landscapeEditor, {'landscape-safe-area-top': '300', 'landscape-safe-area-bottom': '300'});
      requestValidation(landscapeEditor);
      assert.include(landscapeEditor.element.textContent || '',
                     'Landscape safe area: Top and bottom insets must not exceed the device height.');
      assert.strictEqual(validationErrorCount(landscapeEditor), 1);
      assert.strictEqual(input(landscapeEditor, 'landscape-safe-area-bottom').getAttribute('aria-invalid'), 'true');
      for (const controlName of ['landscape-safe-area-left', 'landscape-safe-area-top', 'landscape-safe-area-right']) {
        assert.isNull(input(landscapeEditor, controlName).getAttribute('aria-invalid'));
      }
    });

    it('validates each safe-area axis independently', () => {
      const horizontalEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      fillFields(horizontalEditor, {'safe-area-left': '300', 'safe-area-right': '300', 'safe-area-top': '-1'});
      requestValidation(horizontalEditor);
      assert.strictEqual(validationErrorCount(horizontalEditor), 2);
      assert.strictEqual(input(horizontalEditor, 'safe-area-top').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(input(horizontalEditor, 'safe-area-right').getAttribute('aria-invalid'), 'true');
      assert.include(horizontalEditor.element.textContent || '',
                     'Portrait safe area: Left and right insets must not exceed the device width.');

      const verticalEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      fillFields(verticalEditor, {'safe-area-left': '-1', 'safe-area-top': '500', 'safe-area-bottom': '500'});
      requestValidation(verticalEditor);
      assert.strictEqual(validationErrorCount(verticalEditor), 2);
      assert.strictEqual(input(verticalEditor, 'safe-area-left').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(input(verticalEditor, 'safe-area-bottom').getAttribute('aria-invalid'), 'true');
      assert.include(verticalEditor.element.textContent || '',
                     'Portrait safe area: Top and bottom insets must not exceed the device height.');
    });

    it('distinguishes simultaneous portrait and landscape safe-area errors', () => {
      const editor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      fillFields(editor, {
        'safe-area-left': '300',
        'safe-area-right': '300',
        'landscape-safe-area-top': '300',
        'landscape-safe-area-bottom': '300',
      });
      requestValidation(editor);

      const errorText = editor.element.querySelector('.list-widget-input-validation-error')?.textContent || '';
      assert.include(errorText, 'Portrait safe area: Left and right insets must not exceed the device width.');
      assert.include(errorText, 'Landscape safe area: Top and bottom insets must not exceed the device height.');
      assert.strictEqual(validationErrorCount(editor), 2);
      assert.strictEqual(input(editor, 'safe-area-right').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(input(editor, 'landscape-safe-area-bottom').getAttribute('aria-invalid'), 'true');
    });

    it('requires the base and shape-specific fields for an enabled cutout', () => {
      const baseEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      select(baseEditor, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.PILL;
      requestValidation(baseEditor);
      assert.include(baseEditor.element.textContent || '', 'Cutout x is required when display cutout is enabled.');

      const shapeCases: Array<{
        shape: EmulationModel.EmulatedDevices.CutoutShape,
        fields: Record<string, string>,
        expectedError: string,
      }> =
          [
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.PILL,
              fields: {},
              expectedError: 'Pill radius is required when display cutout is enabled.',
            },
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.NOTCH,
              fields: {'cutout-lower-radius': '22'},
              expectedError: 'Upper radius is required when display cutout is enabled.',
            },
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.NOTCH,
              fields: {'cutout-upper-radius': '5'},
              expectedError: 'Lower radius is required when display cutout is enabled.',
            },
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.CIRCLE,
              fields: {'cutout-cy': '26', 'cutout-radius': '13'},
              expectedError: 'Center x is required when display cutout is enabled.',
            },
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.CIRCLE,
              fields: {'cutout-cx': '27', 'cutout-radius': '13'},
              expectedError: 'Center y is required when display cutout is enabled.',
            },
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.CIRCLE,
              fields: {'cutout-cx': '27', 'cutout-cy': '26'},
              expectedError: 'Radius is required when display cutout is enabled.',
            },
          ];
      for (const shapeCase of shapeCases) {
        const editor = new DevicesSettingsTab().beginEdit(createCustomDevice());
        select(editor, 'cutout-shape').value = shapeCase.shape;
        fillCutoutRect(editor);
        fillFields(editor, shapeCase.fields);
        requestValidation(editor);
        assert.include(editor.element.textContent || '', shapeCase.expectedError);
      }

      const rectangleEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      select(rectangleEditor, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.RECTANGLE;
      fillCutoutRect(rectangleEditor);
      fillFields(rectangleEditor, {
        'cutout-border-radius': '-1',
        'cutout-upper-radius': '-1',
        'cutout-lower-radius': '-1',
        'cutout-cx': '-1',
        'cutout-cy': '-1',
        'cutout-radius': '-1',
      });
      requestValidation(rectangleEditor);
      assert.notInclude(rectangleEditor.element.textContent || '', 'is required when display cutout is enabled.');
      assert.notInclude(rectangleEditor.element.textContent || '', 'must be an integer from 0 to 9999.');
    });

    it('requires positive cutout dimensions and circle radius', () => {
      const widthEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      select(widthEditor, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.PILL;
      fillCutoutRect(widthEditor, {width: '0', height: '37'});
      input(widthEditor, 'cutout-border-radius').value = '19';
      requestValidation(widthEditor);
      assert.include(widthEditor.element.textContent || '', 'Cutout width must be a positive integer.');

      const heightEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      select(heightEditor, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.PILL;
      fillCutoutRect(heightEditor, {width: '125', height: '0'});
      input(heightEditor, 'cutout-border-radius').value = '19';
      requestValidation(heightEditor);
      assert.include(heightEditor.element.textContent || '', 'Cutout height must be a positive integer.');

      const circleEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      select(circleEditor, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.CIRCLE;
      fillCutoutRect(circleEditor, {width: '55', height: '52'});
      fillFields(circleEditor, {'cutout-cx': '27', 'cutout-cy': '26', 'cutout-radius': '0'});
      requestValidation(circleEditor);
      assert.include(circleEditor.element.textContent || '', 'Radius must be a positive integer.');
    });

    it('rejects invalid and out-of-range cutout values', () => {
      const unsafeInteger = String(Number.MAX_SAFE_INTEGER + 1);
      const infiniteInteger = '9'.repeat(309);
      assert.isFalse(Number.isSafeInteger(Number(unsafeInteger)));
      assert.strictEqual(Number(infiniteInteger), Infinity);
      const invalidValues = [
        ['cutout-x', '-1', 'Cutout x must be an integer from 0 to 9999.'],
        ['cutout-width', '1.5', 'Cutout width must be an integer from 0 to 9999.'],
        ['cutout-border-radius', 'not-a-number', 'Pill radius must be an integer from 0 to 9999.'],
        ['cutout-border-radius', '10000', 'Pill radius must be an integer from 0 to 9999.'],
        ['cutout-border-radius', unsafeInteger, 'Pill radius must be an integer from 0 to 9999.'],
        ['cutout-upper-radius', infiniteInteger, 'Upper radius must be an integer from 0 to 9999.'],
      ];
      for (const [controlName, invalidValue, expectedError] of invalidValues) {
        const editor = new DevicesSettingsTab().beginEdit(createCustomDevice());
        const shape = controlName === 'cutout-upper-radius' ? EmulationModel.EmulatedDevices.CutoutShape.NOTCH :
                                                              EmulationModel.EmulatedDevices.CutoutShape.PILL;
        select(editor, 'cutout-shape').value = shape;
        fillCutoutRect(editor, {width: '125', height: '37'});
        input(editor, 'cutout-border-radius').value = '19';
        fillFields(editor, {'cutout-upper-radius': '5', 'cutout-lower-radius': '22'});
        input(editor, controlName).value = invalidValue;
        requestValidation(editor);
        assert.include(editor.element.textContent || '', expectedError);
        assert.strictEqual(input(editor, controlName).getAttribute('aria-invalid'), 'true');
        const commitButton = editor.element.querySelector('.editor-buttons devtools-button:last-child') as HTMLElement &
            {disabled: boolean};
        assert.isTrue(commitButton.disabled);
      }
    });

    it('clears errors from fields that become inactive after a shape change', () => {
      const editor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      const shape = select(editor, 'cutout-shape');
      shape.value = EmulationModel.EmulatedDevices.CutoutShape.CIRCLE;
      fillCutoutRect(editor, {width: '55', height: '52'});
      fillFields(editor, {
        'cutout-border-radius': '19',
        'cutout-cx': '27',
        'cutout-cy': '26',
        'cutout-radius': '10000',
      });
      requestValidation(editor);
      assert.strictEqual(input(editor, 'cutout-radius').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(validationErrorCount(editor), 1);

      shape.value = EmulationModel.EmulatedDevices.CutoutShape.PILL;
      shape.dispatchEvent(new Event('input'));

      assert.isTrue(input(editor, 'cutout-radius').hidden);
      assert.isNull(input(editor, 'cutout-radius').getAttribute('aria-invalid'));
      assert.strictEqual(validationErrorCount(editor), 0);
    });

    it('validates cutout geometry against the portrait device and circle cutout bounds', () => {
      const deviceEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      select(deviceEditor, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.NOTCH;
      fillCutoutRect(deviceEditor, {x: '300'});
      fillFields(deviceEditor, {'cutout-upper-radius': '5', 'cutout-lower-radius': '22'});
      requestValidation(deviceEditor);
      assert.include(deviceEditor.element.textContent || '', 'Cutout x plus width must not exceed the device width.');
      assert.strictEqual(validationErrorCount(deviceEditor), 1);
      assert.strictEqual(input(deviceEditor, 'cutout-width').getAttribute('aria-invalid'), 'true');
      assert.isNull(select(deviceEditor, 'cutout-shape').getAttribute('aria-invalid'));
      for (const controlName
               of ['cutout-x', 'cutout-y', 'cutout-height', 'cutout-upper-radius', 'cutout-lower-radius']) {
        assert.isNull(input(deviceEditor, controlName).getAttribute('aria-invalid'));
      }

      const verticalOverflowEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      select(verticalOverflowEditor, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.NOTCH;
      fillCutoutRect(verticalOverflowEditor, {y: '820', width: '125', height: '37'});
      fillFields(verticalOverflowEditor, {'cutout-upper-radius': '5', 'cutout-lower-radius': '22'});
      requestValidation(verticalOverflowEditor);
      assert.include(verticalOverflowEditor.element.textContent || '',
                     'Cutout y plus height must not exceed the device height.');
      assert.strictEqual(validationErrorCount(verticalOverflowEditor), 1);
      assert.strictEqual(input(verticalOverflowEditor, 'cutout-height').getAttribute('aria-invalid'), 'true');
      assert.isNull(input(verticalOverflowEditor, 'cutout-width').getAttribute('aria-invalid'));
      assert.isNull(select(verticalOverflowEditor, 'cutout-shape').getAttribute('aria-invalid'));

      const circleCases = [
        {'cutout-cx': '100', 'cutout-cy': '26', 'cutout-radius': '13'},
        {'cutout-cx': '27', 'cutout-cy': '26', 'cutout-radius': '28'},
      ];
      for (const circleFields of circleCases) {
        const circleEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
        select(circleEditor, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.CIRCLE;
        fillCutoutRect(circleEditor, {width: '55', height: '52'});
        fillFields(circleEditor, circleFields);
        requestValidation(circleEditor);
        assert.include(circleEditor.element.textContent || '', 'Circle must fit within the cutout bounds.');
        assert.notInclude(circleEditor.element.textContent || '',
                          'Cutout x plus width must not exceed the device width.');
        assert.notInclude(circleEditor.element.textContent || '',
                          'Cutout y plus height must not exceed the device height.');
        assert.strictEqual(validationErrorCount(circleEditor), 1);
        assert.strictEqual(input(circleEditor, 'cutout-radius').getAttribute('aria-invalid'), 'true');
        assert.isNull(select(circleEditor, 'cutout-shape').getAttribute('aria-invalid'));
        for (const controlName of ['cutout-x', 'cutout-y', 'cutout-width', 'cutout-height', 'cutout-cx', 'cutout-cy']) {
          assert.isNull(input(circleEditor, controlName).getAttribute('aria-invalid'));
        }
      }

      for (const {cutout, fields} of CUTOUT_CASES) {
        const oversizedDimensions: Array<Record<string, string>> = [{'cutout-width': '391'}, {'cutout-height': '845'}];
        for (const oversizedDimension of oversizedDimensions) {
          const editor = new DevicesSettingsTab().beginEdit(createCustomDevice());
          select(editor, 'cutout-shape').value = cutout.shape;
          fillFields(editor, {...fields, ...oversizedDimension});
          requestValidation(editor);
          const expectedInvalidControl = 'cutout-width' in oversizedDimension ? 'cutout-width' : 'cutout-height';
          const expectedError = 'cutout-width' in oversizedDimension ?
              'Cutout x plus width must not exceed the device width.' :
              'Cutout y plus height must not exceed the device height.';
          assert.include(editor.element.textContent || '', expectedError);
          assert.strictEqual(validationErrorCount(editor), 1);
          assert.strictEqual(input(editor, expectedInvalidControl).getAttribute('aria-invalid'), 'true');
          assert.isNull(select(editor, 'cutout-shape').getAttribute('aria-invalid'));
        }
      }

      const bothAxesEditor = new DevicesSettingsTab().beginEdit(createCustomDevice());
      select(bothAxesEditor, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.RECTANGLE;
      fillCutoutRect(bothAxesEditor, {x: '300', y: '800', width: '125', height: '100'});
      requestValidation(bothAxesEditor);
      assert.include(bothAxesEditor.element.textContent || '', 'Cutout x plus width must not exceed the device width.');
      assert.include(bothAxesEditor.element.textContent || '',
                     'Cutout y plus height must not exceed the device height.');
      assert.strictEqual(validationErrorCount(bothAxesEditor), 2);
      assert.strictEqual(input(bothAxesEditor, 'cutout-width').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(input(bothAxesEditor, 'cutout-height').getAttribute('aria-invalid'), 'true');
    });
  });
});
