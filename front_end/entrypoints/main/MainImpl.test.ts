// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {getMenuForToolbarButton} from '../../testing/ContextMenuHelpers.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {checkForPendingActivity} from '../../testing/TrackAsyncOperations.js';
import {getVeHash} from '../../testing/VisualLoggingHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as Main from './main.js';

describeWithEnvironment('MainMenuItem', () => {
  beforeEach(async () => {
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

describeWithEnvironment('MainImpl VE logging startup', () => {
  let loadAppProviderForTest: (() => Promise<UI.AppProvider.AppProvider>)|null = null;

  UI.AppProvider.registerAppProvider({
    condition: () => loadAppProviderForTest !== null,
    loadAppProvider: () => loadAppProviderForTest!(),
    order: -1,
  });

  beforeEach(() => {
    Root.Runtime.experiments.clearForTest();
    sinon.stub(Main.MainImpl.MainImpl.prototype, 'requestAndRegisterLocaleData').resolves();
    sinon.stub(UI.ContextMenu.ContextMenu, 'installHandler');
    sinon.stub(UI.ARIAUtils.LiveAnnouncer, 'initializeAnnouncerElements');
  });

  afterEach(async () => {
    loadAppProviderForTest = null;
    await checkForPendingActivity();
    VisualLogging.setVeDebugLoggingEnabled(false);
    await VisualLogging.stopLogging();
    for (const style of document.body.querySelectorAll(':scope > style')) {
      style.remove();
    }
    document.body.classList.remove('overlay-scrollbar-enabled');
    document.documentElement.classList.remove('platform-' + Host.Platform.platform());
    Main.MainImpl.MainImpl.instanceForTest = null;
    Reflect.deleteProperty(globalThis, 'universe');
    Reflect.deleteProperty(self, 'Extensions');
  });

  it('starts VE logging only after app UI and toolbars are rendered without burning leading-edge slot', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'getHostConfig')
        .callsFake(cb => cb({devToolsVeLogging: {enabled: true}}));
    const readyForTest = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'readyForTest');
    const recordImpression = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordImpression');
    const throttlerScheduleSpy = sinon.spy(Common.Throttler.Throttler.prototype, 'schedule');

    const presentUI = sinon.spy((doc: Document) => {
      const panel = doc.createElement('div');
      panel.id = 'initial-panel';
      panel.setAttribute('jslog', 'Panel; context: elements');
      panel.style.width = '300px';
      panel.style.height = '300px';
      renderElementIntoDOM(panel, {allowMultipleChildren: true});
      VisualLogging.registerLoggable({}, `${VisualLogging.expand()}`, panel, new DOMRect(0, 0, 16, 16));
    });
    loadAppProviderForTest = async () => ({
      createApp: () => ({presentUI}),
    });

    const createToolbarsCalled = Promise.withResolvers<void>();
    const toolbarsResolvers = Promise.withResolvers<void>();
    sinon.stub(UI.InspectorView.InspectorView.prototype, 'createToolbars').callsFake(() => {
      const toolbar = document.createElement('div');
      toolbar.id = 'main-toolbar';
      toolbar.setAttribute('jslog', 'Toolbar; context: main');
      toolbar.style.width = '300px';
      toolbar.style.height = '30px';
      renderElementIntoDOM(toolbar, {allowMultipleChildren: true});
      createToolbarsCalled.resolve();
      return toolbarsResolvers.promise;
    });

    const main = new Main.MainImpl.MainImpl();

    await createToolbarsCalled.promise;
    sinon.assert.calledOnce(presentUI);
    sinon.assert.notCalled(recordImpression);
    sinon.assert.notCalled(readyForTest);

    toolbarsResolvers.resolve();
    await main.readyForTest();

    sinon.assert.calledOnce(readyForTest);
    sinon.assert.calledOnce(recordImpression);
    const scheduledThrottlersDuringStartup = [...throttlerScheduleSpy.thisValues];
    const impressions =
        recordImpression.firstCall.firstArg.impressions as Host.InspectorFrontendHostAPI.VisualElementImpression[];
    const contexts = impressions.map(i => i.context);
    assert.includeMembers(contexts, [await getVeHash('elements'), await getVeHash('main')]);
    assert.isTrue(impressions.some(i => i.width === 16 && i.height === 16));

    // Verify processingThrottler's leading-edge slot was not consumed during startup.
    recordImpression.resetHistory();
    const panelContent = document.createElement('div');
    panelContent.id = 'panel-content';
    panelContent.setAttribute('jslog', 'TreeItem; context: 42');
    panelContent.style.width = '100px';
    panelContent.style.height = '100px';
    renderElementIntoDOM(panelContent, {allowMultipleChildren: true});
    const [impressionEvent] = await expectCall(recordImpression);
    const processingThrottler = throttlerScheduleSpy.lastCall.thisValue;
    assert.notInclude(scheduledThrottlersDuringStartup, processingThrottler);
    assert.lengthOf(impressionEvent.impressions, 1);
    assert.deepInclude(impressionEvent.impressions[0], {type: 1, context: 42, width: 100, height: 100});
  });

  it('enables VE debug logging early in test mode before app UI loads', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'getHostConfig')
        .callsFake(cb => cb({devToolsVeLogging: {enabled: true, testing: true}}));
    const recordImpression = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordImpression');

    const loadAppProviderCalled = Promise.withResolvers<void>();
    const appProviderResolvers = Promise.withResolvers<UI.AppProvider.AppProvider>();
    let debugFormatDuringAppLoad: string|null = null;
    loadAppProviderForTest = () => {
      debugFormatDuringAppLoad = localStorage.getItem('veDebugLoggingEnabled');
      loadAppProviderCalled.resolve();
      return appProviderResolvers.promise;
    };
    sinon.stub(UI.InspectorView.InspectorView.prototype, 'createToolbars').resolves();

    const main = new Main.MainImpl.MainImpl();

    await loadAppProviderCalled.promise;
    assert.strictEqual(debugFormatDuringAppLoad, VisualLogging.DebugLoggingFormat.TEST);
    sinon.assert.notCalled(recordImpression);

    appProviderResolvers.resolve({
      createApp: () => ({
        presentUI: () => {
          const panel = document.createElement('div');
          panel.setAttribute('jslog', 'Panel; context: console');
          panel.style.width = '300px';
          panel.style.height = '300px';
          renderElementIntoDOM(panel, {allowMultipleChildren: true});
        },
      }),
    });
    await main.readyForTest();

    sinon.assert.calledOnce(recordImpression);
  });

  it('resolves readyForTest cleanly when VE logging is disabled', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'getHostConfig')
        .callsFake(cb => cb({devToolsVeLogging: {enabled: false}}));
    const recordImpression = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordImpression');

    loadAppProviderForTest = async () => ({
      createApp: () => ({
        presentUI: () => {
          const panel = document.createElement('div');
          panel.setAttribute('jslog', 'Panel; context: elements');
          panel.style.width = '300px';
          panel.style.height = '300px';
          renderElementIntoDOM(panel, {allowMultipleChildren: true});
        },
      }),
    });
    sinon.stub(UI.InspectorView.InspectorView.prototype, 'createToolbars').resolves();

    const main = new Main.MainImpl.MainImpl();
    await main.readyForTest();

    sinon.assert.notCalled(recordImpression);
  });
});
