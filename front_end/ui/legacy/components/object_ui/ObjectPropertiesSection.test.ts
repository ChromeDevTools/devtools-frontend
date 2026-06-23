// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import {assertScreenshot, dispatchClickEvent, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../../../testing/ExpectStubCall.js';
import * as UI from '../../legacy.js';

import * as ObjectUI from './object_ui.js';

export type MockPropertyValue = number|string|MockPropertyValue[]|RecursiveObjectDefinition;

export interface RecursiveObjectDefinition {
  [key: string]: MockPropertyValue;
}

/**
 * Creates a mocked `SDK.RemoteObject.RemoteObject` from a plain JavaScript object.
 * Deeply parses nested objects and automatically routes properties wrapped in `[[...]]`
 * to the object's `internalProperties`.
 *
 * Example Usage:
 * ```typescript
 * const target = createTarget(); // from EnvironmentHelpers
 * const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
 * const myRemoteObject = createDeepRemoteObjectMock(runtimeModel, {
 *   id: 123,
 *   name: 'Root Node',
 *   config: {
 *     status: 'active',
 *     count: 10
 *   },
 *   '[[PromiseState]]': 'fulfilled',
 *   '[[Target]]': {
 *     nodeName: 'DIV',
 *     '[[ConnectionId]]': 42
 *   }
 * });
 * ```
 */
export function createDeepRemoteObjectMock(
    runtimeModel: SDK.RuntimeModel.RuntimeModel,
    definition: MockPropertyValue,
    ): SDK.RemoteObject.RemoteObject {
  // Base Case: Primitives
  if (typeof definition === 'string' || typeof definition === 'number') {
    return runtimeModel.createRemoteObjectFromPrimitiveValue(definition);
  }

  // Recursive Case: Object or Array
  const isArray = Array.isArray(definition);
  const payload: Protocol.Runtime.RemoteObject = {
    type: Protocol.Runtime.RemoteObjectType.Object,
    // Add the array subtype if applicable
    subtype: isArray ? Protocol.Runtime.RemoteObjectSubtype.Array : undefined,
    // Assign a mock ID so the SDK treats it as a distinct object
    objectId: `mock-id-${Math.random()}` as Protocol.Runtime.RemoteObjectId,
  };

  const remoteObject = runtimeModel.createRemoteObject(payload);

  const properties: SDK.RemoteObject.RemoteObjectProperty[] = [];
  const internalProperties: SDK.RemoteObject.RemoteObjectProperty[] = [];

  for (const [key, value] of Object.entries(definition)) {
    const valueObject = createDeepRemoteObjectMock(runtimeModel, value);
    const property = new SDK.RemoteObject.RemoteObjectProperty(key, valueObject);

    // Automatically route to internalProperties if the key is formatted like [[Name]]
    if (key.startsWith('[[') && key.endsWith(']]')) {
      internalProperties.push(property);
    } else {
      properties.push(property);
    }
  }

  // Inject the 'length' property and arrayLength stub for arrays, matching V8 behavior
  if (isArray) {
    const lengthObject = runtimeModel.createRemoteObjectFromPrimitiveValue(definition.length);
    properties.push(new SDK.RemoteObject.RemoteObjectProperty('length', lengthObject));
    sinon.stub(remoteObject, 'arrayLength').returns(definition.length);

    if (definition.length > 100) {
      // Stub callFunctionJSON for array groups (see arrayRangeGroups in ObjectPropertiesSection.ts)
      const stub = sinon.stub(remoteObject, 'callFunctionJSON');
      stub.callsFake((fn, args) => {
        if (fn.name === 'packArrayRanges') {
          return Promise.resolve({ranges: [[0, definition.length - 1, definition.length]]});
        }
        return stub.wrappedMethod.call(remoteObject, fn, args);
      });
    }
  }

  sinon.stub(remoteObject, 'getAllProperties').resolves({properties, internalProperties});
  sinon.stub(remoteObject, 'getOwnProperties').resolves({properties, internalProperties});

  return remoteObject;
}

describe('ObjectPropertiesSection', () => {
  describeWithEnvironment('ObjectPropertiesSection', () => {
    const expandedPropertyNames =
        async(value: unknown, options?: {sortPropertiesAlphabetically?: boolean}): Promise<string[]> => {
      ObjectUI.ObjectPropertiesSection.sortPropertiesAlphabeticallySetting().set(
          options?.sortPropertiesAlphabetically ?? false);
      const object = SDK.RemoteObject.RemoteObject.fromLocalObject(value);
      const tree = new ObjectUI.ObjectPropertiesSection.ObjectTree(object, {
        readOnly: true,
        propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED
      });
      const children = await tree.populateChildrenIfNeeded();
      return (children.properties ?? []).map(p => p.name);
    };

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

    it('sorts expanded properties alphabetically by default', async () => {
      const propertyNames = await expandedPropertyNames({
        _a: 1,
        beta: 2,
        _z: 3,
        alpha: 4,
      },
                                                        {sortPropertiesAlphabetically: true});
      assert.deepEqual(propertyNames, ['alpha', 'beta', '_a', '_z']);
    });

    it('preserves insertion order when the setting is disabled', async () => {
      const propertyNames = await expandedPropertyNames({
        _a: 1,
        beta: 2,
        _z: 3,
        alpha: 4,
      },
                                                        {sortPropertiesAlphabetically: false});
      assert.deepEqual(propertyNames, ['_a', 'beta', '_z', 'alpha']);
    });

    it('compareProperties sorts enumerable properties before non-enumerable in alphabetical mode', () => {
      const properties = [
        new SDK.RemoteObject.RemoteObjectProperty('hiddenA', SDK.RemoteObject.RemoteObject.fromLocalObject(1), false,
                                                  true, true),
        new SDK.RemoteObject.RemoteObjectProperty('visibleA', SDK.RemoteObject.RemoteObject.fromLocalObject(2), true,
                                                  true, true),
        new SDK.RemoteObject.RemoteObjectProperty('hiddenB', SDK.RemoteObject.RemoteObject.fromLocalObject(3), false,
                                                  true, true),
        new SDK.RemoteObject.RemoteObjectProperty('visibleB', SDK.RemoteObject.RemoteObject.fromLocalObject(4), true,
                                                  true, true),
      ];

      properties.sort(ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.compareProperties);
      assert.deepEqual(properties.map(property => property.name), ['visibleA', 'visibleB', 'hiddenA', 'hiddenB']);
    });

    it('compareProperties preserves insertion order within enumerable buckets when alphabetical sorting is disabled',
       () => {
         const properties = [
           new SDK.RemoteObject.RemoteObjectProperty('hiddenB', SDK.RemoteObject.RemoteObject.fromLocalObject(1), false,
                                                     true, true),
           new SDK.RemoteObject.RemoteObjectProperty('visibleB', SDK.RemoteObject.RemoteObject.fromLocalObject(2), true,
                                                     true, true),
           new SDK.RemoteObject.RemoteObjectProperty('hiddenA', SDK.RemoteObject.RemoteObject.fromLocalObject(3), false,
                                                     true, true),
           new SDK.RemoteObject.RemoteObjectProperty('visibleA', SDK.RemoteObject.RemoteObject.fromLocalObject(4), true,
                                                     true, true),
         ];

         properties.sort((a, b) =>
                             ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection.compareProperties(a, b, false));
         assert.deepEqual(properties.map(property => property.name), ['visibleB', 'visibleA', 'hiddenB', 'hiddenA']);
       });

    it('shows sorting and "Show all" toggles in context menu', () => {
      const object = SDK.RemoteObject.RemoteObject.fromLocalObject({});
      const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertiesSection(object, 'title');
      const rootElement = section.objectTreeElement();
      const event = new MouseEvent('contextmenu');

      const showSpy = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      const appendCheckboxItemSpy = sinon.spy(UI.ContextMenu.Section.prototype, 'appendCheckboxItem');

      rootElement.listItemElement.dispatchEvent(event);

      sinon.assert.called(appendCheckboxItemSpy);
      const sortPropertiesItem = appendCheckboxItemSpy.args.find(args => args[0] === 'Sort properties alphabetically');
      assert.exists(sortPropertiesItem);
      assert.strictEqual(sortPropertiesItem[2]?.checked,
                         ObjectUI.ObjectPropertiesSection.sortPropertiesAlphabeticallySetting().get());

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
    const parentNode = new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(parentProperty, undefined, {
      readOnly: false,
      propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED
    });

    const childObject = SDK.RemoteObject.RemoteObject.fromLocalObject('bar');
    const childProperty = new SDK.RemoteObject.RemoteObjectProperty('foo', childObject);
    const childNode = new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(childProperty, parentNode, {
      readOnly: false,
      propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED
    });

    const treeElement = new ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement(childNode);

    const event = new MouseEvent('contextmenu');
    const contextMenu = treeElement.getContextMenu(event);

    const copyValueItem = contextMenu.clipboardSection().items.find(
        (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Copy value');
    assert.exists(copyValueItem);

    const copyText = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText');
    contextMenu.invokeHandler(copyValueItem.id());
    sinon.assert.calledWith(copyText, 'bar');
  });

  it('does not edit readonly values', async () => {
    const property = new SDK.RemoteObject.RemoteObjectProperty(
        'name', SDK.RemoteObject.RemoteObject.fromLocalObject(42), true, true);
    const container = document.createElement('div');
    const startEditing = sinon.spy();
    const input: ObjectUI.ObjectPropertiesSection.ObjectPropertyViewInput = {
      editable: false,
      startEditing,
      invokeGetter: sinon.spy(),
      onAutoComplete: sinon.spy(),
      linkifier: undefined,
      completions: [],
      expanded: false,
      editing: false,
      editingEnded: sinon.spy(),
      editingCommitted: sinon.spy(),
      node: new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(property, undefined, {
        readOnly: false,
        propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED
      }),
    };
    const output = {valueElement: undefined, nameElement: undefined};
    ObjectUI.ObjectPropertiesSection.OBJECT_PROPERTY_DEFAULT_VIEW(input, output, container);

    sinon.assert.notCalled(startEditing);
    const event = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
    const valueElement = container.querySelector('.value');
    assert.exists(valueElement);
    assert.strictEqual(valueElement, output.valueElement);
    valueElement.dispatchEvent(event);
    sinon.assert.notCalled(startEditing);
  });

  it('can edit values', async () => {
    const property = new SDK.RemoteObject.RemoteObjectProperty(
        'name', SDK.RemoteObject.RemoteObject.fromLocalObject(42), true, true);
    const container = document.createElement('div');
    const startEditing = sinon.spy();
    const input: ObjectUI.ObjectPropertiesSection.ObjectPropertyViewInput = {
      editable: true,
      startEditing,
      invokeGetter: sinon.spy(),
      onAutoComplete: sinon.spy(),
      linkifier: undefined,
      completions: [],
      expanded: false,
      editing: false,
      editingEnded: sinon.spy(),
      editingCommitted: sinon.spy(),
      node: new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(property, undefined, {
        readOnly: false,
        propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED
      }),
    };
    const output = {valueElement: undefined, nameElement: undefined};
    ObjectUI.ObjectPropertiesSection.OBJECT_PROPERTY_DEFAULT_VIEW(input, output, container);

    sinon.assert.notCalled(startEditing);
    const event = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
    const valueElement = container.querySelector('.value');
    assert.exists(valueElement);
    assert.strictEqual(valueElement, output.valueElement);
    valueElement.dispatchEvent(event);
    sinon.assert.calledOnce(startEditing);

    const viewFunction = sinon.stub<[ObjectUI.ObjectPropertiesSection.ObjectPropertyViewInput, object, HTMLElement]>();
    const section = new ObjectUI.ObjectPropertiesSection.ObjectPropertyWidget(undefined, viewFunction);
    section.property = new ObjectUI.ObjectPropertiesSection.ObjectTreeNode(property, undefined, {
      readOnly: false,
      propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED
    });

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

describeWithEnvironment('ObjectTreeExpansionTracker', () => {
  let target: SDK.Target.Target;
  let runtimeModel: SDK.RuntimeModel.RuntimeModel;

  beforeEach(() => {
    target = createTarget();
    runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel)!;
  });

  /**
   * Test tree structure:
   *
   * root (ObjectTree)
   * ├── p1 (ObjectTreeNode, "properties")
   * │   └── p2 (ObjectTreeNode, "properties")
   * │       └── p3 (ObjectTreeNode, "properties")
   * │           └── p4 (ObjectTreeNode, "properties")
   * │               └── p5 (ObjectTreeNode, "properties")
   * ├── [[i1]] (ObjectTreeNode, "internalProperties")
   * └── r1 (ArrayGroupTreeNode, "arrayRanges" [0 … 10])
   */
  async function buildTestTree(tracker: ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker) {
    const rootObj = createDeepRemoteObjectMock(runtimeModel, {
      p1: {p2: {p3: {p4: {p5: 42}}}},
      '[[i1]]': 42,
    });

    // Inject array behavior into rootObj to get arrayRanges
    sinon.stub(rootObj, 'subtype').get(() => Protocol.Runtime.RemoteObjectSubtype.Array);
    sinon.stub(rootObj, 'arrayLength').returns(1000);
    sinon.stub(rootObj, 'callFunctionJSON').resolves({ranges: [[0, 10, 11]]});

    const root = new ObjectUI.ObjectPropertiesSection.ObjectTree(rootObj, {
      readOnly: false,
      propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED,
      expansionTracker: tracker,
    });

    const rootChildren = await root.populateChildrenIfNeeded();
    const p1 = rootChildren.properties?.find(p => p.name === 'p1')!;
    const i1 = rootChildren.internalProperties?.find(p => p.name === '[[i1]]')!;
    const r1 = rootChildren.arrayRanges?.[0]!;

    const p1Children = await p1.populateChildrenIfNeeded();
    const p2 = p1Children.properties?.find(p => p.name === 'p2')!;

    const p2Children = await p2.populateChildrenIfNeeded();
    const p3 = p2Children.properties?.find(p => p.name === 'p3')!;

    const p3Children = await p3.populateChildrenIfNeeded();
    const p4 = p3Children.properties?.find(p => p.name === 'p4')!;

    const p4Children = await p4.populateChildrenIfNeeded();
    const p5 = p4Children.properties?.find(p => p.name === 'p5')!;

    return {root, p1, i1, r1, p2, p3, p4, p5};
  }

  it('expands everything', async () => {
    const tracker = new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
    const {p5, i1, r1} = await buildTestTree(tracker);

    tracker.expand(p5);
    tracker.expand(i1);
    tracker.expand(r1);

    // Create a fresh tree
    const {root: freshRoot, p1: freshP1, i1: freshI1, r1: freshR1, p2: freshP2, p3: freshP3, p4: freshP4, p5: freshP5} =
        await buildTestTree(tracker);

    await tracker.apply(freshRoot);

    assert.isTrue(freshRoot.expanded);
    assert.isTrue(freshP1.expanded);
    assert.isTrue(freshI1.expanded);
    assert.isTrue(freshR1.expanded);
    assert.isTrue(freshP2.expanded);
    assert.isTrue(freshP3.expanded);
    assert.isTrue(freshP4.expanded);
    assert.isTrue(freshP5.expanded);
  });

  it('collapses a leaf', async () => {
    const tracker = new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
    const {p5} = await buildTestTree(tracker);

    tracker.expand(p5);
    tracker.collapse(p5);

    // Create a fresh tree
    const {root: freshRoot, p1: freshP1, p2: freshP2, p3: freshP3, p4: freshP4, p5: freshP5} =
        await buildTestTree(tracker);

    await tracker.apply(freshRoot);

    assert.isTrue(freshRoot.expanded);
    assert.isTrue(freshP1.expanded);
    assert.isTrue(freshP2.expanded);
    assert.isTrue(freshP3.expanded);
    assert.isTrue(freshP4.expanded);
    assert.isFalse(freshP5.expanded);
  });

  it('collapses something in the middle', async () => {
    const tracker = new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
    const {p5, p3} = await buildTestTree(tracker);

    tracker.expand(p5);
    tracker.collapse(p3);

    // Create a fresh tree
    const {root: freshRoot, p1: freshP1, p2: freshP2, p3: freshP3, p4: freshP4, p5: freshP5} =
        await buildTestTree(tracker);

    await tracker.apply(freshRoot);

    assert.isTrue(freshRoot.expanded);
    assert.isTrue(freshP1.expanded);
    assert.isTrue(freshP2.expanded);
    assert.isFalse(freshP3.expanded);
    assert.isFalse(freshP4.expanded);
    assert.isFalse(freshP5.expanded);
  });

  it('collapses a root child', async () => {
    const tracker = new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
    const {p5, p1} = await buildTestTree(tracker);

    tracker.expand(p5);
    tracker.collapse(p1);

    // Create a fresh tree
    const {root: freshRoot, p1: freshP1, p2: freshP2, p3: freshP3, p4: freshP4, p5: freshP5} =
        await buildTestTree(tracker);

    await tracker.apply(freshRoot);

    assert.isTrue(freshRoot.expanded);
    assert.isFalse(freshP1.expanded);
    assert.isFalse(freshP2.expanded);
    assert.isFalse(freshP3.expanded);
    assert.isFalse(freshP4.expanded);
    assert.isFalse(freshP5.expanded);
  });

  it('preserves expansion state for nodes inside [[Prototype]] and ArrayGroups', async () => {
    const tracker = new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();

    async function buildComplexTree(expansionTracker: ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker) {
      // root -> [[Prototype]] -> myArray -> 0 -> foo
      const rootObj = createDeepRemoteObjectMock(runtimeModel, {
        '[[Prototype]]': {
          myArray: [
            {foo: {bar: 'baz'}},
          ],
        }
      });

      const root = new ObjectUI.ObjectPropertiesSection.ObjectTree(rootObj, {
        readOnly: false,
        propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED,
        expansionTracker,
      });

      return {root};
    }

    const {root} = await buildComplexTree(tracker);

    // Populate the tree: root -> [[Prototype]] -> myArray -> 0 -> foo
    const rootChildren = await root.populateChildrenIfNeeded();
    const protoNode = rootChildren.internalProperties?.[0] as ObjectUI.ObjectPropertiesSection.ObjectTreeNode;
    assert.exists(protoNode);

    const protoChildren = await protoNode.populateChildrenIfNeeded();
    const arrayNode = protoChildren.properties?.[0] as ObjectUI.ObjectPropertiesSection.ObjectTreeNode;
    assert.exists(arrayNode);

    const arrayChildren = await arrayNode.populateChildrenIfNeeded();
    const indexNode = arrayChildren.properties?.[0] as ObjectUI.ObjectPropertiesSection.ObjectTreeNode;
    assert.exists(indexNode);

    const indexChildren = await indexNode.populateChildrenIfNeeded();
    const fooNode = indexChildren.properties?.[0] as ObjectUI.ObjectPropertiesSection.ObjectTreeNode;
    assert.exists(fooNode);

    // Expand all of them
    protoNode.expanded = true;
    arrayNode.expanded = true;
    indexNode.expanded = true;
    fooNode.expanded = true;

    // Apply to a fresh tree
    const {root: freshRoot} = await buildComplexTree(tracker);
    await tracker.apply(freshRoot);

    // Re-populate and check states
    const freshRootChildren = await freshRoot.populateChildrenIfNeeded();
    const freshProtoNode = freshRootChildren.internalProperties?.[0] as ObjectUI.ObjectPropertiesSection.ObjectTreeNode;
    assert.isTrue(freshProtoNode.expanded, '[[Prototype]] should be expanded');

    const freshProtoChildren = await freshProtoNode.populateChildrenIfNeeded();
    const freshArrayNode = freshProtoChildren.properties?.[0] as ObjectUI.ObjectPropertiesSection.ObjectTreeNode;
    assert.isTrue(freshArrayNode.expanded, 'Array node should be expanded');

    const freshArrayChildren = await freshArrayNode.populateChildrenIfNeeded();
    const freshIndexNode = freshArrayChildren.properties?.[0] as ObjectUI.ObjectPropertiesSection.ObjectTreeNode;
    assert.isTrue(freshIndexNode.expanded, 'Index node should be expanded');

    const freshIndexChildren = await freshIndexNode.populateChildrenIfNeeded();
    const freshFooNode = freshIndexChildren.properties?.[0] as ObjectUI.ObjectPropertiesSection.ObjectTreeNode;
    assert.isTrue(freshFooNode.expanded, 'Foo node inside [[Prototype]] and ArrayGroup should be expanded');
  });

  it('expands the root', async () => {
    const tracker = new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
    const {root} = await buildTestTree(tracker);

    tracker.expand(root);

    const {root: freshRoot} = await buildTestTree(tracker);
    await tracker.apply(freshRoot);

    assert.isTrue(freshRoot.expanded);
  });

  it('collapses the root', async () => {
    const tracker = new ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker();
    const {root} = await buildTestTree(tracker);

    tracker.expand(root);
    tracker.collapse(root);

    const {root: freshRoot} = await buildTestTree(tracker);
    await tracker.apply(freshRoot);

    assert.isFalse(freshRoot.expanded);
  });
});
