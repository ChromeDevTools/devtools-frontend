// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Common from './common.js';

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

describeWithEnvironment('ExtensionSidebarPane', () => {
  it('creates a read-only object properties section for objects', async () => {
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
});
