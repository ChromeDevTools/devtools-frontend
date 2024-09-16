// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';

import * as Components from './components.js';

describeWithEnvironment('NetworkThrottlingSelector', () => {
  const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
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

    await coordinator.done();

    const groups = view.shadowRoot!.querySelectorAll('devtools-menu-group') as NodeListOf<Menus.Menu.MenuGroup>;

    assert.lengthOf(groups, 3);

    assert.strictEqual(groups[0].name, 'Disabled');
    const group1Items = groups[0].querySelectorAll('devtools-menu-item') as NodeListOf<Menus.Menu.MenuItem>;
    assert.lengthOf(group1Items, 1);
    assert.match(group1Items[0].innerText, /No throttling/);
    assert.isTrue(group1Items[0].selected);

    assert.strictEqual(groups[1].name, 'Presets');
    const group2Items = groups[1].querySelectorAll('devtools-menu-item') as NodeListOf<Menus.Menu.MenuItem>;
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
    const group3Items = groups[2].querySelectorAll('devtools-menu-item') as NodeListOf<Menus.Menu.MenuItem>;
    assert.lengthOf(group3Items, 1);
    assert.match(group3Items[0].innerText, /Add…/);
    assert.isFalse(group3Items[0].selected);
  });

  it('updates network manager on change', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    renderElementIntoDOM(view);

    await coordinator.done();

    const items = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<Menus.Menu.MenuItem>;
    assert.isTrue(items[0].selected);
    assert.strictEqual(networkManager.networkConditions().i18nTitleKey, 'No throttling');

    items[1].click();
    await coordinator.done();

    assert.isTrue(items[1].selected);
    assert.isFalse(items[0].selected);
    assert.strictEqual(networkManager.networkConditions().i18nTitleKey, 'Fast 4G');
  });

  it('reacts to changes when it is unmounted and then remounted', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    // Change the conditions before the component is put into the DOM.
    networkManager.setNetworkConditions(MobileThrottling.ThrottlingPresets.ThrottlingPresets.networkPresets[1]);

    renderElementIntoDOM(view);
    await coordinator.done();
    // Ensure that the component picks up the new changes and has selected the right thorttling setting
    const items = view.shadowRoot!.querySelectorAll('devtools-menu-item');
    assert.isTrue(items[2].innerText.includes('Slow 4G'));
    assert.isTrue(items[2].selected);
  });

  it('reacts to network manager changes', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    renderElementIntoDOM(view);

    await coordinator.done();

    const items = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<Menus.Menu.MenuItem>;
    assert.isTrue(items[0].selected);

    networkManager.setNetworkConditions(MobileThrottling.ThrottlingPresets.ThrottlingPresets.networkPresets[1]);
    await coordinator.done();

    assert.isTrue(items[2].selected);
    assert.isFalse(items[0].selected);
  });

  it('reacts to custom setting changes', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    renderElementIntoDOM(view);

    await coordinator.done();

    let items = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<HTMLElement>;
    assert.lengthOf(items, 6);

    customNetworkSetting.set([{
      title: 'Custom item',
      i18nTitleKey: 'Custom item',
      download: 0,
      upload: 0,
      latency: 0,
    }]);
    await coordinator.done();

    items = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<HTMLElement>;
    assert.lengthOf(items, 7);
    assert.match(items[5].innerText, /Custom item/);
  });

  it('reveals custom throttling settings when "Add..." clicked', async () => {
    const view = new Components.NetworkThrottlingSelector.NetworkThrottlingSelector();
    renderElementIntoDOM(view);

    await coordinator.done();

    const items = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<Menus.Menu.MenuItem>;
    const addItem = items[items.length - 1];
    addItem.click();

    assert.isFalse(addItem.selected);

    await coordinator.done();

    assert(mockReveal.calledOnce);
    assert.isFalse(addItem.selected);
  });
});
