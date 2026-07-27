// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sensors from './sensors.js';

describeWithEnvironment('LocationsSettingsTab', () => {
  let tab: Sensors.LocationsSettingsTab.LocationsSettingsTab;
  let customSetting: Common.Settings.Setting<Sensors.LocationsSettingsTab.LocationDescription[]>;

  beforeEach(async () => {
    customSetting = Common.Settings.Settings.instance().moduleSetting('emulation.locations');
    customSetting.set([]);

    tab = renderElementIntoDOM(new Sensors.LocationsSettingsTab.LocationsSettingsTab());
    tab.element.style.display = 'flex';
    tab.element.style.width = '780px';
    tab.element.style.height = '400px';
    await tab.updateComplete;
  });

  it('renders default empty state', async () => {
    await assertScreenshot('sensors/LocationsSettingsTab/empty.png');
  });

  it('renders populated custom locations list', async () => {
    customSetting.set([
      {
        title: 'London',
        lat: 51.5074,
        long: -0.1278,
        timezoneId: 'Europe/London',
        locale: 'en-GB',
        accuracy: 100,
      },
      {
        title: 'San Francisco',
        lat: 37.7749,
        long: -122.4194,
        timezoneId: 'America/Los_Angeles',
        locale: 'en-US',
        accuracy: 10,
      },
    ]);
    // The tab listens to setting change listeners, so it should auto-update.
    await tab.updateComplete;
    await assertScreenshot('sensors/LocationsSettingsTab/populated.png');
  });

  it('renders add location editor mode', async () => {
    const addButton = tab.contentElement.querySelector<HTMLElement>('.add-locations-button');
    assert.exists(addButton);
    addButton.click();
    await tab.updateComplete;

    await assertScreenshot('sensors/LocationsSettingsTab/add-editor.png');
  });

  it('renders edit location mode with validation errors', async () => {
    customSetting.set([
      {
        title: 'London',
        lat: 51.5074,
        long: -0.1278,
        timezoneId: 'Europe/London',
        locale: 'en-GB',
        accuracy: 100,
      },
    ]);
    await tab.updateComplete;

    const listWidgetElement = tab.contentElement.querySelector<HTMLElement>('.locations-list');
    assert.exists(listWidgetElement);
    assert.exists(listWidgetElement.shadowRoot);

    // Find the edit button inside the list item and click it
    const editButton = listWidgetElement.shadowRoot.querySelector<HTMLElement>('devtools-button[title="Edit"]');
    assert.exists(editButton);
    editButton.click();
    await tab.updateComplete;

    // Now let's enter an invalid latitude to trigger a validation error
    const latInput = listWidgetElement.shadowRoot.querySelector<HTMLInputElement>('input[placeholder="Latitude"]');
    assert.exists(latInput);
    latInput.value = '150';  // Invalid: max 90
    latInput.dispatchEvent(new Event('input'));

    // Trigger timezone ID error as well
    const tzInput = listWidgetElement.shadowRoot.querySelector<HTMLInputElement>('input[placeholder="Timezone ID"]');
    assert.exists(tzInput);
    tzInput.value = '123';  // Invalid: must contain alphabetic characters
    tzInput.dispatchEvent(new Event('input'));
    await tab.updateComplete;

    await assertScreenshot('sensors/LocationsSettingsTab/edit-editor-invalid.png');
  });
});

function getDialogContent(): HTMLElement {
  const content = UI.Dialog.Dialog.getInstance()?.contentElement;
  assert.exists(content);
  return content;
}

async function setupLocationDialog(input: Sensors.LocationsSettingsTab.LocationDialogInput, target: HTMLElement) {
  Sensors.LocationsSettingsTab.renderLocationDialog(input, target);
  await RenderCoordinator.done();
  await UI.Widget.Widget.allUpdatesComplete;
}

describeWithEnvironment('renderLocationDialog', () => {
  let target: HTMLElement;

  beforeEach(() => {
    target = document.createElement('div');
    renderElementIntoDOM(target, {includeCommonStyles: true});
  });

  it('renders in add mode with empty location inputs', async () => {
    await setupLocationDialog({
      location: {
        title: '',
        lat: 0,
        long: 0,
        timezoneId: '',
        locale: '',
        accuracy: 0,
      },
      isNew: true,
      onSave: () => {},
      onCancel: () => {},
      onValidateErrors: () => {},
    },
                              target);
    assert.isTrue(UI.Dialog.Dialog.hasInstance());
    assert.strictEqual(getDialogContent().querySelector('.dialog-title')?.textContent?.trim(), 'Add location');

    const titleInput = getDialogContent().querySelector<HTMLInputElement>('input[placeholder="Location name"]');
    assert.exists(titleInput);
    assert.strictEqual(titleInput.value, '');
  });

  it('renders in edit mode with existing location data', async () => {
    await setupLocationDialog({
      location: {
        title: 'London',
        lat: 51.5074,
        long: -0.1278,
        timezoneId: 'Europe/London',
        locale: 'en-GB',
        accuracy: 100,
      },
      isNew: false,
      onSave: () => {},
      onCancel: () => {},
      onValidateErrors: () => {},
    },
                              target);
    assert.isTrue(UI.Dialog.Dialog.hasInstance());
    assert.strictEqual(getDialogContent().querySelector('.dialog-title')?.textContent?.trim(), 'Edit location');

    const titleInput = getDialogContent().querySelector<HTMLInputElement>('input[placeholder="Location name"]');
    assert.exists(titleInput);
    assert.strictEqual(titleInput.value, 'London');

    const latInput = getDialogContent().querySelector<HTMLInputElement>('input[placeholder="Latitude"]');
    assert.exists(latInput);
    assert.strictEqual(latInput.value, '51.5074');
  });

  it('calls onValidateErrors when saving invalid input without calling onSave', async () => {
    const onSave = sinon.spy();
    const onValidateErrors = sinon.spy();

    await setupLocationDialog({
      location: {
        title: '',
        lat: 0,
        long: 0,
        timezoneId: '',
        locale: '',
        accuracy: 0,
      },
      isNew: true,
      onSave,
      onCancel: () => {},
      onValidateErrors,
    },
                              target);

    const saveButton = getDialogContent().querySelector<HTMLElement>('.save-button');
    assert.exists(saveButton);
    saveButton.click();

    sinon.assert.calledOnce(onValidateErrors);
    sinon.assert.notCalled(onSave);
    assert.strictEqual(onValidateErrors.firstCall.args[0].title, 'Location name can’t be empty');
  });

  it('renders validation errors when passed in input', async () => {
    await setupLocationDialog({
      location: {
        title: '',
        lat: 0,
        long: 0,
        timezoneId: '',
        locale: '',
        accuracy: 0,
      },
      isNew: true,
      errors: {
        title: 'Location name can’t be empty',
      },
      onSave: () => {},
      onCancel: () => {},
      onValidateErrors: () => {},
    },
                              target);

    const error = getDialogContent().querySelector('.editor-field-error');
    assert.exists(error);
    assert.strictEqual(error.textContent?.trim(), 'Location name can’t be empty');
  });

  it('calls onSave with updated location when inputs are valid', async () => {
    const onSave = sinon.spy();
    const onValidateErrors = sinon.spy();

    await setupLocationDialog({
      location: {
        title: 'Berlin',
        lat: 52.52,
        long: 13.405,
        timezoneId: 'Europe/Berlin',
        locale: 'de-DE',
        accuracy: 50,
      },
      isNew: true,
      onSave,
      onCancel: () => {},
      onValidateErrors,
    },
                              target);

    const saveButton = getDialogContent().querySelector<HTMLElement>('.save-button');
    assert.exists(saveButton);
    saveButton.click();

    sinon.assert.notCalled(onValidateErrors);
    sinon.assert.calledOnce(onSave);
    assert.deepEqual(onSave.firstCall.args[0], {
      title: 'Berlin',
      lat: 52.52,
      long: 13.405,
      timezoneId: 'Europe/Berlin',
      locale: 'de-DE',
      accuracy: 50,
    });
  });
});

describeWithEnvironment('renderLocationDialog screenshots', () => {
  let target: HTMLElement;

  beforeEach(() => {
    target = document.createElement('div');
    target.style.width = '580px';
    target.style.height = '530px';
    renderElementIntoDOM(target, {includeCommonStyles: true});
    UI.GlassPane.GlassPane.setContainer(target);
  });

  async function setupAndRenderDialog(input: Sensors.LocationsSettingsTab.LocationDialogInput) {
    await setupLocationDialog(input, target);
    assert.isTrue(UI.Dialog.Dialog.hasInstance());
    await raf();
    await RenderCoordinator.done();
  }

  it('renders add location view', async () => {
    await setupAndRenderDialog({
      location: {
        title: '',
        lat: 0,
        long: 0,
        timezoneId: '',
        locale: '',
        accuracy: 0,
      },
      isNew: true,
      onSave: () => {},
      onCancel: () => {},
      onValidateErrors: () => {},
    });
    await assertScreenshot('sensors/LocationsSettingsTab/location-dialog-add.png');
  });

  it('renders edit location view', async () => {
    await setupAndRenderDialog({
      location: {
        title: 'London',
        lat: 51.5074,
        long: -0.1278,
        timezoneId: 'Europe/London',
        locale: 'en-GB',
        accuracy: 100,
      },
      isNew: false,
      onSave: () => {},
      onCancel: () => {},
      onValidateErrors: () => {},
    });
    await assertScreenshot('sensors/LocationsSettingsTab/location-dialog-edit.png');
  });

  it('renders edit location view with errors', async () => {
    await setupAndRenderDialog({
      location: {
        title: '',
        lat: 0,
        long: 0,
        timezoneId: '',
        locale: '',
        accuracy: 0,
      },
      isNew: true,
      errors: {
        title: 'Location name can’t be empty',
      },
      onSave: () => {},
      onCancel: () => {},
      onValidateErrors: () => {},
    });
    await assertScreenshot('sensors/LocationsSettingsTab/location-dialog-errors.png');
  });
});
