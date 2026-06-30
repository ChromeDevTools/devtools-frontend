// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import {dispatchClickEvent, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as MobileThrottling from './mobile_throttling.js';

const {ThrottlingSettingsTab} = MobileThrottling.ThrottlingSettingsTab;

function makeFakeNetworkConditions(index: number): SDK.NetworkManager.Conditions {
  return {
    key: `USER_CUSTOM_SETTING_${index + 1}`,
    title: () => '',
    download: -1,
    upload: -1,
    latency: 0,
    packetLoss: 0,
    packetReordering: false
  };
}

describeWithEnvironment('ThrottlingSettingsTab', () => {
  it('can add custom network conditions and sets the key correctly', async () => {
    const customConditionsSetting = SDK.NetworkManager.customUserNetworkConditionsSetting();
    assert.lengthOf(customConditionsSetting.get(), 0);

    const addNewItemStub = sinon.stub(UI.ListWidget.ListWidget.prototype, 'addNewItem');
    const widget = new ThrottlingSettingsTab();
    renderElementIntoDOM(widget);
    await raf();

    const addButton = widget.contentElement.querySelector('.add-conditions-button');
    assert.isOk(addButton);
    dispatchClickEvent(addButton);

    sinon.assert.calledOnce(addNewItemStub);
    const [indexOfNewItem, newConditions] = addNewItemStub.getCall(0).args as [number, SDK.NetworkManager.Conditions];
    assert.strictEqual(indexOfNewItem, 0);
    assert.strictEqual(newConditions.key, 'USER_CUSTOM_SETTING_1');
  });

  it('uses the right key when custom conditions already exist', async () => {
    const customConditionsSetting = SDK.NetworkManager.customUserNetworkConditionsSetting();
    customConditionsSetting.set([
      makeFakeNetworkConditions(0),
      // purposefully add a larger key than the index
      makeFakeNetworkConditions(4),
    ]);

    const addNewItemStub = sinon.stub(UI.ListWidget.ListWidget.prototype, 'addNewItem');
    const widget = new ThrottlingSettingsTab();
    renderElementIntoDOM(widget);
    await raf();

    const addButton = widget.contentElement.querySelector('.add-conditions-button');
    assert.isOk(addButton);
    dispatchClickEvent(addButton);

    sinon.assert.calledOnce(addNewItemStub);
    const [indexOfNewItem, newConditions] = addNewItemStub.getCall(0).args as [number, SDK.NetworkManager.Conditions];
    assert.strictEqual(indexOfNewItem, 2);
    assert.strictEqual(newConditions.key, 'USER_CUSTOM_SETTING_6');
  });

  it('still increments the key even if an old condition is deleted', async () => {
    const customConditionsSetting = SDK.NetworkManager.customUserNetworkConditionsSetting();
    const fakeConditions1 = makeFakeNetworkConditions(0);
    const fakeConditions2 = makeFakeNetworkConditions(1);
    customConditionsSetting.set([fakeConditions1, fakeConditions2]);

    const addNewItemStub = sinon.stub(UI.ListWidget.ListWidget.prototype, 'addNewItem');
    const widget = new ThrottlingSettingsTab();
    renderElementIntoDOM(widget);
    await raf();

    // Before we add a new one, delete an old one.
    customConditionsSetting.set([fakeConditions1]);

    const addButton = widget.contentElement.querySelector('.add-conditions-button');
    assert.isOk(addButton);
    dispatchClickEvent(addButton);

    sinon.assert.calledOnce(addNewItemStub);
    const [indexOfNewItem, newConditions] = addNewItemStub.getCall(0).args as [number, SDK.NetworkManager.Conditions];
    assert.strictEqual(indexOfNewItem, 1);
    // The number used in the key is still 3, because it never decrements even
    // when settings are deleted.
    assert.strictEqual(newConditions.key, 'USER_CUSTOM_SETTING_3');
  });

  it('can handle double digit indexes', async () => {
    const customConditionsSetting = SDK.NetworkManager.customUserNetworkConditionsSetting();
    const fakeConditions1 = makeFakeNetworkConditions(0);
    const fakeConditions2 = makeFakeNetworkConditions(9);
    customConditionsSetting.set([fakeConditions1, fakeConditions2]);

    const addNewItemStub = sinon.stub(UI.ListWidget.ListWidget.prototype, 'addNewItem');
    const widget = new ThrottlingSettingsTab();
    renderElementIntoDOM(widget);
    await raf();

    const addButton = widget.contentElement.querySelector('.add-conditions-button');
    assert.isOk(addButton);
    dispatchClickEvent(addButton);

    sinon.assert.calledOnce(addNewItemStub);
    const [indexOfNewItem, newConditions] = addNewItemStub.getCall(0).args as [number, SDK.NetworkManager.Conditions];
    assert.strictEqual(indexOfNewItem, 2);
    assert.strictEqual(newConditions.key, 'USER_CUSTOM_SETTING_11');
  });

  it('renders default and custom profiles in separate cards with headers', async () => {
    const expectedHeaders = [
      'Profile Name',
      'Download',
      'Upload',
      'Latency',
      'Packet Loss',
      'Packet Queue Length',
      'Packet Reordering',
    ];
    const customConditionsSetting = SDK.NetworkManager.customUserNetworkConditionsSetting();
    customConditionsSetting.set([makeFakeNetworkConditions(0)]);

    const widget = new ThrottlingSettingsTab();
    renderElementIntoDOM(widget);
    widget.wasShown();
    await raf();

    const cards = widget.contentElement.querySelectorAll('devtools-card');
    assert.lengthOf(cards, 3);

    assert.strictEqual(cards[0].heading, 'CPU throttling presets');
    assert.strictEqual(cards[1].heading, 'Default profiles');
    assert.strictEqual(cards[2].heading, 'Custom profiles');

    const defaultList = cards[1].querySelector('.conditions-list');
    assert.isOk(defaultList);

    // Check header
    const defaultHeader = defaultList!.shadowRoot!.querySelector('.conditions-list-header');
    assert.isOk(defaultHeader);
    const defaultHeaderColumns = defaultHeader!.querySelectorAll('.conditions-list-text');
    assert.lengthOf(defaultHeaderColumns, 7);

    const actualDefaultTexts = Array.from(defaultHeaderColumns).map(col => col.textContent?.trim());
    assert.deepEqual(actualDefaultTexts, expectedHeaders);

    const actualDefaultTooltips = Array.from(defaultHeaderColumns).map(col => col.getAttribute('title') || '');
    assert.deepEqual(actualDefaultTooltips, expectedHeaders);

    const defaultItems = defaultList!.shadowRoot!.querySelectorAll('.list-item');
    assert.lengthOf(defaultItems, 4);
    for (const item of defaultItems) {
      assert.isFalse(item.classList.contains('editable'));
      assert.isNull(item.querySelector('.controls-container'));
    }

    const customList = cards[2].querySelector('.conditions-list');
    assert.isOk(customList);

    // Check header
    const customHeader = customList!.shadowRoot!.querySelector('.conditions-list-header');
    assert.isOk(customHeader);
    const customHeaderColumns = customHeader!.querySelectorAll('.conditions-list-text');
    assert.lengthOf(customHeaderColumns, 7);

    const actualCustomTexts = Array.from(customHeaderColumns).map(col => col.textContent?.trim());
    assert.deepEqual(actualCustomTexts, expectedHeaders);

    const actualCustomTooltips = Array.from(customHeaderColumns).map(col => col.getAttribute('title') || '');
    assert.deepEqual(actualCustomTooltips, expectedHeaders);

    const customItems = customList!.shadowRoot!.querySelectorAll('.list-item');
    assert.lengthOf(customItems, 1);
    assert.isTrue(customItems[0].classList.contains('editable'));
    assert.isOk(customItems[0].querySelector('.controls-container'));
  });
});
