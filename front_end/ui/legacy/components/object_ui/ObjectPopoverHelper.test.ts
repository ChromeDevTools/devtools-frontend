// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

    const section = ObjectUI.ObjectPropertiesSection.getObjectPropertiesSectionFrom(sectionElement);
    assert.exists(section);

    const rootElement = section.objectTreeElement();
    await rootElement.onpopulate();
    const child = rootElement.childAt(0);
    assert.instanceOf(child, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
    assert.isTrue(child.editable);
  });
});
