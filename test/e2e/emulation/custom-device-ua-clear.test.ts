// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  openDeviceToolbar,
  selectEdit,
} from '../helpers/emulation-helpers.js';

const ADD_DEVICE_BUTTON_SELECTOR = '#custom-device-add-button';
const FOCUSED_DEVICE_NAME_FIELD_SELECTOR = '#custom-device-name-field:focus';
const EDITOR_ADD_BUTTON_SELECTOR = '.editor-buttons > devtools-button:nth-of-type(2)';

describe('Custom device UA override', () => {
  it('requires a non-empty user agent when adding a custom device', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goTo('about:blank');
    await devToolsPage.waitFor('.tabbed-pane-left-toolbar');
    await openDeviceToolbar(devToolsPage, inspectedPage);

    await selectEdit(devToolsPage);
    await devToolsPage.click(ADD_DEVICE_BUTTON_SELECTOR);
    await devToolsPage.waitFor(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);
    await devToolsPage.typeText('Test device');

    await devToolsPage.tabForward();  // Focus width.
    await devToolsPage.typeText('1920');
    await devToolsPage.tabForward();  // Focus height.
    await devToolsPage.typeText('1080');
    await devToolsPage.tabForward();  // Focus DPR.
    await devToolsPage.typeText('1.0');
    await devToolsPage.tabForward();  // Focus UA string (leave empty first).

    const addButton = await devToolsPage.waitFor(EDITOR_ADD_BUTTON_SELECTOR);
    assert.isTrue(
        await addButton.evaluate(button => Boolean((button as HTMLElement & {disabled?: boolean}).disabled)),
        'Add button should be disabled for empty UA');

    await devToolsPage.typeText('Test device browser 1.0');

    assert.isFalse(
        await addButton.evaluate(button => Boolean((button as HTMLElement & {disabled?: boolean}).disabled)),
        'Add button should be enabled once UA is set');

    await devToolsPage.clickElement(addButton);
    await devToolsPage.waitForNone(FOCUSED_DEVICE_NAME_FIELD_SELECTOR);
  });
});
