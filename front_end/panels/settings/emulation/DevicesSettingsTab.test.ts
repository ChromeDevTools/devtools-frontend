// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';

import * as EmulationModel from '../../../models/emulation/emulation.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../../testing/EnvironmentHelpers.js';

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
    },
    {
      title: '',
      orientation: EmulationModel.EmulatedDevices.Horizontal,
    },
  ];
  return device;
}

async function beginEdit(
    device = createCustomDevice(),
    tab = new DevicesSettingsTab(),
    ): Promise<Emulation.DevicesSettingsTab.DevicesSettingsTab> {
  tab.beginEdit(device);
  await tab.updateComplete;
  return tab;
}

function input(tab: Emulation.DevicesSettingsTab.DevicesSettingsTab, name: string): HTMLInputElement {
  const control = tab.contentElement.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!control) {
    throw new Error(`Control with name ${name} does not exist, please verify.`);
  }
  return control;
}

function select(tab: Emulation.DevicesSettingsTab.DevicesSettingsTab, name: string): HTMLSelectElement {
  const control = tab.contentElement.querySelector<HTMLSelectElement>(`select[name="${name}"]`);
  if (!control) {
    throw new Error(`Control with name ${name} does not exist, please verify.`);
  }
  return control;
}

function syncControls(tab: Emulation.DevicesSettingsTab.DevicesSettingsTab): void {
  for (const control of tab.contentElement.querySelectorAll<HTMLInputElement|HTMLSelectElement>(
           '.editor-container input[name], .editor-container select[name]')) {
    control.dispatchEvent(new Event('input', {bubbles: true}));
  }
}

async function requestValidation(tab: Emulation.DevicesSettingsTab.DevicesSettingsTab): Promise<void> {
  syncControls(tab);
  await tab.updateComplete;
}

async function commitEdit(tab: Emulation.DevicesSettingsTab.DevicesSettingsTab): Promise<void> {
  syncControls(tab);
  tab.commitEdit();
  await tab.updateComplete;
}

function validationErrorCount(tab: Emulation.DevicesSettingsTab.DevicesSettingsTab): number {
  const errorContainer = tab.contentElement.querySelector('.list-widget-input-validation-error');
  return errorContainer?.textContent ? errorContainer.querySelectorAll('br').length + 1 : 0;
}

function fillFields(
    tab: Emulation.DevicesSettingsTab.DevicesSettingsTab,
    fieldValues: Record<string, string>,
    ): void {
  for (const [controlName, value] of Object.entries(fieldValues)) {
    const control = input(tab, controlName);
    control.value = value;
    control.dispatchEvent(new Event('input', {bubbles: true}));
  }
}

function fillCutoutRect(
    tab: Emulation.DevicesSettingsTab.DevicesSettingsTab,
    values: {x?: string, y?: string, width?: string, height?: string} = {},
    ): void {
  fillFields(tab, {
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
  it('instantiates and renders categorized device groups without orphan node errors', async () => {
    const tab = new DevicesSettingsTab();
    renderElementIntoDOM(tab);
    await tab.updateComplete;

    const groupTitles = tab.contentElement.querySelectorAll('.device-group-title');
    const titles = [...groupTitles].map(el => el.textContent);
    assert.include(titles, 'Mobile');
    assert.include(titles, 'Foldables');
    assert.include(titles, 'Tablets & Desktops');
    assert.include(titles, 'Smart Displays');
  });

  it('omits safe-area and cutout fields when mobile safe area emulation is disabled', async () => {
    updateHostConfig({
      devToolsMobileSafeAreaEmulation: {enabled: false},
    });
    const tab = await beginEdit(createCustomDevice());
    assert.throws(() => input(tab, 'safe-area-left'));
    assert.throws(() => select(tab, 'cutout-shape'));
  });

  describe('custom device safe-area and cutout fields', () => {
    beforeEach(() => {
      updateHostConfig({
        devToolsMobileSafeAreaEmulation: {enabled: true},
      });
    });

    it('saves portrait and landscape safe-area values on their corresponding modes', async () => {
      const device = createCustomDevice();
      const tab = await beginEdit(device);

      fillFields(tab, {
        'safe-area-left': '1',
        'safe-area-top': '47',
        'safe-area-right': '2',
        'safe-area-bottom': '34',
        'landscape-safe-area-left': '47',
        'landscape-safe-area-top': '0',
        'landscape-safe-area-right': '47',
        'landscape-safe-area-bottom': '21',
      });

      await commitEdit(tab);

      assert.deepEqual(device.modes[0].safeAreaInsets, new EmulationModel.DeviceModeModel.Insets(1, 47, 2, 34));
      assert.deepEqual(device.modes[1].safeAreaInsets, new EmulationModel.DeviceModeModel.Insets(47, 0, 47, 21));
    });

    it('treats blank safe-area fields as zero', async () => {
      const device = createCustomDevice();
      const tab = await beginEdit(device);

      fillFields(tab, {
        'safe-area-left': '10',
        'safe-area-top': '',
        'safe-area-right': '20',
        'safe-area-bottom': '',
        'landscape-safe-area-left': '',
        'landscape-safe-area-top': '5',
        'landscape-safe-area-right': '',
        'landscape-safe-area-bottom': '15',
      });

      await commitEdit(tab);

      assert.deepEqual(device.modes[0].safeAreaInsets, new EmulationModel.DeviceModeModel.Insets(10, 0, 20, 0));
      assert.deepEqual(device.modes[1].safeAreaInsets, new EmulationModel.DeviceModeModel.Insets(0, 5, 0, 15));
    });

    it('does not persist out-of-range safe-area values', async () => {
      const device = createCustomDevice();
      const tab = await beginEdit(device);
      const unsafeInteger = String(Number.MAX_SAFE_INTEGER + 1);
      const infiniteInteger = '9'.repeat(309);
      assert.isFalse(Number.isSafeInteger(Number(unsafeInteger)));
      assert.strictEqual(Number(infiniteInteger), Infinity);
      fillFields(tab, {'safe-area-left': unsafeInteger, 'landscape-safe-area-top': infiniteInteger});

      await commitEdit(tab);

      assert.isUndefined(device.modes[0].safeAreaInsets);
      assert.isUndefined(device.modes[1].safeAreaInsets);
      const serializedDevice = JSON.stringify(device.toJSON());
      assert.notInclude(serializedDevice, 'safe-area-insets');
      assert.isNotNull(EmulationModel.EmulatedDevices.EmulatedDevice.fromJSONV1(JSON.parse(serializedDevice)));
    });

    it('rejects invalid and out-of-range safe-area values', async () => {
      const unsafeInteger = String(Number.MAX_SAFE_INTEGER + 1);
      const infiniteInteger = '9'.repeat(309);
      assert.isFalse(Number.isSafeInteger(Number(unsafeInteger)));
      assert.strictEqual(Number(infiniteInteger), Infinity);
      for (const invalidValue of ['-1', '1.5', 'not-a-number', unsafeInteger, infiniteInteger]) {
        const tab = await beginEdit(createCustomDevice());
        input(tab, 'safe-area-top').value = invalidValue;

        await requestValidation(tab);

        assert.strictEqual(input(tab, 'safe-area-top').getAttribute('aria-invalid'), 'true');
        assert.include(tab.contentElement.textContent || '',
                       'Portrait safe area: Top inset must be an integer from 0 to 9999');
        const commitButton = tab.contentElement.querySelector<HTMLElement&{disabled: boolean}>(
            '.editor-buttons devtools-button:last-child');
        assert.isNotNull(commitButton);
        assert.isTrue(commitButton.disabled);
      }
    });

    for (const {cutout, fields} of CUTOUT_CASES) {
      it(`saves a ${cutout.shape} cutout with only its shape-specific fields`, async () => {
        const device = createCustomDevice();
        const tab = await beginEdit(device);

        select(tab, 'cutout-shape').value = cutout.shape;
        fillFields(tab, {
          'cutout-border-radius': '99',
          'cutout-upper-radius': '99',
          'cutout-lower-radius': '99',
          'cutout-cx': '99',
          'cutout-cy': '99',
          'cutout-radius': '99',
          ...fields,
        });

        await commitEdit(tab);

        assert.deepEqual(device.modes[0].cutout, cutout);
        assert.isUndefined(device.modes[1].cutout);
      });

      it(`populates a saved ${cutout.shape} cutout`, async () => {
        const device = createCustomDevice();
        device.modes[0].cutout = cutout;

        const tab = await beginEdit(device);

        assert.strictEqual(select(tab, 'cutout-shape').value, cutout.shape);
        for (const [controlName, expectedValue] of Object.entries(fields)) {
          assert.strictEqual(input(tab, controlName).value, expectedValue);
        }
      });
    }

    it('keeps a saved zero-valued cutout valid through the editor lifecycle', async () => {
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

      const tab = await beginEdit(device);
      await requestValidation(tab);

      assert.deepEqual(
          ['cutout-x', 'cutout-y', 'cutout-upper-radius', 'cutout-lower-radius'].map(name => input(tab, name).value),
          ['0', '0', '0', '0']);
      assert.strictEqual(validationErrorCount(tab), 0);
      const commitButton = tab.contentElement.querySelector<HTMLElement&{disabled: boolean}>(
          '.editor-buttons devtools-button:last-child');
      assert.isNotNull(commitButton);
      assert.isFalse(commitButton.disabled);
    });

    it('populates saved safe-area values when editing a custom device', async () => {
      const device = createCustomDevice();
      device.modes[0].safeAreaInsets = new EmulationModel.DeviceModeModel.Insets(1, 47, 2, 34);
      device.modes[1].safeAreaInsets = new EmulationModel.DeviceModeModel.Insets(47, 0, 47, 21);

      const tab = await beginEdit(device);

      assert.deepEqual(
          [
            input(tab, 'safe-area-left').value,
            input(tab, 'safe-area-top').value,
            input(tab, 'safe-area-right').value,
            input(tab, 'safe-area-bottom').value,
          ],
          ['1', '47', '2', '34']);
      assert.deepEqual(
          [
            input(tab, 'landscape-safe-area-left').value,
            input(tab, 'landscape-safe-area-top').value,
            input(tab, 'landscape-safe-area-right').value,
            input(tab, 'landscape-safe-area-bottom').value,
          ],
          ['47', '', '47', '21']);
    });

    it('omits cutout data when no cutout is selected', async () => {
      const device = createCustomDevice();
      device.modes[0].cutout = CUTOUT_CASES[0].cutout;
      const tab = await beginEdit(device);

      select(tab, 'cutout-shape').value = 'none';
      fillFields(tab, {'cutout-x': '-1', 'cutout-radius': '-1'});
      await requestValidation(tab);
      await commitEdit(tab);

      assert.notInclude(tab.contentElement.textContent || '', 'must be an integer from 0 to 9999');
      assert.isUndefined(device.modes[0].safeAreaInsets);
      assert.isUndefined(device.modes[1].safeAreaInsets);
      assert.isUndefined(device.modes[0].cutout);
    });

    it('exposes every supported cutout shape', async () => {
      const tab = await beginEdit(createCustomDevice());

      assert.deepEqual(
          [...select(tab, 'cutout-shape').options].map(option => [option.value, option.textContent?.trim()]), [
            ['none', 'No cutout'],
            [EmulationModel.EmulatedDevices.CutoutShape.PILL, 'Pill'],
            [EmulationModel.EmulatedDevices.CutoutShape.NOTCH, 'Notch'],
            [EmulationModel.EmulatedDevices.CutoutShape.CIRCLE, 'Circle'],
            [EmulationModel.EmulatedDevices.CutoutShape.RECTANGLE, 'Rectangle'],
          ]);
    });

    it('shows only fields that apply to the selected cutout shape', async () => {
      const tab = await beginEdit(createCustomDevice());
      const shape = select(tab, 'cutout-shape');
      const rectRow = input(tab, 'cutout-x').closest<HTMLElement>('.devices-edit-cutout-rect-row');
      const radiusRow = input(tab, 'cutout-border-radius').closest<HTMLElement>('.devices-edit-cutout-radius-row');
      assert.isNotNull(rectRow);
      assert.isNotNull(radiusRow);
      const shapeSpecificControls = [
        'cutout-border-radius',
        'cutout-upper-radius',
        'cutout-lower-radius',
        'cutout-cx',
        'cutout-cy',
        'cutout-radius',
      ];

      async function showShape(value: string): Promise<void> {
        shape.value = value;
        shape.dispatchEvent(new Event('input'));
        await tab.updateComplete;
      }

      function visibleShapeSpecificControls(): string[] {
        return shapeSpecificControls.filter(controlName => !input(tab, controlName).hidden);
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
        await showShape(shapeValue);
        assert.isFalse(rectRow.hidden);
        assert.strictEqual(radiusRow.hidden, radiusRowHidden);
        assert.deepEqual(visibleShapeSpecificControls(), [...visibleControls]);
      }

      await showShape('none');
      assert.isTrue(rectRow.hidden);
      assert.isTrue(radiusRow.hidden);
      assert.deepEqual(visibleShapeSpecificControls(), []);
    });

    it('populates the validation alert once when the cutout shape changes', async () => {
      const tab = await beginEdit(createCustomDevice());
      const shape = select(tab, 'cutout-shape');
      const validationAlert = tab.contentElement.querySelector<HTMLElement>('.list-widget-input-validation-error');
      assert.isNotNull(validationAlert);
      let alertPopulationCount = 0;
      const countAddedNodeMutations = (records: MutationRecord[]): void => {
        alertPopulationCount += records.filter(mutation => mutation.addedNodes.length > 0).length;
      };
      const observer = new MutationObserver(countAddedNodeMutations);
      observer.observe(validationAlert, {childList: true});

      fillFields(tab, {
        'cutout-x': '0',
        'cutout-y': '0',
        'cutout-width': '125',
        'cutout-height': '37',
        'cutout-border-radius': '19',
        'user-agent': '',
      });
      shape.value = EmulationModel.EmulatedDevices.CutoutShape.PILL;
      shape.dispatchEvent(new Event('input'));
      await tab.updateComplete;

      countAddedNodeMutations(observer.takeRecords());
      observer.disconnect();
      assert.strictEqual(alertPopulationCount, 1);
      assert.include(validationAlert.textContent || '', 'User agent string can’t be empty');
      assert.isFalse(input(tab, 'cutout-border-radius').hidden);
    });

    it('provides accessible names, orientation groups, and validation announcements', async () => {
      const tab = await beginEdit(createCustomDevice());

      assert.strictEqual(input(tab, 'safe-area-top').getAttribute('aria-label'), 'Top inset');
      assert.strictEqual(input(tab, 'landscape-safe-area-left').getAttribute('aria-label'), 'Left inset');
      const portraitGroup = input(tab, 'safe-area-top').closest('[role="group"]');
      const landscapeGroup = input(tab, 'landscape-safe-area-left').closest('[role="group"]');
      assert.strictEqual(portraitGroup?.getAttribute('aria-labelledby'), portraitGroup?.querySelector('b')?.id);
      assert.strictEqual(portraitGroup?.querySelector('b')?.textContent, 'Portrait safe area');
      assert.strictEqual(landscapeGroup?.getAttribute('aria-labelledby'), landscapeGroup?.querySelector('b')?.id);
      assert.strictEqual(landscapeGroup?.querySelector('b')?.textContent, 'Landscape safe area');
      assert.notStrictEqual(portraitGroup?.getAttribute('aria-labelledby'),
                            landscapeGroup?.getAttribute('aria-labelledby'));
      const cutoutShape = select(tab, 'cutout-shape');
      const cutoutGroup = cutoutShape.closest('[role="group"]');
      assert.strictEqual(cutoutGroup?.getAttribute('aria-labelledby'), cutoutGroup?.querySelector('b')?.id);
      assert.strictEqual(cutoutGroup?.querySelector('b')?.textContent, 'Display cutout');
      assert.strictEqual(cutoutShape.getAttribute('aria-label'), 'Display cutout');
      assert.strictEqual(input(tab, 'cutout-width').getAttribute('aria-label'), 'Cutout width');
      assert.strictEqual(input(tab, 'cutout-cx').getAttribute('aria-label'), 'Center x');

      fillFields(tab, {'safe-area-left': '300', 'safe-area-right': '300'});
      await requestValidation(tab);
      const error = tab.contentElement.querySelector('.list-widget-input-validation-error');

      assert.strictEqual(input(tab, 'safe-area-right').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(error?.getAttribute('role'), 'alert');
      assert.strictEqual(error?.getAttribute('aria-live'), 'polite');
      assert.include(error?.textContent || '',
                     'Portrait safe area: Left and right insets mustn’t exceed the device width');
    });

    it('validates portrait and landscape safe areas against their orientation dimensions', async () => {
      const portraitTab = await beginEdit(createCustomDevice());
      fillFields(portraitTab, {'safe-area-left': '300', 'safe-area-right': '300'});
      await requestValidation(portraitTab);
      assert.include(portraitTab.contentElement.textContent || '',
                     'Portrait safe area: Left and right insets mustn’t exceed the device width');
      assert.strictEqual(validationErrorCount(portraitTab), 1);
      assert.strictEqual(input(portraitTab, 'safe-area-right').getAttribute('aria-invalid'), 'true');
      for (const controlName of ['safe-area-left', 'safe-area-top', 'safe-area-bottom']) {
        assert.isNull(input(portraitTab, controlName).getAttribute('aria-invalid'));
      }

      const landscapeTab = await beginEdit(createCustomDevice());
      fillFields(landscapeTab, {'landscape-safe-area-top': '300', 'landscape-safe-area-bottom': '300'});
      await requestValidation(landscapeTab);
      assert.include(landscapeTab.contentElement.textContent || '',
                     'Landscape safe area: Top and bottom insets mustn’t exceed the device height');
      assert.strictEqual(validationErrorCount(landscapeTab), 1);
      assert.strictEqual(input(landscapeTab, 'landscape-safe-area-bottom').getAttribute('aria-invalid'), 'true');
      for (const controlName of ['landscape-safe-area-left', 'landscape-safe-area-top', 'landscape-safe-area-right']) {
        assert.isNull(input(landscapeTab, controlName).getAttribute('aria-invalid'));
      }
    });

    it('validates each safe-area axis independently', async () => {
      const horizontalTab = await beginEdit(createCustomDevice());
      fillFields(horizontalTab, {'safe-area-left': '300', 'safe-area-right': '300', 'safe-area-top': '-1'});
      await requestValidation(horizontalTab);
      assert.strictEqual(validationErrorCount(horizontalTab), 2);
      assert.strictEqual(input(horizontalTab, 'safe-area-top').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(input(horizontalTab, 'safe-area-right').getAttribute('aria-invalid'), 'true');
      assert.include(horizontalTab.contentElement.textContent || '',
                     'Portrait safe area: Left and right insets mustn’t exceed the device width');

      const verticalTab = await beginEdit(createCustomDevice());
      fillFields(verticalTab, {'safe-area-left': '-1', 'safe-area-top': '500', 'safe-area-bottom': '500'});
      await requestValidation(verticalTab);
      assert.strictEqual(validationErrorCount(verticalTab), 2);
      assert.strictEqual(input(verticalTab, 'safe-area-left').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(input(verticalTab, 'safe-area-bottom').getAttribute('aria-invalid'), 'true');
      assert.include(verticalTab.contentElement.textContent || '',
                     'Portrait safe area: Top and bottom insets mustn’t exceed the device height');
    });

    it('distinguishes simultaneous portrait and landscape safe-area errors', async () => {
      const tab = await beginEdit(createCustomDevice());
      fillFields(tab, {
        'safe-area-left': '300',
        'safe-area-right': '300',
        'landscape-safe-area-top': '300',
        'landscape-safe-area-bottom': '300',
      });
      await requestValidation(tab);

      const errorText = tab.contentElement.querySelector('.list-widget-input-validation-error')?.textContent || '';
      assert.include(errorText, 'Portrait safe area: Left and right insets mustn’t exceed the device width');
      assert.include(errorText, 'Landscape safe area: Top and bottom insets mustn’t exceed the device height');
      assert.strictEqual(validationErrorCount(tab), 2);
      assert.strictEqual(input(tab, 'safe-area-right').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(input(tab, 'landscape-safe-area-bottom').getAttribute('aria-invalid'), 'true');
    });

    it('requires the base and shape-specific fields for an enabled cutout', async () => {
      const baseTab = await beginEdit(createCustomDevice());
      select(baseTab, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.PILL;
      await requestValidation(baseTab);
      assert.include(baseTab.contentElement.textContent || '', 'Cutout x is required when display cutout is enabled');

      const shapeCases: Array<{
        shape: EmulationModel.EmulatedDevices.CutoutShape,
        fields: Record<string, string>,
        expectedError: string,
      }> =
          [
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.PILL,
              fields: {},
              expectedError: 'Pill radius is required when display cutout is enabled',
            },
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.NOTCH,
              fields: {'cutout-lower-radius': '22'},
              expectedError: 'Upper radius is required when display cutout is enabled',
            },
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.NOTCH,
              fields: {'cutout-upper-radius': '5'},
              expectedError: 'Lower radius is required when display cutout is enabled',
            },
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.CIRCLE,
              fields: {'cutout-cy': '26', 'cutout-radius': '13'},
              expectedError: 'Center x is required when display cutout is enabled',
            },
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.CIRCLE,
              fields: {'cutout-cx': '27', 'cutout-radius': '13'},
              expectedError: 'Center y is required when display cutout is enabled',
            },
            {
              shape: EmulationModel.EmulatedDevices.CutoutShape.CIRCLE,
              fields: {'cutout-cx': '27', 'cutout-cy': '26'},
              expectedError: 'Radius is required when display cutout is enabled',
            },
          ];
      for (const shapeCase of shapeCases) {
        const tab = await beginEdit(createCustomDevice());
        select(tab, 'cutout-shape').value = shapeCase.shape;
        fillCutoutRect(tab);
        fillFields(tab, shapeCase.fields);
        await requestValidation(tab);
        assert.include(tab.contentElement.textContent || '', shapeCase.expectedError);
      }

      const rectangleTab = await beginEdit(createCustomDevice());
      select(rectangleTab, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.RECTANGLE;
      fillCutoutRect(rectangleTab);
      fillFields(rectangleTab, {
        'cutout-border-radius': '-1',
        'cutout-upper-radius': '-1',
        'cutout-lower-radius': '-1',
        'cutout-cx': '-1',
        'cutout-cy': '-1',
        'cutout-radius': '-1',
      });
      await requestValidation(rectangleTab);
      assert.notInclude(rectangleTab.contentElement.textContent || '', 'is required when display cutout is enabled');
      assert.notInclude(rectangleTab.contentElement.textContent || '', 'must be an integer from 0 to 9999');
    });

    it('requires positive cutout dimensions and circle radius', async () => {
      const widthTab = await beginEdit(createCustomDevice());
      select(widthTab, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.PILL;
      fillCutoutRect(widthTab, {width: '0', height: '37'});
      input(widthTab, 'cutout-border-radius').value = '19';
      await requestValidation(widthTab);
      assert.include(widthTab.contentElement.textContent || '', 'Cutout width must be a positive integer');

      const heightTab = await beginEdit(createCustomDevice());
      select(heightTab, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.PILL;
      fillCutoutRect(heightTab, {width: '125', height: '0'});
      input(heightTab, 'cutout-border-radius').value = '19';
      await requestValidation(heightTab);
      assert.include(heightTab.contentElement.textContent || '', 'Cutout height must be a positive integer');

      const circleTab = await beginEdit(createCustomDevice());
      select(circleTab, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.CIRCLE;
      fillCutoutRect(circleTab, {width: '55', height: '52'});
      fillFields(circleTab, {'cutout-cx': '27', 'cutout-cy': '26', 'cutout-radius': '0'});
      await requestValidation(circleTab);
      assert.include(circleTab.contentElement.textContent || '', 'Radius must be a positive integer');
    });

    it('rejects invalid and out-of-range cutout values', async () => {
      const unsafeInteger = String(Number.MAX_SAFE_INTEGER + 1);
      const infiniteInteger = '9'.repeat(309);
      assert.isFalse(Number.isSafeInteger(Number(unsafeInteger)));
      assert.strictEqual(Number(infiniteInteger), Infinity);
      const invalidValues = [
        ['cutout-x', '-1', 'Cutout x must be an integer from 0 to 9999'],
        ['cutout-width', '1.5', 'Cutout width must be an integer from 0 to 9999'],
        ['cutout-border-radius', 'not-a-number', 'Pill radius must be an integer from 0 to 9999'],
        ['cutout-border-radius', '10000', 'Pill radius must be an integer from 0 to 9999'],
        ['cutout-border-radius', unsafeInteger, 'Pill radius must be an integer from 0 to 9999'],
        ['cutout-upper-radius', infiniteInteger, 'Upper radius must be an integer from 0 to 9999'],
      ];
      for (const [controlName, invalidValue, expectedError] of invalidValues) {
        const tab = await beginEdit(createCustomDevice());
        const shape = controlName === 'cutout-upper-radius' ? EmulationModel.EmulatedDevices.CutoutShape.NOTCH :
                                                              EmulationModel.EmulatedDevices.CutoutShape.PILL;
        select(tab, 'cutout-shape').value = shape;
        fillCutoutRect(tab, {width: '125', height: '37'});
        input(tab, 'cutout-border-radius').value = '19';
        fillFields(tab, {'cutout-upper-radius': '5', 'cutout-lower-radius': '22'});
        input(tab, controlName).value = invalidValue;
        await requestValidation(tab);
        assert.include(tab.contentElement.textContent || '', expectedError);
        assert.strictEqual(input(tab, controlName).getAttribute('aria-invalid'), 'true');
        const commitButton = tab.contentElement.querySelector<HTMLElement&{disabled: boolean}>(
            '.editor-buttons devtools-button:last-child');
        assert.isNotNull(commitButton);
        assert.isTrue(commitButton.disabled);
      }
    });

    it('clears errors from fields that become inactive after a shape change', async () => {
      const tab = await beginEdit(createCustomDevice());
      const shape = select(tab, 'cutout-shape');
      shape.value = EmulationModel.EmulatedDevices.CutoutShape.CIRCLE;
      fillCutoutRect(tab, {width: '55', height: '52'});
      fillFields(tab, {
        'cutout-border-radius': '19',
        'cutout-cx': '27',
        'cutout-cy': '26',
        'cutout-radius': '10000',
      });
      await requestValidation(tab);
      assert.strictEqual(input(tab, 'cutout-radius').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(validationErrorCount(tab), 1);

      shape.value = EmulationModel.EmulatedDevices.CutoutShape.PILL;
      shape.dispatchEvent(new Event('input'));
      await tab.updateComplete;

      assert.isTrue(input(tab, 'cutout-radius').hidden);
      assert.isNull(input(tab, 'cutout-radius').getAttribute('aria-invalid'));
      assert.strictEqual(validationErrorCount(tab), 0);
    });

    it('validates cutout geometry against the portrait device and circle cutout bounds', async () => {
      const deviceTab = await beginEdit(createCustomDevice());
      select(deviceTab, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.NOTCH;
      fillCutoutRect(deviceTab, {x: '300'});
      fillFields(deviceTab, {'cutout-upper-radius': '5', 'cutout-lower-radius': '22'});
      await requestValidation(deviceTab);
      assert.include(deviceTab.contentElement.textContent || '', 'Cutout x plus width mustn’t exceed the device width');
      assert.strictEqual(validationErrorCount(deviceTab), 1);
      assert.strictEqual(input(deviceTab, 'cutout-width').getAttribute('aria-invalid'), 'true');
      assert.isNull(select(deviceTab, 'cutout-shape').getAttribute('aria-invalid'));
      for (const controlName
               of ['cutout-x', 'cutout-y', 'cutout-height', 'cutout-upper-radius', 'cutout-lower-radius']) {
        assert.isNull(input(deviceTab, controlName).getAttribute('aria-invalid'));
      }

      const verticalOverflowTab = await beginEdit(createCustomDevice());
      select(verticalOverflowTab, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.NOTCH;
      fillCutoutRect(verticalOverflowTab, {y: '820', width: '125', height: '37'});
      fillFields(verticalOverflowTab, {'cutout-upper-radius': '5', 'cutout-lower-radius': '22'});
      await requestValidation(verticalOverflowTab);
      assert.include(verticalOverflowTab.contentElement.textContent || '',
                     'Cutout y plus height mustn’t exceed the device height');
      assert.strictEqual(validationErrorCount(verticalOverflowTab), 1);
      assert.strictEqual(input(verticalOverflowTab, 'cutout-height').getAttribute('aria-invalid'), 'true');
      assert.isNull(input(verticalOverflowTab, 'cutout-width').getAttribute('aria-invalid'));
      assert.isNull(select(verticalOverflowTab, 'cutout-shape').getAttribute('aria-invalid'));

      const circleCases = [
        {'cutout-cx': '100', 'cutout-cy': '26', 'cutout-radius': '13'},
        {'cutout-cx': '27', 'cutout-cy': '26', 'cutout-radius': '28'},
      ];
      for (const circleFields of circleCases) {
        const circleTab = await beginEdit(createCustomDevice());
        select(circleTab, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.CIRCLE;
        fillCutoutRect(circleTab, {width: '55', height: '52'});
        fillFields(circleTab, circleFields);
        await requestValidation(circleTab);
        assert.include(circleTab.contentElement.textContent || '', 'Circle must fit within the cutout bounds');
        assert.notInclude(circleTab.contentElement.textContent || '',
                          'Cutout x plus width mustn’t exceed the device width');
        assert.notInclude(circleTab.contentElement.textContent || '',
                          'Cutout y plus height mustn’t exceed the device height');
        assert.strictEqual(validationErrorCount(circleTab), 1);
        assert.strictEqual(input(circleTab, 'cutout-radius').getAttribute('aria-invalid'), 'true');
        assert.isNull(select(circleTab, 'cutout-shape').getAttribute('aria-invalid'));
        for (const controlName of ['cutout-x', 'cutout-y', 'cutout-width', 'cutout-height', 'cutout-cx', 'cutout-cy']) {
          assert.isNull(input(circleTab, controlName).getAttribute('aria-invalid'));
        }
      }

      for (const {cutout, fields} of CUTOUT_CASES) {
        const oversizedDimensions: Array<Record<string, string>> = [{'cutout-width': '391'}, {'cutout-height': '845'}];
        for (const oversizedDimension of oversizedDimensions) {
          const tab = await beginEdit(createCustomDevice());
          select(tab, 'cutout-shape').value = cutout.shape;
          fillFields(tab, {...fields, ...oversizedDimension});
          await requestValidation(tab);
          const expectedInvalidControl = 'cutout-width' in oversizedDimension ? 'cutout-width' : 'cutout-height';
          const expectedError = 'cutout-width' in oversizedDimension ?
              'Cutout x plus width mustn’t exceed the device width' :
              'Cutout y plus height mustn’t exceed the device height';
          assert.include(tab.contentElement.textContent || '', expectedError);
          assert.strictEqual(validationErrorCount(tab), 1);
          assert.strictEqual(input(tab, expectedInvalidControl).getAttribute('aria-invalid'), 'true');
          assert.isNull(select(tab, 'cutout-shape').getAttribute('aria-invalid'));
        }
      }

      const bothAxesTab = await beginEdit(createCustomDevice());
      select(bothAxesTab, 'cutout-shape').value = EmulationModel.EmulatedDevices.CutoutShape.RECTANGLE;
      fillCutoutRect(bothAxesTab, {x: '300', y: '800', width: '125', height: '100'});
      await requestValidation(bothAxesTab);
      assert.include(bothAxesTab.contentElement.textContent || '',
                     'Cutout x plus width mustn’t exceed the device width');
      assert.include(bothAxesTab.contentElement.textContent || '',
                     'Cutout y plus height mustn’t exceed the device height');
      assert.strictEqual(validationErrorCount(bothAxesTab), 2);
      assert.strictEqual(input(bothAxesTab, 'cutout-width').getAttribute('aria-invalid'), 'true');
      assert.strictEqual(input(bothAxesTab, 'cutout-height').getAttribute('aria-invalid'), 'true');
    });
  });
});
