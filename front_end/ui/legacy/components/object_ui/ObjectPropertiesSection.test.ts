// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import {assertScreenshot, dispatchClickEvent, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../../../testing/ExpectStubCall.js';
import * as UI from '../../legacy.js';

import * as ObjectUI from './object_ui.js';

describe('ObjectPropertiesSection', () => {
  describeWithEnvironment('ObjectPropertiesSection', () => {
    it('properties with null and undefined values are shown by default', async () => {
      const object = SDK.RemoteObject.RemoteObject.fromLocalObject({
        s: 'string',
        n: null,
        u: undefined,
      });
      const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection(object, 'title');
      const rootElement = section.objectTreeElement();
      await rootElement.onpopulate();

      assert.strictEqual(rootElement.childCount(), 3);
      const properties = [rootElement.childAt(0)!, rootElement.childAt(1)!, rootElement.childAt(2)!] as
          ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement[];
      const n = properties.find(p => p.property.name === 'n')!;
      const s = properties.find(p => p.property.name === 's')!;
      const u = properties.find(p => p.property.name === 'u')!;

      assert.isFalse(n.hidden);
      assert.isFalse(s.hidden);
      assert.isFalse(u.hidden);
    });

    it('properties with null and undefined values are hidden when the setting is disabled', async () => {
      const object = SDK.RemoteObject.RemoteObject.fromLocalObject({
        s: 'string',
        n: null,
        u: undefined,
      });
      const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection(object, 'title');
      section.root.includeNullOrUndefinedValues = false;
      const rootElement = section.objectTreeElement();
      await rootElement.onpopulate();

      const properties = [rootElement.childAt(0)!, rootElement.childAt(1)!, rootElement.childAt(2)!].map(
          x => x as ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
      const n = properties.find(p => p.property.name === 'n')!;
      const s = properties.find(p => p.property.name === 's')!;
      const u = properties.find(p => p.property.name === 'u')!;

      assert.isTrue(n.hidden);
      assert.isFalse(s.hidden);
      assert.isTrue(u.hidden);
    });

    it('shows "Show all" in context menu', () => {
      const object = SDK.RemoteObject.RemoteObject.fromLocalObject({});
      const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection(object, 'title');
      const rootElement = section.objectTreeElement();
      const event = new MouseEvent('contextmenu');

      const showSpy = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      const appendCheckboxItemSpy = sinon.spy(UI.ContextMenu.Section.prototype, 'appendCheckboxItem');

      (rootElement as unknown as {onContextMenu: (e: Event) => void}).onContextMenu(event);

      sinon.assert.called(appendCheckboxItemSpy);
      const showAllItem = appendCheckboxItemSpy.args.find(args => args[0] === 'Show all');
      assert.exists(showAllItem);
      assert.isTrue(showAllItem[2]?.checked);

      showSpy.restore();
      appendCheckboxItemSpy.restore();
    });

    describe('appendMemoryIcon', () => {
      it('appends a memory icon for inspectable object types', () => {
        const object = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
        object.isLinearMemoryInspectable.returns(true);

        const div = document.createElement('div');
        assert.isFalse(div.hasChildNodes());
        ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.appendMemoryIcon(div, object);
        assert.isTrue(div.hasChildNodes());
        const icon = div.querySelector('devtools-icon');
        assert.isNotNull(icon);
      });

      it('doesn\'t append a memory icon for non-inspectable object types', () => {
        const object = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
        object.isLinearMemoryInspectable.returns(false);

        const div = document.createElement('div');
        assert.isFalse(div.hasChildNodes());
        ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.appendMemoryIcon(div, object);
        assert.strictEqual(div.childElementCount, 0);
      });

      it('triggers the correct revealer upon \'click\'', () => {
        const object = sinon.createStubInstance(SDK.RemoteObject.RemoteObject);
        object.isLinearMemoryInspectable.returns(true);
        const expression = 'foo';

        const div = document.createElement('div');
        ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.appendMemoryIcon(div, object, expression);
        const icon = div.querySelector('devtools-icon');
        assert.exists(icon);
        const reveal = sinon.stub(Common.Revealer.RevealerRegistry.prototype, 'reveal');

        dispatchClickEvent(icon);

        sinon.assert.calledOnceWithMatch(reveal, sinon.match({object, expression}), false);
      });
    });
  });
});

describeWithEnvironment('ObjectPropertyTreeElement', () => {
  it('populates the context menu with a copy option for LocalJSONObjects', () => {
    const parentObject = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'});
    const parentProperty = new SDK.RemoteObject.RemoteObjectProperty('parentNode', parentObject);
    const parentNode = new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(parentProperty);

    const childObject = SDK.RemoteObject.RemoteObject.fromLocalObject('bar');
    const childProperty = new SDK.RemoteObject.RemoteObjectProperty('foo', childObject);
    const childNode = new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(childProperty, undefined, parentNode);

    const treeElement = new ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement(childNode);

    const event = new MouseEvent('contextmenu');
    const contextMenu = treeElement.getContextMenu(event);

    const copyValueItem = contextMenu.clipboardSection().items.find(
        (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Copy value');
    assert.exists(copyValueItem);

    const copyText = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');
    contextMenu.invokeHandler(copyValueItem!.id());
    sinon.assert.calledWith(copyText, 'bar');
  });

  it('does not edit readonly values', async () => {
    const property = new SDK.RemoteObject.RemoteObjectProperty(
        'name', SDK.RemoteObject.RemoteObject.fromLocalObject(42), true, true);
    const container = document.createElement('div');
    const input = {
      editable: false,
      startEditing: sinon.stub(),
      invokeGetter: sinon.stub(),
      onAutoComplete: sinon.stub(),
      linkifier: undefined,
      completions: [],
      expanded: false,
      editing: false,
      editingEnded: sinon.stub(),
      editingCommitted: sinon.stub(),
      node: new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(property),
    };
    const output = {valueElement: undefined, nameElement: undefined};
    ObjectUI.ObjectPropertiesSection.OBJECT_PROPERTY_DEFAULT_VIEW(input, output, container);

    sinon.assert.notCalled(input.startEditing);
    const event = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
    const valueElement = container.querySelector('.value');
    assert.exists(valueElement);
    assert.strictEqual(valueElement, output.valueElement);
    valueElement.dispatchEvent(event);
    sinon.assert.notCalled(input.startEditing);
  });

  it('can edit values', async () => {
    const property = new SDK.RemoteObject.RemoteObjectProperty(
        'name', SDK.RemoteObject.RemoteObject.fromLocalObject(42), true, true);
    const container = document.createElement('div');
    const input = {
      editable: true,
      startEditing: sinon.stub(),
      invokeGetter: sinon.stub(),
      onAutoComplete: sinon.stub(),
      linkifier: undefined,
      completions: [],
      expanded: false,
      editing: false,
      editingEnded: sinon.stub(),
      editingCommitted: sinon.stub(),
      node: new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(property),
    };
    const output = {valueElement: undefined, nameElement: undefined};
    ObjectUI.ObjectPropertiesSection.OBJECT_PROPERTY_DEFAULT_VIEW(input, output, container);

    sinon.assert.notCalled(input.startEditing);
    const event = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
    const valueElement = container.querySelector('.value');
    assert.exists(valueElement);
    assert.strictEqual(valueElement, output.valueElement);
    valueElement.dispatchEvent(event);
    sinon.assert.calledOnce(input.startEditing);

    const viewFunction = sinon.stub<[ObjectUI.ObjectPropertiesSection.ObjectPropertyViewInput, object, HTMLElement]>();
    const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertyWidget(undefined, viewFunction);
    section.property = new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(property),

    renderElementIntoDOM(section);
    const firstExpectedCall = expectCall(viewFunction);
    section.performUpdate();
    const [firstInput] = await firstExpectedCall;
    assert.isFalse(firstInput.editing);

    const secondExpectedCall = expectCall(viewFunction);
    firstInput.startEditing();
    const [secondInput] = await secondExpectedCall;
    assert.isTrue(secondInput.editing);
  });

  it('shows expandable text contents for lengthy strings', async () => {
    const longString = `l${'o'.repeat(15000)}ng`;
    const value = ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.createPropertyValue(
        SDK.RemoteObject.RemoteObject.fromLocalObject(longString), false, true);

    renderElementIntoDOM(value, {includeCommonStyles: true});

    await assertScreenshot('object_ui/expandable_strings.png');

    const copyStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');
    const copyButton = value.querySelector<HTMLButtonElement>('[data-text="Copy"]');
    assert.exists(copyButton);
    const expandButton = value.querySelector<HTMLButtonElement>('[data-text="Show more (15.0\xA0kB)"]');
    assert.exists(expandButton);

    sinon.assert.notCalled(copyStub);
    copyButton.click();
    sinon.assert.calledOnceWithExactly(copyStub, `"${longString}"`);

    assert.notStrictEqual(value.textContent, `"${longString}"`);
    expandButton.click();
    await assertScreenshot('object_ui/expanded_strings.png');
    assert.strictEqual(value.textContent, `"${longString}"`);
  });
});
