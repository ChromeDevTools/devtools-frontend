// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, it} from 'mocha';

import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import * as Menus from '../../ui/components/menus/menus.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as InspectorMain from './inspector_main.js';

describeWithEnvironment('OutermostTargetSelector', () => {
  let tabTarget: SDK.Target.Target;
  let primaryTarget: SDK.Target.Target;
  let prerenderTarget: SDK.Target.Target;
  let selector: InspectorMain.OutermostTargetSelector.OutermostTargetSelector;

  beforeEach(() => {
    tabTarget = createTarget({
      type: SDK.Target.Type.TAB,
      url: 'http://example.com/',
      name: 'tab',
      connection: new MockCDPConnection([
        ['Target.setAutoAttach', () => ({result: {}})],
        ['Target.setDiscoverTargets', () => ({result: {}})],
        ['Target.setRemoteLocations', () => ({result: {}})],
      ]),
    });
    primaryTarget = createTarget({parentTarget: tabTarget, url: 'http://example.com/', name: 'primary'});
    prerenderTarget = createTarget(
        {parentTarget: tabTarget, subtype: 'prerender', url: 'http://example.com/prerender1', name: 'prerender1'});
    selector = new InspectorMain.OutermostTargetSelector.OutermostTargetSelector();
    renderElementIntoDOM(selector.item().element);
  });

  function getItemTitles(): string[] {
    return [...selector.item().element.querySelectorAll('.outermost-target-selector-item .title')].map(
        el => el.textContent ?? '');
  }

  function getButtonTitle(): string {
    return selector.item().element.querySelector<HTMLButtonElement>('button#outermost-target-selector-button')?.title ??
        '';
  }

  it('renders menu items for outermost targets', () => {
    assert.deepEqual(getItemTitles(), ['primary', 'prerender1']);

    createTarget({parentTarget: primaryTarget});
    assert.deepEqual(getItemTitles(), ['primary', 'prerender1']);

    createTarget(
        {parentTarget: tabTarget, subtype: 'prerender', url: 'http://example.com/prerender2', name: 'prerender2'});
    assert.deepEqual(getItemTitles(), ['primary', 'prerender1', 'prerender2']);

    prerenderTarget.dispose('');
    assert.deepEqual(getItemTitles(), ['primary', 'prerender2']);
  });

  it('hides when only one target is present', () => {
    assert.isTrue(selector.item().visible());
    prerenderTarget.dispose('');
    assert.isFalse(selector.item().visible());
  });

  it('updates selected target when UI context flavor changes', () => {
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, primaryTarget);
    assert.strictEqual(getButtonTitle(), 'Page: primary');
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
    assert.strictEqual(getButtonTitle(), 'Page: prerender1');
  });

  it('updates when name changes', () => {
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
    assert.strictEqual(getButtonTitle(), 'Page: prerender1');
    prerenderTarget.setName('prerender3');

    assert.strictEqual(getButtonTitle(), 'Page: prerender3');
  });

  it('updates UI context flavor on menu selection', () => {
    const menu = selector.item().element.querySelector('devtools-menu');
    assert.exists(menu);
    menu.dispatchEvent(new Menus.Menu.MenuItemSelectedEvent(0));
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), primaryTarget);

    menu.dispatchEvent(new Menus.Menu.MenuItemSelectedEvent(1));
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), prerenderTarget);
  });

  it('does not switch target within the same page', () => {
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, primaryTarget);
    const subtarget = createTarget({parentTarget: primaryTarget});
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, subtarget);

    assert.strictEqual(getButtonTitle(), 'Page: primary');
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), subtarget);
  });
});
