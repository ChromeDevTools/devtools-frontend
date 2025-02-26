// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {getCleanTextContentFromElements, renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';

import * as Components from './components.js';

describeWithEnvironment('NetworkThrottlingSelector', () => {
  let networkManager: SDK.NetworkManager.MultitargetNetworkManager;
  let customNetworkSetting: Common.Settings.Setting<SDK.NetworkManager.Conditions[]>;
  let mockReveal: sinon.SinonStub;

  beforeEach(() => {
    networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    customNetworkSetting = Common.Settings.Settings.instance().moduleSetting('custom-network-conditions');
    mockReveal = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal');
  });

  afterEach(() => {
    customNetworkSetting.set([]);
    mockReveal.restore();
  });

  it('should render all default presets', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    renderElementIntoDOM(view);

    await RenderCoordinator.done();

    const groups = view.shadowRoot!.querySelectorAll('devtools-menu-group');

    assert.lengthOf(groups, 3);

    assert.strictEqual(groups[0].name, 'Disabled');
    const group1Items = groups[0].querySelectorAll('devtools-menu-item');
    assert.lengthOf(group1Items, 1);
    assert.match(group1Items[0].innerText, /No throttling/);
    assert.isTrue(group1Items[0].selected);

    assert.strictEqual(groups[1].name, 'Presets');
    const group2Items = groups[1].querySelectorAll('devtools-menu-item');
    assert.lengthOf(group2Items, 4);
    assert.match(group2Items[0].innerText, /Fast 4G/);
    assert.isFalse(group2Items[0].selected);
    assert.match(group2Items[1].innerText, /Slow 4G/);
    assert.isFalse(group2Items[1].selected);
    assert.match(group2Items[2].innerText, /3G/);
    assert.isFalse(group2Items[2].selected);
    assert.match(group2Items[3].innerText, /Offline/);
    assert.isFalse(group2Items[3].selected);

    assert.strictEqual(groups[2].name, 'Custom');
    const group3Items = groups[2].querySelectorAll('devtools-menu-item');
    assert.lengthOf(group3Items, 1);
    assert.match(group3Items[0].innerText, /Add…/);
    assert.isFalse(group3Items[0].selected);
  });

  it('updates network manager on change', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    renderElementIntoDOM(view);

    await RenderCoordinator.done();

    const items = view.shadowRoot!.querySelectorAll('devtools-menu-item');
    assert.isTrue(items[0].selected);
    assert.strictEqual(networkManager.networkConditions().i18nTitleKey, 'No throttling');

    items[1].click();
    await RenderCoordinator.done();

    assert.isTrue(items[1].selected);
    assert.isFalse(items[0].selected);
    assert.strictEqual(networkManager.networkConditions().i18nTitleKey, 'Fast 4G');
  });

  it('correctly updates when a custom preset is selected', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    renderElementIntoDOM(view);
    await RenderCoordinator.done();
    customNetworkSetting.set([
      {
        title: 'Custom item one',
        download: 0,
        upload: 0,
        latency: 0,
      },
      {
        title: 'Custom item two',
        download: 0,
        upload: 0,
        latency: 0,

      },
    ]);
    await RenderCoordinator.done();

    assert.isOk(view.shadowRoot);
    const items = view.shadowRoot.querySelectorAll('devtools-menu-item');
    const itemsText = getCleanTextContentFromElements(view.shadowRoot, 'devtools-menu-item');
    assert.deepEqual(
        itemsText,
        ['No throttling', 'Fast 4G', 'Slow 4G', '3G', 'Offline', 'Custom item one', 'Custom item two', 'Add…']);

    items[6].click();
    await RenderCoordinator.done();
    assert.deepEqual(Array.from(items).filter(i => i.selected), [items[6]]);
    assert.strictEqual(networkManager.networkConditions().title, 'Custom item two');
  });

  it('reacts to changes when it is unmounted and then remounted', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    // Change the conditions before the component is put into the DOM.
    networkManager.setNetworkConditions(MobileThrottling.ThrottlingPresets.ThrottlingPresets.networkPresets[1]);

    renderElementIntoDOM(view);
    await RenderCoordinator.done();
    // Ensure that the component picks up the new changes and has selected the right thorttling setting
    const items = view.shadowRoot!.querySelectorAll('devtools-menu-item');
    assert.isTrue(items[2].innerText.includes('Slow 4G'));
    assert.isTrue(items[2].selected);
  });

  it('reacts to network manager changes', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    renderElementIntoDOM(view);

    await RenderCoordinator.done();

    const items = view.shadowRoot!.querySelectorAll('devtools-menu-item');
    assert.isTrue(items[0].selected);

    networkManager.setNetworkConditions(MobileThrottling.ThrottlingPresets.ThrottlingPresets.networkPresets[1]);
    await RenderCoordinator.done();

    assert.isTrue(items[2].selected);
    assert.isFalse(items[0].selected);
  });

  it('reacts to custom setting changes', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    renderElementIntoDOM(view);

    await RenderCoordinator.done();

    let items = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<HTMLElement>;
    assert.lengthOf(items, 6);

    customNetworkSetting.set([{
      title: 'Custom item',
      download: 0,
      upload: 0,
      latency: 0,
    }]);
    await RenderCoordinator.done();

    items = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<HTMLElement>;
    assert.lengthOf(items, 7);
    assert.match(items[5].innerText, /Custom item/);
  });

  it('reveals custom throttling settings when "Add..." clicked', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    renderElementIntoDOM(view);

    await RenderCoordinator.done();

    const items = view.shadowRoot!.querySelectorAll('devtools-menu-item');
    const addItem = items[items.length - 1];
    addItem.click();

    assert.isFalse(addItem.selected);

    await RenderCoordinator.done();

    assert(mockReveal.calledOnce);
    assert.isFalse(addItem.selected);
  });
});
