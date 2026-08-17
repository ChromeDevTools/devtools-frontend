// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../../../core/sdk/sdk.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as UI from '../../legacy.js';

import * as ObjectUI from './object_ui.js';

describeWithEnvironment('ObjectPopoverHelper', () => {
  it('creates an editable ObjectPropertiesSection', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'});
    const popover = new UI.GlassPane.GlassPane();

    await ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper.buildObjectPopover(object, popover);

    // The ObjectPropertiesSection element should be a child of popover.contentElement
    const sectionElement = popover.contentElement.querySelector('.object-popover-tree');
    assert.exists(sectionElement);

    const section =
        UI.Widget.Widget.get(sectionElement) as ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget;
    assert.exists(section);

    assert.exists(section.objectTree);
    assert.isFalse(section.objectTree.readOnly);
    assert.isTrue(section.objectTree.expanded);
  });
});
