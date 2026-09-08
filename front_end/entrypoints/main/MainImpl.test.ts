// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {getMenuForToolbarButton} from '../../testing/ContextMenuHelpers.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Main from './main.js';

describeWithEnvironment('MainMenuItem', () => {
  beforeEach(async () => {
    stubNoopSettings();
    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      keyAndModifiersForAction: () => {},
      shortcutTitleForAction: () => {},
      shortcutsForAction: () => [{title: () => 'Ctrl+Shift+D'}] as unknown as UI.KeyboardShortcut.KeyboardShortcut[],
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
    const tabTaget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTaget, subtype: 'prerender'});
    createTarget({parentTarget: tabTaget});

    sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
        .withArgs(sinon.match(/inspector-main.focus-debuggee|main.toggle-drawer|freestyler.main-menu/))
        .returns(true);
    sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'getAction')
        .withArgs(sinon.match(/inspector-main.focus-debuggee|main.toggle-drawer|freestyler.main-menu/))
        .returns(sinon.createStubInstance(UI.ActionRegistration.Action));
  });

  it('includes focus debuggee item when undocked', async () => {
    UI.DockController.DockController.instance().setDockSide(UI.DockController.DockState.UNDOCKED);

    const item = new Main.MainImpl.MainMenuItem().item() as UI.Toolbar.ToolbarMenuButton;
    const menu = getMenuForToolbarButton(item);
    assert.exists(
        menu.defaultSection().items.find((item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Focus page'));
  });

  it('does not include focus debuggee item when docked', async () => {
    UI.DockController.DockController.instance().setDockSide(UI.DockController.DockState.BOTTOM);

    const item = new Main.MainImpl.MainMenuItem().item() as UI.Toolbar.ToolbarMenuButton;
    assert.exists(item);

    const contextMenuShow = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    item.clicked(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }));

    sinon.assert.calledOnce(contextMenuShow);
    assert.notExists(contextMenuShow.thisValues[0].defaultSection().items.find(
        (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Focus page'));
  });

  it('does not focus main menu button when undocking or re-docking', async () => {
    const dockController = UI.DockController.DockController.instance({forceNew: true, canDock: true});
    dockController.setDockSide(UI.DockController.DockState.UNDOCKED);

    const mainMenuItem = new Main.MainImpl.MainMenuItem();
    const item = mainMenuItem.item() as UI.Toolbar.ToolbarMenuButton;
    const focusSpy = sinon.spy(item.element, 'focus');

    const menu = getMenuForToolbarButton(item);
    const dockSideItem = menu.headerSection().items.find(
        (item: UI.ContextMenu.Item) => item.buildDescriptor().jslogContext === 'dock-side',
    );
    assert.exists(dockSideItem);

    // Trigger re-docking from UNDOCKED to LEFT.
    const customElement = dockSideItem.customElement as HTMLElement;
    const leftButton = customElement.querySelector('devtools-button[aria-label="Dock to left"]') as HTMLElement;
    assert.exists(leftButton);
    leftButton.click();

    // Verify focus is not scheduled on AFTER_DOCK_SIDE_CHANGED.
    sinon.assert.notCalled(focusSpy);
  });
});

describeWithEnvironment('ConsoleProfileFinishedListener', () => {
  it('reveals profile finished data on console profile finished event', async () => {
    const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();
    // Class created to register the listener since we need to verify reveal is called
    new Main.MainImpl.ConsoleProfileFinishedListener();
    const target = createTarget({type: SDK.Target.Type.FRAME});
    const cpuProfilerModel = target.model(SDK.CPUProfilerModel.CPUProfilerModel);
    assert.exists(cpuProfilerModel);

    cpuProfilerModel.consoleProfileFinished({
      id: 'profile1',
      location: {lineNumber: 0, columnNumber: 0, scriptId: '1' as Protocol.Runtime.ScriptId},
      profile: {nodes: [], startTime: 0, endTime: 1000},
      title: 'my-profile',
    });

    sinon.assert.calledOnce(revealStub);
    const [revealable] = revealStub.getCall(0).args;
    assert.instanceOf(revealable, SDK.CPUProfilerModel.ProfileFinishedData);
  });
});

describeWithEnvironment('MainImpl clipboard forwarding', () => {
  it('dispatches a composed clipboard event when a clipboard event is triggered on an active element inside shadow DOM',
     () => {
       const main = new Main.MainImpl.MainImpl();

       const container = document.createElement('div');
       const shadowRoot = container.attachShadow({mode: 'open'});
       const input = document.createElement('input');
       shadowRoot.appendChild(input);
       renderElementIntoDOM(container);

       input.focus();

       let receivedEvent: CustomEvent|null = null;
       container.addEventListener('clipboard-copy', (e: Event) => {
         receivedEvent = e as CustomEvent;
       });

       const copyEvent = new Event('copy', {bubbles: true});
       Object.defineProperty(copyEvent, 'target', {value: document.body});
       main.redispatchClipboardEventForTest(copyEvent);

       assert.exists(receivedEvent);
       assert.isTrue((receivedEvent as CustomEvent).composed);
       assert.isTrue((receivedEvent as CustomEvent).bubbles);
     });
});
