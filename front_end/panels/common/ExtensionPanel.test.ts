// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Platform from '../../core/platform/platform.js';
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
});
