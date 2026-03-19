// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as UI from '../../legacy.js';

import * as ObjectUI from './object_ui.js';

describeWithEnvironment('CustomPreviewComponent', () => {
  it('renders a read-only default body for custom previews', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'});
    sinon.stub(object, 'customPreview').returns({
      header: '["span", "test"]',
      bodyGetterId: '4' as Protocol.Runtime.RemoteObjectId,
    });
    // The callFunctionJSON resolves to null so that it falls back to the default body.
    sinon.stub(object, 'callFunctionJSON').resolves(null);

    const component = new ObjectUI.CustomPreviewComponent.CustomPreviewComponent(object);
    component.expandIfPossible();

    // Wait for the tree outline to be added to the DOM and populated.
    let defaultBodyElement = component.element.shadowRoot?.querySelector('.custom-expandable-section-default-body');
    while (!defaultBodyElement) {
      await new Promise(resolve => setTimeout(resolve, 0));
      defaultBodyElement = component.element.shadowRoot?.querySelector('.custom-expandable-section-default-body');
    }

    let firstChildNode = defaultBodyElement.shadowRoot?.querySelector('li');
    while (!firstChildNode) {
      await new Promise(resolve => setTimeout(resolve, 0));
      firstChildNode = defaultBodyElement.shadowRoot?.querySelector('li');
    }

    const treeElement = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(firstChildNode);
    assert.instanceOf(treeElement, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
    assert.isFalse(treeElement.editable);
  });
});
