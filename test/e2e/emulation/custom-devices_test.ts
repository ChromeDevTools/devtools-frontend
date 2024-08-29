// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {assert} from 'chai';
import type * as puppeteer from 'puppeteer-core';

import {
  click,
  clickElement,
  getBrowserAndPages,
  goToResource,
  pressKey,
  tabForward,
  typeText,
  waitFor,
  waitForAria,
  waitForNone,
} from '../../shared/helper.js';

import {waitForDomNodeToBeVisible} from '../helpers/elements-helpers.js';
import {
  clickZoomDropDown,
  openDeviceToolbar,
  reloadDockableFrontEnd,
  selectDevice,
  selectEdit,
  selectTestDevice,
} from '../helpers/emulation-helpers.js';

const ADD_DEVICE_BUTTON_SELECTOR = '#custom-device-add-button';
const FOCUSED_DEVICE_NAME_FIELD_SELECTOR = '#custom-device-name-field:focus';
const EDITOR_ADD_BUTTON_SELECTOR = '.editor-buttons > devtools-button:nth-of-type(2)';

async function elementTextContent(element: puppeteer.ElementHandle): Promise<string> {
  return await element.evaluate(node => node.textContent || '');
}

async function targetTextContent(selector: string): Promise<string> {
  const {target} = getBrowserAndPages();
  const handle = await target.waitForSelector(selector);
  if (!handle) {
    assert.fail(`targetTextContent: could not find element for ${selector}`);
  }
  return elementTextContent(handle);
}

describe('Custom devices', () => {
  beforeEach(async function() {
    await reloadDockableFrontEnd();
    await goToResource('emulation/custom-ua-ch.html');
    await waitFor('.tabbed-pane-left-toolbar');
    await openDeviceToolbar();
  });

  it('can add and then edit a custom device with UA-CH emulation', async () => {
    await selectEdit();
    await click(ADD_DEVICE_BUTTON_SELECTOR);
    await waitFor(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);
    await typeText('Test device');

    await tabForward();  // Focus width.
    await tabForward();  // Focus height.
    await tabForward();  // Focus DPR.
    await typeText('1.0');

    await tabForward();  // Focus UA string.
    await typeText('Test device browser 1.0');

    await tabForward();  // Focus device type.
    await tabForward();  // Focus folder.
    await pressKey('Enter');

    await tabForward();  // Focus help button
    await tabForward();  // Focus brand browser.
    await typeText('Test browser');

    await tabForward();  // Focus brand version.
    await typeText('1.0');

    await tabForward();  // Focus delete button.
    await tabForward();  // Focus Add brand button.
    await pressKey('Space');

    await typeText('Friendly Dragon');
    await tabForward();  //  Focus second row brand version.
    await typeText('1.1');

    await tabForward();  // Focus second row delete button.
    await tabForward();  // Focus Add brand button.

    await tabForward();  // focus full-version-list brand
    await typeText('Ready Rover');

    await tabForward();  // focus full-version-list brand version
    await typeText('2.4.9');

    await tabForward();  // focus delete full-version-list brand button
    await tabForward();  // focus add full-version-list brand button
    await tabForward();  // Focus full version.
    await typeText('1.1.2345');

    await tabForward();  // Focus platform.
    await typeText('Cyborg');

    await tabForward();  // Focus platform version.
    await typeText('C-1');

    await tabForward();  // Focus architecture.
    await typeText('Bipedal');

    await tabForward();  // Focus device model.
    await typeText('C-1-Gardener');

    await tabForward();  // Focus cancel button.
    await tabForward();  // Focus add button.

    const addDevToolsButton = await waitFor('.editor-buttons devtools-button:nth-of-type(2)');
    const addButton = await addDevToolsButton.waitForSelector('>>> button:focus');
    assert.isNotNull(addButton);  // Check that the devtools-buttons is focus

    const finishAddText = await elementTextContent(addDevToolsButton);
    assert.strictEqual(finishAddText, 'Add');
    await clickElement(addDevToolsButton);

    // Select the device in the menu.
    await selectTestDevice();

    // Reload the test page, and verify things working.
    const {target} = getBrowserAndPages();
    await target.reload();

    void waitForDomNodeToBeVisible('#res-dump-done');
    assert.strictEqual(await targetTextContent('#res-ua'), 'Test device browser 1.0');
    assert.strictEqual(await targetTextContent('#res-mobile'), 'true');
    assert.strictEqual(await targetTextContent('#res-num-brands'), '2');
    assert.strictEqual(await targetTextContent('#res-brand-0-name'), 'Test browser');
    assert.strictEqual(await targetTextContent('#res-brand-0-version'), '1.0');
    assert.strictEqual(await targetTextContent('#res-brand-1-name'), 'Friendly Dragon');
    assert.strictEqual(await targetTextContent('#res-brand-1-version'), '1.1');
    assert.strictEqual(await targetTextContent('#res-platform'), 'Cyborg');
    assert.strictEqual(await targetTextContent('#res-platform-version'), 'C-1');
    assert.strictEqual(await targetTextContent('#res-architecture'), 'Bipedal');
    assert.strictEqual(await targetTextContent('#res-model'), 'C-1-Gardener');
    assert.strictEqual(await targetTextContent('#res-ua-full-version'), '1.1.2345');

    // Focus the first item in the device list, which should be the custom entry,
    // and then click the edit button that should appear.
    const firstDevice = await waitFor('.devices-list-item');
    await firstDevice.focus();

    const editButton = await waitFor('devtools-button[aria-label="Edit"]');
    await editButton.click();

    // Make sure the device name field is what's focused.
    await waitFor(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);

    // Skip over to the version field.
    for (let i = 0; i < 19; ++i) {
      if (i === 7) {
        await pressKey('ArrowRight');
      }
      await tabForward();
    }

    // Change the value.
    await typeText('1.1.5');

    // Save the changes.
    await pressKey('Enter');

    // Reload the test page, and verify things working.
    await target.reload();

    void waitForDomNodeToBeVisible('#res-dump-done');
    assert.strictEqual(await targetTextContent('#res-ua'), 'Test device browser 1.0');
    assert.strictEqual(await targetTextContent('#res-mobile'), 'true');
    assert.strictEqual(await targetTextContent('#res-num-brands'), '2');
    assert.strictEqual(await targetTextContent('#res-brand-0-name'), 'Test browser');
    assert.strictEqual(await targetTextContent('#res-brand-0-version'), '1.0');
    assert.strictEqual(await targetTextContent('#res-brand-1-name'), 'Friendly Dragon');
    assert.strictEqual(await targetTextContent('#res-brand-1-version'), '1.1');
    assert.strictEqual(await targetTextContent('#res-platform'), 'Cyborg');
    assert.strictEqual(await targetTextContent('#res-platform-version'), 'C-1');
    assert.strictEqual(await targetTextContent('#res-architecture'), 'Bipedal');
    assert.strictEqual(await targetTextContent('#res-model'), 'C-1-Gardener');
    assert.strictEqual(await targetTextContent('#res-ua-full-version'), '1.1.5');
  });

  it('can add and properly display a device with a custom resolution', async () => {
    await selectEdit();
    await click(ADD_DEVICE_BUTTON_SELECTOR);
    await waitFor(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);
    await typeText('Prime numbers');

    await tabForward();  // Focus width.
    await typeText('863');
    await tabForward();  // Focus height.
    await typeText('1223');
    await tabForward();  // Focus DPR.
    await typeText('1.0');
    await tabForward();  // Focus UA string.
    await typeText('Test device browser 1.0');

    const finishAdd = await waitFor(EDITOR_ADD_BUTTON_SELECTOR);
    const finishAddText = await elementTextContent(finishAdd);
    assert.strictEqual(finishAddText, 'Add');
    await clickElement(finishAdd);
    await waitForNone(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);

    // Select the device in the menu.
    await selectDevice('Prime numbers');

    const zoomButton = await waitForAria('Zoom');
    assert.strictEqual(await elementTextContent(zoomButton), '51%');

    // Check fit-to-window text.
    await clickZoomDropDown();

    const fitButton = await waitFor('[aria-label*="Fit to window"]');
    assert.strictEqual(await elementTextContent(fitButton), 'Fit to window (51%)');
    assert.strictEqual(await elementTextContent(zoomButton), '51%');

    const zoomTo100Button = await waitFor('[aria-label*="100%"]');
    await clickElement(zoomTo100Button);
    assert.strictEqual(await elementTextContent(fitButton), 'Fit to window (51%)');
    assert.strictEqual(await elementTextContent(zoomButton), '100%');
  });
});
