// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as Menus from '../../ui/components/menus/menus.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as InspectorMain from './inspector_main.js';

describeWithEnvironment('OutermostTargetSelector', () => {
  let tabTarget: SDK.Target.Target;
  let primaryTarget: SDK.Target.Target;
  let prerenderTarget: SDK.Target.Target;
  let view:
      ReturnType<typeof createViewFunctionStub<typeof InspectorMain.OutermostTargetSelector.OutermostTargetSelector>>;
  let selector: InspectorMain.OutermostTargetSelector.OutermostTargetSelector;

  beforeEach(async () => {
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
    view = createViewFunctionStub(InspectorMain.OutermostTargetSelector.OutermostTargetSelector);
    selector = new InspectorMain.OutermostTargetSelector.OutermostTargetSelector(undefined, view);
    renderElementIntoDOM(selector);
    await view.nextInput;
  });

  it('passes outermost targets as data items to the view', async () => {
    assert.deepEqual(view.input.items, [
      {title: 'primary', subtitle: 'example.com/'},
      {title: 'prerender1', subtitle: 'prerender'},
    ]);

    createTarget({parentTarget: primaryTarget});
    assert.deepEqual(view.input.items, [
      {title: 'primary', subtitle: 'example.com/'},
      {title: 'prerender1', subtitle: 'prerender'},
    ]);

    createTarget(
        {parentTarget: tabTarget, subtype: 'prerender', url: 'http://example.com/prerender2', name: 'prerender2'});
    await view.nextInput;
    assert.deepEqual(view.input.items, [
      {title: 'primary', subtitle: 'example.com/'},
      {title: 'prerender1', subtitle: 'prerender'},
      {title: 'prerender2', subtitle: 'prerender'},
    ]);

    prerenderTarget.dispose('');
    await view.nextInput;
    assert.deepEqual(view.input.items, [
      {title: 'primary', subtitle: 'example.com/'},
      {title: 'prerender2', subtitle: 'prerender'},
    ]);
  });

  it('hides when only one target is present', () => {
    assert.isTrue(selector.item().visible());
    assert.isFalse(selector.element.classList.contains('hidden'));
    prerenderTarget.dispose('');
    assert.isFalse(selector.item().visible());
    assert.isTrue(selector.element.classList.contains('hidden'));
  });

  it('keeps element hidden when shown in a toolbar with a single target', async () => {
    prerenderTarget.dispose('');
    selector.detach();

    const toolbarHost = new UI.Widget.Widget();
    renderElementIntoDOM(toolbarHost);
    const toolbar = toolbarHost.contentElement.createChild('devtools-toolbar');

    selector = new InspectorMain.OutermostTargetSelector.OutermostTargetSelector(undefined, view);
    toolbar.appendToolbarItem(selector.item());
    await view.nextInput;

    assert.isFalse(selector.item().visible());
    assert.isTrue(selector.element.classList.contains('hidden'));

    createTarget(
        {parentTarget: tabTarget, subtype: 'prerender', url: 'http://example.com/prerender2', name: 'prerender2'});
    await view.nextInput;
    assert.isTrue(selector.item().visible());
    assert.isFalse(selector.element.classList.contains('hidden'));
    toolbarHost.detach();
  });

  it('updates selected target when UI context flavor changes', async () => {
    assert.strictEqual(view.input.selectedIndex, 0);

    UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
    await view.nextInput;
    assert.strictEqual(view.input.selectedIndex, 1);

    UI.Context.Context.instance().setFlavor(SDK.Target.Target, primaryTarget);
    await view.nextInput;
    assert.strictEqual(view.input.selectedIndex, 0);
  });

  it('updates when name changes', async () => {
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, prerenderTarget);
    await view.nextInput;
    assert.strictEqual(view.input.items[1]?.title, 'prerender1');

    prerenderTarget.setName('prerender3');
    await view.nextInput;
    assert.strictEqual(view.input.items[1]?.title, 'prerender3');
    assert.strictEqual(view.input.selectedIndex, 1);
  });

  it('updates UI context flavor on selection', async () => {
    view.input.onSelect(0);
    await view.nextInput;
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), primaryTarget);
    assert.strictEqual(view.input.selectedIndex, 0);

    view.input.onSelect(1);
    await view.nextInput;
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), prerenderTarget);
    assert.strictEqual(view.input.selectedIndex, 1);
  });

  it('does not change UI context flavor within the same page', async () => {
    const subtarget = createTarget({parentTarget: primaryTarget});
    view.input.onSelect(0);
    await view.nextInput;
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), primaryTarget);
    UI.Context.Context.instance().setFlavor(SDK.Target.Target, subtarget);
    await view.nextInput;
    assert.strictEqual(view.input.selectedIndex, 0);
    assert.strictEqual(UI.Context.Context.instance().flavor(SDK.Target.Target), subtarget);
  });

  it('toggles menu open state', async () => {
    assert.isFalse(view.input.open);
    view.input.onToggleMenu();
    await view.nextInput;
    assert.isTrue(view.input.open);
    view.input.onCloseMenu();
    await view.nextInput;
    assert.isFalse(view.input.open);
  });

  describe('view', () => {
    function renderView(overrides: Partial<InspectorMain.OutermostTargetSelector.ViewInput> = {}): HTMLElement {
      selector.detach();
      const target = document.createElement('div');
      renderElementIntoDOM(target);
      InspectorMain.OutermostTargetSelector.DEFAULT_VIEW({
        items: [
          {title: 'primary', subtitle: 'example.com/'},
          {title: 'a'.repeat(150), subtitle: 'prerender'},
        ],
        selectedIndex: 0,
        open: false,
        onToggleMenu: () => {},
        onCloseMenu: () => {},
        onSelect: () => {},
        ...overrides,
      },
                                                         undefined, target);
      return target;
    }

    it('renders the dropdown button and menu items', () => {
      const target = renderView();
      const button = target.querySelector<HTMLButtonElement>('button#outermost-target-selector-button');
      assert.strictEqual(button?.title, 'Page: primary');
      assert.strictEqual(button?.querySelector('.title')?.textContent, 'primary');
      const menu = target.querySelector('devtools-menu');
      assert.strictEqual(menu?.getAttribute('origin'), 'outermost-target-selector-button');
      assert.isFalse(menu?.open);
      const menuItems = target.querySelectorAll('devtools-menu-item');
      assert.lengthOf(menuItems, 2);
      assert.strictEqual(menuItems[1].querySelector('.title')?.textContent, `${'a'.repeat(99)}…`);
    });

    it('forwards button and menu events from the view', () => {
      const onToggleMenu = sinon.spy();
      const onCloseMenu = sinon.spy();
      const onSelect = sinon.spy();
      const target = renderView({onToggleMenu, onCloseMenu, onSelect});
      target.querySelector<HTMLButtonElement>('button#outermost-target-selector-button')?.click();
      sinon.assert.calledOnce(onToggleMenu);
      const menu = target.querySelector('devtools-menu');
      menu?.dispatchEvent(new CustomEvent('menucloserequest'));
      sinon.assert.calledOnce(onCloseMenu);
      menu?.dispatchEvent(new Menus.Menu.MenuItemSelectedEvent(1));
      sinon.assert.calledOnceWithExactly(onSelect, 1);
    });
  });
});
