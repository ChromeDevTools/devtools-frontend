// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {waitForDomNodeToBeVisible} from '../../e2e/helpers/elements-helpers.js';
import {
  clickZoomDropDown,
  openDeviceToolbar,
  selectDevice,
  selectEdit,
  selectTestDevice,
} from '../../e2e/helpers/emulation-helpers.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const ADD_DEVICE_BUTTON_SELECTOR = '#custom-device-add-button';
const FOCUSED_DEVICE_NAME_FIELD_SELECTOR = '#custom-device-name-field:focus';
const EDITOR_ADD_BUTTON_SELECTOR = '.editor-buttons > devtools-button:nth-of-type(2)';

async function elementTextContent(element: puppeteer.ElementHandle): Promise<string> {
  return await element.evaluate(node => node.textContent || '');
}

async function targetTextContent(selector: string, inspectedPage: InspectedPage): Promise<string> {
  const handle = await inspectedPage.waitForSelector(selector);
  assert.isOk(handle, `targetTextContent: could not find element for ${selector}`);
  return await elementTextContent(handle);
}

describe('Custom devices', () => {
  async function navigateAndOpeDeviceToolbar(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await inspectedPage.goToResource('emulation/custom-ua-ch.html');
    await devToolsPage.waitFor('.tabbed-pane-left-toolbar');
    await openDeviceToolbar(devToolsPage, inspectedPage);
  }

  it('can add and then edit a custom device with UA-CH emulation', async ({devToolsPage, inspectedPage}) => {
    await navigateAndOpeDeviceToolbar(devToolsPage, inspectedPage);
    await selectEdit(devToolsPage);
    await devToolsPage.click(ADD_DEVICE_BUTTON_SELECTOR);
    await devToolsPage.waitFor(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);
    await devToolsPage.typeText('Test device');

    await devToolsPage.tabForward();  // Focus width.
    await devToolsPage.tabForward();  // Focus height.
    await devToolsPage.tabForward();  // Focus DPR.
    await devToolsPage.typeText('1.0');

    await devToolsPage.tabForward();  // Focus UA string.
    await devToolsPage.typeText('Test device browser 1.0');

    await devToolsPage.tabForward();  // Focus device type.
    await devToolsPage.tabForward();  // Focus folder.
    await devToolsPage.pressKey('Enter');

    await devToolsPage.tabForward();  // Focus help button
    await devToolsPage.tabForward();  // Focus brand browser.
    await devToolsPage.typeText('Test browser');

    await devToolsPage.tabForward();  // Focus brand version.
    await devToolsPage.typeText('1.0');

    await devToolsPage.tabForward();  // Focus delete button.
    await devToolsPage.tabForward();  // Focus Add brand button.
    await devToolsPage.pressKey('Space');

    await devToolsPage.typeText('Friendly Dragon');
    await devToolsPage.tabForward();  //  Focus second row brand version.
    await devToolsPage.typeText('1.1');

    await devToolsPage.tabForward();  // Focus second row delete button.
    await devToolsPage.tabForward();  // Focus Add brand button.

    await devToolsPage.tabForward();  // focus full-version-list brand
    await devToolsPage.typeText('Ready Rover');

    await devToolsPage.tabForward();  // focus full-version-list brand version
    await devToolsPage.typeText('2.4.9');

    await devToolsPage.tabForward();  // focus delete full-version-list brand button
    await devToolsPage.tabForward();  // focus add full-version-list brand button
    await devToolsPage.tabForward();  // Focus full version.
    await devToolsPage.typeText('1.1.2345');

    // Focus on form factors checkbox
    for (let i = 0; i < 7; ++i) {
      await devToolsPage.tabForward();
      // Enable form factors Desktop and XR
      if (i === 0 || i === 4) {
        await devToolsPage.pressKey('Space');
      }
    }

    await devToolsPage.tabForward();  // Focus platform.
    await devToolsPage.typeText('Cyborg');

    await devToolsPage.tabForward();  // Focus platform version.
    await devToolsPage.typeText('C-1');

    await devToolsPage.tabForward();  // Focus architecture.
    await devToolsPage.typeText('Bipedal');

    await devToolsPage.tabForward();  // Focus device model.
    await devToolsPage.typeText('C-1-Gardener');

    await devToolsPage.tabForward();  // Focus cancel button.
    await devToolsPage.tabForward();  // Focus add button.

    const addDevToolsButton = await devToolsPage.waitFor('.editor-buttons devtools-button:nth-of-type(2)');
    const addButton = await addDevToolsButton.waitForSelector('>>> button:focus');
    assert.isNotNull(addButton);  // Check that the devtools-buttons is focus

    const finishAddText = await elementTextContent(addDevToolsButton);
    assert.strictEqual(finishAddText, 'Add');
    await devToolsPage.clickElement(addDevToolsButton);

    // Select the device in the menu.
    await selectTestDevice(devToolsPage);

    // Reload the test page, and verify things working.
    await inspectedPage.reload();

    void waitForDomNodeToBeVisible('#res-dump-done');
    assert.strictEqual(await targetTextContent('#res-ua', inspectedPage), 'Test device browser 1.0');
    assert.strictEqual(await targetTextContent('#res-mobile', inspectedPage), 'true');
    assert.strictEqual(await targetTextContent('#res-num-brands', inspectedPage), '2');
    assert.strictEqual(await targetTextContent('#res-brand-0-name', inspectedPage), 'Test browser');
    assert.strictEqual(await targetTextContent('#res-brand-0-version', inspectedPage), '1.0');
    assert.strictEqual(await targetTextContent('#res-brand-1-name', inspectedPage), 'Friendly Dragon');
    assert.strictEqual(await targetTextContent('#res-brand-1-version', inspectedPage), '1.1');
    assert.strictEqual(await targetTextContent('#res-platform', inspectedPage), 'Cyborg');
    assert.strictEqual(await targetTextContent('#res-platform-version', inspectedPage), 'C-1');
    assert.strictEqual(await targetTextContent('#res-architecture', inspectedPage), 'Bipedal');
    assert.strictEqual(await targetTextContent('#res-model', inspectedPage), 'C-1-Gardener');
    assert.strictEqual(await targetTextContent('#res-ua-full-version', inspectedPage), '1.1.2345');
    assert.strictEqual(await targetTextContent('#res-num-full-version-list', inspectedPage), '1');
    assert.strictEqual(await targetTextContent('#res-full-version-list-0-name', inspectedPage), 'Ready Rover');
    assert.strictEqual(await targetTextContent('#res-full-version-list-0-version', inspectedPage), '2.4.9');
    assert.strictEqual(await targetTextContent('#res-num-form-factors', inspectedPage), '2');
    assert.strictEqual(await targetTextContent('#res-form-factors-0', inspectedPage), 'Desktop');
    assert.strictEqual(await targetTextContent('#res-form-factors-1', inspectedPage), 'XR');

    // Focus the first item in the device list, which should be the custom entry,
    // and then click the edit button that should appear.
    const firstDevice = await devToolsPage.waitFor('.devices-list-item');
    await firstDevice.focus();

    const editButton = await devToolsPage.waitForAria('Edit');
    await editButton.click();

    // Make sure the device name field is what's focused.
    await devToolsPage.waitFor(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);

    // Skip over to the version field.
    for (let i = 0; i < 19; ++i) {
      if (i === 7) {
        await devToolsPage.pressKey('ArrowRight');
      }
      await devToolsPage.tabForward();
    }

    // Change the value.
    await devToolsPage.typeText('1.1.5');

    // Move to form factor Desktop checkbox, uncheck it.
    await devToolsPage.tabForward();
    await devToolsPage.pressKey('Space');

    // Save the changes.
    await devToolsPage.pressKey('Enter');

    // Reload the test page, and verify things working.
    await inspectedPage.reload();

    void waitForDomNodeToBeVisible('#res-dump-done');
    assert.strictEqual(await targetTextContent('#res-ua', inspectedPage), 'Test device browser 1.0');
    assert.strictEqual(await targetTextContent('#res-mobile', inspectedPage), 'true');
    assert.strictEqual(await targetTextContent('#res-num-brands', inspectedPage), '2');
    assert.strictEqual(await targetTextContent('#res-brand-0-name', inspectedPage), 'Test browser');
    assert.strictEqual(await targetTextContent('#res-brand-0-version', inspectedPage), '1.0');
    assert.strictEqual(await targetTextContent('#res-brand-1-name', inspectedPage), 'Friendly Dragon');
    assert.strictEqual(await targetTextContent('#res-brand-1-version', inspectedPage), '1.1');
    assert.strictEqual(await targetTextContent('#res-platform', inspectedPage), 'Cyborg');
    assert.strictEqual(await targetTextContent('#res-platform-version', inspectedPage), 'C-1');
    assert.strictEqual(await targetTextContent('#res-architecture', inspectedPage), 'Bipedal');
    assert.strictEqual(await targetTextContent('#res-model', inspectedPage), 'C-1-Gardener');
    assert.strictEqual(await targetTextContent('#res-ua-full-version', inspectedPage), '1.1.5');
    assert.strictEqual(await targetTextContent('#res-num-full-version-list', inspectedPage), '1');
    assert.strictEqual(await targetTextContent('#res-full-version-list-0-name', inspectedPage), 'Ready Rover');
    assert.strictEqual(await targetTextContent('#res-full-version-list-0-version', inspectedPage), '2.4.9');
    assert.strictEqual(await targetTextContent('#res-num-form-factors', inspectedPage), '1');
    assert.strictEqual(await targetTextContent('#res-form-factors-0', inspectedPage), 'XR');
  });

  it('can add and properly display a device with a custom resolution', async ({devToolsPage, inspectedPage}) => {
    await navigateAndOpeDeviceToolbar(devToolsPage, inspectedPage);
    await selectEdit(devToolsPage);
    await devToolsPage.click(ADD_DEVICE_BUTTON_SELECTOR);
    await devToolsPage.waitFor(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);
    await devToolsPage.typeText('Prime numbers');

    await devToolsPage.tabForward();  // Focus width.
    await devToolsPage.typeText('863');
    await devToolsPage.tabForward();  // Focus height.
    await devToolsPage.typeText('1223');
    await devToolsPage.tabForward();  // Focus DPR.
    await devToolsPage.typeText('1.0');
    await devToolsPage.tabForward();  // Focus UA string.
    await devToolsPage.typeText('Test device browser 1.0');

    const finishAdd = await devToolsPage.waitFor(EDITOR_ADD_BUTTON_SELECTOR);
    const finishAddText = await elementTextContent(finishAdd);
    assert.strictEqual(finishAddText, 'Add');
    await devToolsPage.clickElement(finishAdd);
    await devToolsPage.waitForNone(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);

    // Select the device in the menu.
    await selectDevice('Prime numbers', devToolsPage);

    const zoomButton = await devToolsPage.waitForAria('Zoom');
    assert.strictEqual(await elementTextContent(zoomButton), '51%');

    // Check fit-to-window text.
    await clickZoomDropDown(devToolsPage);

    const fitButton = await devToolsPage.waitFor('[aria-label*="Fit to window"]');
    assert.strictEqual(await elementTextContent(fitButton), 'Fit to window (51%)');
    assert.strictEqual(await elementTextContent(zoomButton), '51%');

    const zoomTo100Button = await devToolsPage.waitFor('[aria-label*="100%"]');
    await devToolsPage.clickElement(zoomTo100Button);
    assert.strictEqual(await elementTextContent(fitButton), 'Fit to window (51%)');
    assert.strictEqual(await elementTextContent(zoomButton), '100%');
  });

  it('shows an error if the pixel ratio is not a number', async ({devToolsPage, inspectedPage}) => {
    await navigateAndOpeDeviceToolbar(devToolsPage, inspectedPage);
    await selectEdit(devToolsPage);
    await devToolsPage.click(ADD_DEVICE_BUTTON_SELECTOR);
    await devToolsPage.waitFor(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);
    await devToolsPage.typeText('Prime numbers');

    await devToolsPage.tabForward();  // Focus width.
    await devToolsPage.typeText('700');
    await devToolsPage.tabForward();  // Focus height.
    await devToolsPage.typeText('400');
    await devToolsPage.tabForward();  // Focus DPR.
    await devToolsPage.typeText('zzz.213213');

    const error = await devToolsPage.waitFor('.list-widget-input-validation-error');
    const errorText = await error.evaluate(element => element.textContent);
    assert.strictEqual(errorText, 'Device pixel ratio must be a number or blank.');
  });
});
