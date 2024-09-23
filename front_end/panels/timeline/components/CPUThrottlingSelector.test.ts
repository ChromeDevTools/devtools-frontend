// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as MobileThrottling from '../../../panels/mobile_throttling/mobile_throttling.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import type * as Menus from '../../../ui/components/menus/menus.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

import * as Components from './components.js';

describeWithEnvironment('CPUThrottlingSelector', () => {
  const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
  let cpuThrottlingManager: SDK.CPUThrottlingManager.CPUThrottlingManager;

  beforeEach(() => {
    cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance({forceNew: true});
    MobileThrottling.ThrottlingManager.ThrottlingManager.instance({forceNew: true});
  });

  it('renders all CPU throttling presets', async () => {
    const view = new Components.CPUThrottlingSelector.CPUThrottlingSelector();
    renderElementIntoDOM(view);

    await coordinator.done();

    const menuItems = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<Menus.Menu.MenuItem>;

    assert.lengthOf(menuItems, 4);

    assert.strictEqual(menuItems[0].value, 1);
    assert.isTrue(menuItems[0].selected);
    assert.match(menuItems[0].innerText, /No throttling/);

    assert.strictEqual(menuItems[1].value, 4);
    assert.isFalse(menuItems[1].selected);
    assert.match(menuItems[1].innerText, /4× slowdown/);

    assert.strictEqual(menuItems[2].value, 6);
    assert.isFalse(menuItems[2].selected);
    assert.match(menuItems[2].innerText, /6× slowdown/);

    assert.strictEqual(menuItems[3].value, 20);
    assert.isFalse(menuItems[3].selected);
    assert.match(menuItems[3].innerText, /20× slowdown/);
  });

  it('updates CPU throttling manager on change', async () => {
    const view = new Components.CPUThrottlingSelector.CPUThrottlingSelector();
    renderElementIntoDOM(view);

    await coordinator.done();

    const menuItems = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<Menus.Menu.MenuItem>;

    assert.isTrue(menuItems[0].selected);
    assert.strictEqual(cpuThrottlingManager.cpuThrottlingRate(), 1);

    menuItems[1].click();
    await coordinator.done();

    assert.isTrue(menuItems[1].selected);
    assert.strictEqual(cpuThrottlingManager.cpuThrottlingRate(), 4);
  });

  it('reacts to changes in CPU throttling manager', async () => {
    const view = new Components.CPUThrottlingSelector.CPUThrottlingSelector();
    renderElementIntoDOM(view);

    await coordinator.done();

    const menuItems = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<Menus.Menu.MenuItem>;

    assert.isTrue(menuItems[0].selected);

    cpuThrottlingManager.setCPUThrottlingRate(6);
    await coordinator.done();

    assert.isTrue(menuItems[2].selected);
  });
  it('reacts to changes in CPU throttling manager when it is unmounted and then remounted', async () => {
    const view = new Components.CPUThrottlingSelector.CPUThrottlingSelector();
    // Change the conditions before the component is put into the DOM.
    cpuThrottlingManager.setCPUThrottlingRate(6);

    renderElementIntoDOM(view);
    await coordinator.done();
    // Ensure that the component picks up the new changes and has selected the right thorttling setting
    const menuItems = view.shadowRoot!.querySelectorAll('devtools-menu-item') as NodeListOf<Menus.Menu.MenuItem>;
    assert.isTrue(menuItems[2].selected);
  });

});
