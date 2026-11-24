// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Extensions from '../../models/extensions/extensions.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Common from './common.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('ExtensionView', () => {
  it('updates view input when properties change', async () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const viewStub = createViewFunctionStub(Common.ExtensionView.ExtensionView);
    const extensionView = new Common.ExtensionView.ExtensionView(undefined, viewStub);
    extensionView.data = {server, id: 'ext-view-1', src: 'chrome-extension://ext/view.html', className: 'extension'};
    renderElementIntoDOM(extensionView);
    await viewStub.nextInput;

    assert.strictEqual(viewStub.input.src, 'chrome-extension://ext/view.html');
    assert.strictEqual(viewStub.input.className, 'extension');

    extensionView.data = {server, id: 'ext-view-1', src: 'chrome-extension://ext/view2.html', className: 'extension'};
    await viewStub.nextInput;
    assert.strictEqual(viewStub.input.src, 'chrome-extension://ext/view2.html');
  });

  it('renders iframe and invokes onLoad in DEFAULT_VIEW', () => {
    const target = document.createElement('div');
    const output: Common.ExtensionView.ViewOutput = {};
    const onLoad = sinon.stub();
    Common.ExtensionView.DEFAULT_VIEW({src: 'about:blank', className: 'extension', onLoad}, output, target);
    const iframe = target.querySelector('iframe.extension');
    assert.instanceOf(iframe, HTMLIFrameElement);
    assert.isFunction(output.getContentWindow);
    iframe.dispatchEvent(new Event('load'));
    sinon.assert.calledOnce(onLoad);
  });
});

describeWithEnvironment('ExtensionNotifierView', () => {
  it('notifies server when shown and hidden', () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const notifierView = new Common.ExtensionView.ExtensionNotifierView();
    notifierView.data = {server, id: 'ext-notifier-1'};

    renderElementIntoDOM(notifierView);
    sinon.assert.calledOnceWithExactly(server.notifyViewShown, 'ext-notifier-1');

    notifierView.detach();
    sinon.assert.calledOnceWithExactly(server.notifyViewHidden, 'ext-notifier-1');
  });

  it('synchronizes notifications when server or id changes while visible', () => {
    const server1 = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const server2 = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const notifierView = new Common.ExtensionView.ExtensionNotifierView();
    renderElementIntoDOM(notifierView);

    notifierView.data = {server: server1, id: ''};
    sinon.assert.notCalled(server1.notifyViewShown);
    notifierView.data = {server: server1, id: 'ext-notifier-1'};
    sinon.assert.calledOnceWithExactly(server1.notifyViewShown, 'ext-notifier-1');

    notifierView.data = {server: server1, id: 'ext-notifier-2'};
    sinon.assert.calledOnceWithExactly(server1.notifyViewHidden, 'ext-notifier-1');
    sinon.assert.calledWithExactly(server1.notifyViewShown.secondCall, 'ext-notifier-2');

    notifierView.data = {server: server2, id: 'ext-notifier-2'};
    sinon.assert.calledWithExactly(server1.notifyViewHidden.secondCall, 'ext-notifier-2');
    sinon.assert.calledOnceWithExactly(server2.notifyViewShown, 'ext-notifier-2');
    notifierView.detach();
  });
});

describeWithEnvironment('ExtensionPanel', () => {
  it('passes initial state via view function', () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const dummySearchableView = sinon.createStubInstance(UI.SearchableView.SearchableView);
    const view = createViewFunctionStub(Common.ExtensionPanel.ExtensionPanel, {
      searchableView: dummySearchableView,
    });
    const panel = new Common.ExtensionPanel.ExtensionPanel(server, 'test-panel', 'panel-id',
                                                           'chrome-extension://ext/page.html', view);

    assert.strictEqual(view.input.server, server);
    assert.strictEqual(view.input.id, 'panel-id');
    assert.strictEqual(view.input.pageURL, 'chrome-extension://ext/page.html');
    assert.strictEqual(view.input.searchProvider, panel);
    assert.lengthOf(view.input.toolbarItems, 0);
    assert.strictEqual(panel.searchableView(), dummySearchableView);
  });

  it('updates toolbar items via view function', async () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const view = createViewFunctionStub(Common.ExtensionPanel.ExtensionPanel);
    const panel = new Common.ExtensionPanel.ExtensionPanel(server, 'test-panel', 'panel-id',
                                                           'chrome-extension://ext/page.html', view);

    const button = new Common.ExtensionPanel.ExtensionButton(server, 'btn-1', 'chrome-extension://ext/icon.png',
                                                             'My Tooltip', false);
    panel.addToolbarItem(button.toolbarButton());
    await view.nextInput;

    assert.lengthOf(view.input.toolbarItems, 1);
    assert.strictEqual(view.input.toolbarItems[0].id, 'btn-1');
    assert.strictEqual(view.input.toolbarItems[0].iconURL, 'chrome-extension://ext/icon.png');
    assert.strictEqual(view.input.toolbarItems[0].tooltip, 'My Tooltip');
    assert.isFalse(view.input.toolbarItems[0].disabled);

    view.input.toolbarItems[0].onClick();
    sinon.assert.calledOnceWithExactly(server.notifyButtonClicked, 'btn-1');

    button.update('chrome-extension://ext/icon2.png', 'Updated Tooltip', true);
    await view.nextInput;

    assert.strictEqual(view.input.toolbarItems[0].iconURL, 'chrome-extension://ext/icon2.png');
    assert.strictEqual(view.input.toolbarItems[0].tooltip, 'Updated Tooltip');
    assert.isTrue(view.input.toolbarItems[0].disabled);
  });

  it('forwards search actions to the extension server', () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const dummySearchableView = sinon.createStubInstance(UI.SearchableView.SearchableView);
    const view = createViewFunctionStub(Common.ExtensionPanel.ExtensionPanel, {
      searchableView: dummySearchableView,
    });
    const panel = new Common.ExtensionPanel.ExtensionPanel(server, 'test-panel', 'panel-id',
                                                           'chrome-extension://ext/page.html', view);

    panel.performSearch(new UI.SearchableView.SearchConfig('needle', false, false, false), true);
    sinon.assert.calledWithExactly(server.notifySearchAction, 'panel-id',
                                   Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.PerformSearch, 'needle');

    panel.jumpToNextSearchResult();
    sinon.assert.calledWithExactly(server.notifySearchAction, 'panel-id',
                                   Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.NextSearchResult);

    panel.jumpToPreviousSearchResult();
    sinon.assert.calledWithExactly(server.notifySearchAction, 'panel-id',
                                   Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.PreviousSearchResult);

    panel.onSearchCanceled();
    sinon.assert.calledWithExactly(server.notifySearchAction, 'panel-id',
                                   Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.CancelSearch);
    sinon.assert.calledOnceWithExactly(dummySearchableView.updateSearchMatchesCount, 0);
  });

  it('renders toolbar items in DEFAULT_VIEW', () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const searchable = sinon.createStubInstance(Common.ExtensionPanel.ExtensionPanel);
    const target = document.createElement('div');
    const output: Common.ExtensionPanel.ViewOutput = {};

    Common.ExtensionPanel.DEFAULT_VIEW({
      server,
      id: 'panel-id',
      pageURL: 'about:blank',
      searchProvider: searchable,
      toolbarItems: [],
    },
                                       output, target);

    const toolbar = target.querySelector('devtools-toolbar');
    assert.exists(toolbar);
    assert.isTrue(toolbar.hasAttribute('hidden'));
    assert.instanceOf(output.searchableView, UI.SearchableView.SearchableView);

    const onClick = sinon.stub();
    Common.ExtensionPanel.DEFAULT_VIEW({
      server,
      id: 'panel-id',
      pageURL: 'about:blank',
      searchProvider: searchable,
      toolbarItems: [{
        id: 'btn-1',
        iconURL: 'chrome-extension://ext/icon.png',
        tooltip: 'Click me',
        disabled: false,
        onClick,
      }],
    },
                                       output, target);

    assert.isFalse(toolbar.hasAttribute('hidden'));
    const button = toolbar.querySelector('devtools-button');
    assert.exists(button);
    assert.strictEqual(button.title, 'Click me');
    button.click();
    sinon.assert.calledOnce(onClick);
  });

  it('mounts the extension iframe when the panel is attached to the DOM', async () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const panel = new Common.ExtensionPanel.ExtensionPanel(server, 'test-panel', 'panel-id', 'about:blank');

    renderElementIntoDOM(panel);
    await UI.Widget.Widget.allUpdatesComplete;

    const iframe = panel.element.querySelector('iframe.extension');
    assert.instanceOf(iframe, HTMLIFrameElement);
    assert.strictEqual(iframe.getAttribute('src'), 'about:blank');
  });
});
describeWithEnvironment('ExtensionSidebarPane', () => {
  it('creates a read-only object properties section for objects', async () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const sidebarPane = new Common.ExtensionPanel.ExtensionSidebarPane(
        server, 'panel-name', 'panel title' as Platform.UIString.LocalizedString, 'id');
    renderElementIntoDOM(sidebarPane);

    await new Promise(resolve => sidebarPane.setObject({foo: 'bar'}, 'title', resolve));

    const sectionElement = sidebarPane.element.firstElementChild?.firstElementChild;
    assert.exists(sectionElement);
    const section = UI.Widget.Widget.get(sectionElement);
    assert.instanceOf(section, ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget);
    assert.exists(section.objectTree);
    assert.isTrue(section.objectTree.readOnly);
  });

  it('materializes the object properties section while detached', async () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const sidebarPane = new Common.ExtensionPanel.ExtensionSidebarPane(
        server, 'panel-name', 'panel title' as Platform.UIString.LocalizedString, 'id');

    await new Promise(resolve => sidebarPane.setObject({foo: 'bar'}, 'title', resolve));

    const sectionElement = sidebarPane.element.firstElementChild?.firstElementChild;
    assert.exists(sectionElement);
    const section = UI.Widget.Widget.get(sectionElement);
    assert.instanceOf(section, ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget);
    assert.exists(section.objectTree);
    assert.isTrue(section.objectTree.readOnly);
  });

  it('updates view input when setPage is called', async () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const view = createViewFunctionStub(Common.ExtensionPanel.ExtensionSidebarPane);
    const sidebarPane = new Common.ExtensionPanel.ExtensionSidebarPane(
        server, 'elements', 'Sidebar' as Platform.UIString.LocalizedString, 'sidebar-1', 'ext-1', view);
    await view.nextInput;

    assert.isFalse(view.input.showObjectProperties);
    assert.isUndefined(view.input.pageURL);

    sidebarPane.setPage(urlString`chrome-extension://ext-1/sidebar.html`);
    await view.nextInput;

    assert.strictEqual(view.input.pageURL, urlString`chrome-extension://ext-1/sidebar.html`);
    assert.strictEqual(view.input.height, '150px');
    assert.isFalse(view.input.showObjectProperties);
  });

  it('updates view input when setHeight is called', async () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const view = createViewFunctionStub(Common.ExtensionPanel.ExtensionSidebarPane);
    const sidebarPane = new Common.ExtensionPanel.ExtensionSidebarPane(
        server, 'elements', 'Sidebar' as Platform.UIString.LocalizedString, 'sidebar-1', 'ext-1', view);
    await view.nextInput;

    sidebarPane.setHeight('250px');
    await view.nextInput;

    assert.strictEqual(view.input.height, '250px');
  });

  it('does not allow injecting extra CSS declarations via height in SIDEBAR_PANE_DEFAULT_VIEW', () => {
    const target = document.createElement('div');
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    Common.ExtensionPanel.SIDEBAR_PANE_DEFAULT_VIEW(
        {
          server,
          id: 'sidebar-1',
          height: '100px; position: fixed; inset: 0px; z-index: 99999',
          showObjectProperties: false,
        },
        undefined,
        target,
    );

    assert.strictEqual(target.style.position, '');
    assert.strictEqual(target.style.zIndex, '');
    assert.strictEqual(target.style.height, '');
  });

  it('cancels pending setExpression when setPage is called before evaluation completes', async () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const view = createViewFunctionStub(Common.ExtensionPanel.ExtensionSidebarPane);
    const sidebarPane = new Common.ExtensionPanel.ExtensionSidebarPane(
        server, 'elements', 'Sidebar' as Platform.UIString.LocalizedString, 'sidebar-1', 'ext-1', view);
    await view.nextInput;

    const callback = sinon.stub();
    sidebarPane.setExpression('1 + 1', 'Result', undefined, 'chrome-extension://ext-1', callback);
    await view.nextInput;

    assert.isTrue(view.input.showObjectProperties);
    assert.isUndefined(view.input.pageURL);

    sidebarPane.setPage(urlString`chrome-extension://ext-1/other.html`);
    await view.nextInput;

    const evaluateCallback = server.evaluate.firstCall.args[5];
    evaluateCallback(null, sinon.createStubInstance(SDK.RemoteObject.RemoteObject), false);
    sinon.assert.calledOnceWithExactly(callback, 'operation cancelled');
  });

  it('generates a stable, namespaced viewId satisfying viewId requirements', () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const title = 'My Sidebar' as Platform.UIString.LocalizedString;
    const sidebarPane =
        new Common.ExtensionPanel.ExtensionSidebarPane(server, 'elements', title, 'sidebar_pane_1', 'my-extension');

    assert.strictEqual(sidebarPane.viewId(), 'extension-sidebar-my-extension-elements-4t2ysc');
    assert.isTrue(Platform.StringUtilities.isExtendedKebabCase(sidebarPane.viewId()));
  });

  it('generates a valid viewId for non-ASCII titles', () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const nonAsciiTitle = '侧边栏' as Platform.UIString.LocalizedString;
    const sidebarPane = new Common.ExtensionPanel.ExtensionSidebarPane(server, 'elements', nonAsciiTitle,
                                                                       'sidebar_pane_1', 'my-extension');

    assert.strictEqual(sidebarPane.viewId(), 'extension-sidebar-my-extension-elements-f2y01j');
    assert.isTrue(Platform.StringUtilities.isExtendedKebabCase(sidebarPane.viewId()));
  });

  it('sanitizes non-kebab-case panel names in viewId', () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const title = 'Sidebar' as Platform.UIString.LocalizedString;
    const sidebarPane = new Common.ExtensionPanel.ExtensionSidebarPane(server, 'Custom Panel 1!', title,
                                                                       'sidebar_pane_1', 'my-extension');

    assert.strictEqual(sidebarPane.viewId(), 'extension-sidebar-my-extension-custom-panel-1-3gj2w0');
    assert.isTrue(Platform.StringUtilities.isExtendedKebabCase(sidebarPane.viewId()));
  });

  it('notifies view hidden before view shown when switching between page and object while visible', async () => {
    const server = sinon.createStubInstance(Common.ExtensionServer.ExtensionServer);
    const sidebarPane = new Common.ExtensionPanel.ExtensionSidebarPane(
        server, 'elements', 'Sidebar' as Platform.UIString.LocalizedString, 'sidebar-1');
    renderElementIntoDOM(sidebarPane);

    sidebarPane.setPage(urlString`about:blank`);
    await UI.Widget.Widget.allUpdatesComplete;

    const iframe = sidebarPane.element.querySelector('iframe.extension');
    assert.instanceOf(iframe, HTMLIFrameElement);
    iframe.dispatchEvent(new Event('load'));
    sinon.assert.calledOnce(server.notifyViewShown);

    server.notifyViewShown.resetHistory();
    server.notifyViewHidden.resetHistory();

    await new Promise(resolve => sidebarPane.setObject({foo: 'bar'}, 'title', resolve));

    sinon.assert.calledOnceWithExactly(server.notifyViewHidden, 'sidebar-1');
    sinon.assert.calledOnceWithExactly(server.notifyViewShown, 'sidebar-1');
    sinon.assert.callOrder(server.notifyViewHidden, server.notifyViewShown);

    server.notifyViewShown.resetHistory();
    server.notifyViewHidden.resetHistory();

    sidebarPane.setPage(urlString`about:blank`);
    await UI.Widget.Widget.allUpdatesComplete;

    const nextIframe = sidebarPane.element.querySelector('iframe.extension');
    assert.instanceOf(nextIframe, HTMLIFrameElement);
    nextIframe.dispatchEvent(new Event('load'));

    sinon.assert.calledOnceWithExactly(server.notifyViewHidden, 'sidebar-1');
    sinon.assert.calledOnce(server.notifyViewShown);
    sinon.assert.callOrder(server.notifyViewHidden, server.notifyViewShown);
    sidebarPane.detach();
  });
});
