// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as ObjectUI from '../object_ui/object_ui.js';

import * as SourceFrame from './source_frame.js';

describeWithEnvironment('JSONView', () => {
  it('instantiates a read-only ObjectPropertiesSection', async () => {
    const parsedJSON = new SourceFrame.JSONView.ParsedJSON({foo: 'bar'}, '', '');
    const jsonView = new SourceFrame.JSONView.JSONView(parsedJSON);
    jsonView.markAsRoot();
    renderElementIntoDOM(jsonView);

    const treeOutlineElement = jsonView.element.lastElementChild;
    assert.exists(treeOutlineElement);
    const section = ObjectUI.ObjectPropertiesSection.getObjectPropertiesSectionFrom(treeOutlineElement);
    assert.exists(section);

    const rootElement = section.objectTreeElement();
    await rootElement.onpopulate();
    const child = rootElement.childAt(0);
    assert.instanceOf(child, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
    assert.isFalse(child.editable);
    jsonView.detach();
  });
});
