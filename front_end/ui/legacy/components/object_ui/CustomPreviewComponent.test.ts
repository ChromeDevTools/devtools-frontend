// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import {setupSettingsHooks} from '../../../../testing/SettingsHelpers.js';
import * as UI from '../../legacy.js';

import * as ObjectUI from './object_ui.js';

describe('CustomPreviewComponent', () => {
  setupSettingsHooks();

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

  it('rejects object reference tags that do not have exactly two elements', () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({});
    sinon.stub(object, 'customPreview').returns({
      header: JSON.stringify(['span', {}, ['object', {type: 'object', objectId: '1.2.3'}, 0]]),
    });
    const runtimeModel = sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel);
    runtimeModel.createRemoteObject.returns(SDK.RemoteObject.RemoteObject.fromLocalObject({}));
    sinon.stub(object, 'runtimeModel').returns(runtimeModel);

    new ObjectUI.CustomPreviewComponent.CustomPreviewComponent(object);

    sinon.assert.notCalled(runtimeModel.createRemoteObject);
  });

  it('renders object reference tags with exactly two elements', () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({});
    sinon.stub(object, 'customPreview').returns({
      header: JSON.stringify(['span', {}, ['object', {type: 'object', objectId: '1.2.3'}]]),
    });
    const runtimeModel = sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel);
    runtimeModel.createRemoteObject.returns(SDK.RemoteObject.RemoteObject.fromLocalObject({}));
    sinon.stub(object, 'runtimeModel').returns(runtimeModel);

    new ObjectUI.CustomPreviewComponent.CustomPreviewComponent(object);

    sinon.assert.calledOnceWithMatch(runtimeModel.createRemoteObject, {
      type: 'object' as Protocol.Runtime.RemoteObjectType,
      objectId: '1.2.3' as Protocol.Runtime.RemoteObjectId,
    });
  });
});
