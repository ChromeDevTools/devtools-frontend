// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import {findMenuItemWithLabel, getContextMenuForElement} from '../../../../testing/ContextMenuHelpers.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import {setupSettingsHooks} from '../../../../testing/SettingsHelpers.js';
import * as UI from '../../legacy.js';

import * as ObjectUI from './object_ui.js';

describe('CustomPreviewComponent', () => {
  setupLocaleHooks();
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
  it('renders custom styling sanitization in JSONML elements', () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({});
    sinon.stub(object, 'customPreview').returns({
      header: JSON.stringify(['span', {style: 'background-color: red; width: 100px;'}, 'styled']),
    });

    const component = new ObjectUI.CustomPreviewComponent.CustomPreviewComponent(object);
    const customSection = component.element.shadowRoot?.querySelector('.custom-expandable-section');
    assert.exists(customSection);
    const headerSpan = customSection?.firstChild as HTMLElement;
    assert.exists(headerSpan);
    assert.strictEqual(headerSpan.textContent, 'styled');
    assert.strictEqual(headerSpan.style.backgroundColor, 'red');
  });

  it('expands custom preview if has body', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({});
    sinon.stub(object, 'customPreview').returns({
      header: JSON.stringify(['span', {}, 'Header']),
      bodyGetterId: '4' as Protocol.Runtime.RemoteObjectId,
    });
    // Return a basic table JSONML body
    const callFunctionJSONStub =
        sinon.stub(object, 'callFunctionJSON').resolves(['table', {}, ['tr', {}, ['td', {}, 'cell']]]);

    const component = new ObjectUI.CustomPreviewComponent.CustomPreviewComponent(object);

    const customSection = component.element.shadowRoot?.querySelector('.custom-expandable-section');
    assert.exists(customSection);
    component.expandIfPossible();

    // Await the stub's returned promise so that the microtask queue resolves loadBody's .then before we continue
    await callFunctionJSONStub.firstCall.returnValue;

    const table = customSection?.querySelector('table');
    assert.exists(table);
    assert.strictEqual(table?.textContent, 'cell');
  });

  it('can be disassembled past the context menu', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'});
    sinon.stub(object, 'customPreview').returns({
      header: JSON.stringify(['span', {}, 'Header']),
    });

    const component = new ObjectUI.CustomPreviewComponent.CustomPreviewComponent(object);
    renderElementIntoDOM(component.element);
    const customSection = component.element.shadowRoot?.querySelector('.custom-expandable-section');
    assert.exists(customSection);

    const contextMenu = getContextMenuForElement(component.element);
    const disassembleItem = findMenuItemWithLabel(contextMenu.revealSection(), 'Show as JavaScript object');
    assert.exists(disassembleItem);

    contextMenu.invokeHandler(disassembleItem.id());
    await raf();

    const standardSection = component.element.shadowRoot?.querySelector('devtools-tree');
    assert.exists(standardSection);
    const customSectionAfter = component.element.shadowRoot?.querySelector('.custom-expandable-section');
    assert.notExists(customSectionAfter);
  });

  it('screenshot: renders a custom preview', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'});
    sinon.stub(object, 'customPreview').returns({
      header: '["span", {"style": "color: red;"}, "Header text"]',
    });

    const component = new ObjectUI.CustomPreviewComponent.CustomPreviewComponent(object);
    renderElementIntoDOM(component.element, {includeCommonStyles: true});

    await assertScreenshot('custom_preview/base.png');
  });

  it('screenshot: renders an expandable custom preview', async () => {
    const object = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'});
    sinon.stub(object, 'customPreview').returns({
      header: '["span", {}, "Expandable"]',
      bodyGetterId: '4' as Protocol.Runtime.RemoteObjectId,
    });
    const callFunctionJSONStub = sinon.stub(object, 'callFunctionJSON').resolves([
      'ol',
      {},
      ['li', {}, ['span', {}, 'body item']],
    ]);

    const component = new ObjectUI.CustomPreviewComponent.CustomPreviewComponent(object);
    renderElementIntoDOM(component.element, {includeCommonStyles: true});
    component.expandIfPossible();
    await callFunctionJSONStub.firstCall.returnValue;

    await assertScreenshot('custom_preview/expanded.png');
  });
});
