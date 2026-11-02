// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Common from './common.js';

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
