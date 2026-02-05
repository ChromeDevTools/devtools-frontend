// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../front_end/ui/legacy/legacy.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, registerActions} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Elements from './elements.js';

describe('ElementsTreeElement', () => {
  describe('convertUnicodeCharsToHTMLEntities', () => {
    it('converts unicode characters to HTML entities', () => {
      const input = '\u2002\u2002This string has spaces\xA0\xA0and other\u202Aunicode characters\u200A.';
      const expected = {
        text: '&ensp;&ensp;This string has spaces&nbsp;&nbsp;and other&#x202A;unicode characters&hairsp;.',
        entityRanges: [
          new TextUtils.TextRange.SourceRange(0, 6),
          new TextUtils.TextRange.SourceRange(6, 6),
          new TextUtils.TextRange.SourceRange(34, 6),
          new TextUtils.TextRange.SourceRange(40, 6),
          new TextUtils.TextRange.SourceRange(55, 8),
          new TextUtils.TextRange.SourceRange(81, 8),
        ],
      };

      const result = Elements.ElementsTreeElement.convertUnicodeCharsToHTMLEntities(input);
      assert.strictEqual(result.text, expected.text);
      assert.deepEqual(result.entityRanges, expected.entityRanges);
    });

    it('returns the original string if no unicode characters are present', () => {
      const input = 'ThisStringHasNoWhitespace';
      const expected = {
        text: 'ThisStringHasNoWhitespace',
        entityRanges: [],
      };

      const result = Elements.ElementsTreeElement.convertUnicodeCharsToHTMLEntities(input);
      assert.strictEqual(result.text, expected.text);
      assert.deepEqual(result.entityRanges, expected.entityRanges);
    });
  });

  it('renders gutter decorations correctly', async () => {
    const target = document.createElement('div');
    target.style.width = '100px';
    target.style.height = '20px';
    const style = document.createElement('style');
    // FIXME: styles are currently external to ElementsTreeElement.
    style.innerText = Elements.ElementsTreeOutline.elementsTreeOutlineStyles;
    target.append(style);
    renderElementIntoDOM(target, {
      includeCommonStyles: true,
    });
    const decorations = [
      {title: 'Decoration 1', color: 'red'},
      {title: 'Decoration 2', color: 'blue'},
    ];
    const descendantDecorations = [
      {title: 'Descendant 1', color: 'green'},
    ];
    Elements.ElementsTreeElement.DEFAULT_VIEW(
        {
          containerAdornerActive: false,
          showAdAdorner: false,
          showContainerAdorner: false,
          showFlexAdorner: false,
          flexAdornerActive: false,
          showGridAdorner: false,
          showGridLanesAdorner: false,
          showMediaAdorner: false,
          showPopoverAdorner: false,
          showTopLayerAdorner: false,
          gridAdornerActive: false,
          popoverAdornerActive: false,
          isSubgrid: false,
          showViewSourceAdorner: false,
          showScrollAdorner: false,
          showScrollSnapAdorner: false,
          scrollSnapAdornerActive: false,
          showSlotAdorner: false,
          showStartingStyleAdorner: false,
          startingStyleAdornerActive: false,
          onStartingStyleAdornerClick: () => {},
          onSlotAdornerClick: () => {},
          topLayerIndex: -1,
          onViewSourceAdornerClick: () => {},
          onGutterClick: () => {},
          onContainerAdornerClick: () => {},
          onFlexAdornerClick: () => {},
          onGridAdornerClick: () => {},
          onMediaAdornerClick: () => {},
          onPopoverAdornerClick: () => {},
          onScrollSnapAdornerClick: () => {},
          onTopLayerAdornerClick: () => {},
          isHovered: false,
          isSelected: false,
          showAiButton: false,
          onAiButtonClick: () => {},
          decorations,
          descendantDecorations,
          decorationsTooltip: 'Title',
          indent: 20,
        },
        {}, target);
    await assertScreenshot('elements/gutter_decorations.png');
  });
});

describeWithMockConnection('ElementsTreeElement', () => {
  const DEFAULT_LAYOUT_PROPERTIES = {
    isFlex: false,
    isGrid: false,
    isSubgrid: false,
    isGridLanes: false,
    containerType: undefined,
    hasScroll: false,
  };

  beforeEach(() => {
    registerActions([{
      actionId: 'freestyler.element-panel-context',
      title: () => 'Debug with AI' as Platform.UIString.LocalizedString,
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
    }]);
  });

  async function getContextMenuForElementWithLayoutProperties(layoutProperties: SDK.CSSModel.LayoutProperties|null):
      Promise<UI.ContextMenu.ContextMenu> {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(domModel);
    assert.exists(cssModel);

    sinon.stub(cssModel, 'getLayoutPropertiesFromComputedStyle').resolves(layoutProperties);

    const node = new SDK.DOMModel.DOMNode(domModel);
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;

    const event = new Event('contextmenu');
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    await treeElement.populateNodeContextMenu(contextMenu);
    return contextMenu;
  }

  it('shows default submenu items', async () => {
    const contextMenu = await getContextMenuForElementWithLayoutProperties(null);
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label), ['Start a chat', 'Assess visibility', 'Center element']);
  });

  it('shows flexbox submenu items', async () => {
    const contextMenu =
        await getContextMenuForElementWithLayoutProperties({...DEFAULT_LAYOUT_PROPERTIES, isFlex: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Wrap these items', 'Distribute items evenly', 'Explain flexbox']);
  });

  it('shows grid submenu items', async () => {
    const contextMenu =
        await getContextMenuForElementWithLayoutProperties({...DEFAULT_LAYOUT_PROPERTIES, isGrid: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Align items', 'Add padding', 'Explain grid layout']);
  });

  it('shows subgrid submenu items', async () => {
    const contextMenu = await getContextMenuForElementWithLayoutProperties(
        {...DEFAULT_LAYOUT_PROPERTIES, isGrid: true, isSubgrid: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Find grid definition', 'Change parent properties', 'Explain subgrids']);
  });

  it('shows scroll submenu items', async () => {
    const contextMenu =
        await getContextMenuForElementWithLayoutProperties({...DEFAULT_LAYOUT_PROPERTIES, hasScroll: true});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Remove scrollbars', 'Style scrollbars', 'Explain scrollbars']);
  });

  it('shows container submenu items', async () => {
    const contextMenu = await getContextMenuForElementWithLayoutProperties(
        {...DEFAULT_LAYOUT_PROPERTIES, containerType: 'inline-size'});
    const debugWithAiItem = contextMenu.buildDescriptor().subItems?.find(item => item.label === 'Debug with AI');
    assert.exists(debugWithAiItem);
    assert.deepEqual(
        debugWithAiItem?.subItems?.map(item => item.label),
        ['Start a chat', 'Explain container queries', 'Explain container types', 'Explain container context']);
  });
  it('updates when persistent overlay state changes', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const node = new SDK.DOMModel.DOMNode(domModel);
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;

    // Simulate binding to the tree
    treeElement.onbind();

    const performUpdateSpy = sinon.spy(treeElement, 'performUpdate');

    // Trigger event
    node.dispatchEventToListeners(SDK.DOMModel.DOMNodeEvents.GRID_OVERLAY_STATE_CHANGED, {enabled: true});

    sinon.assert.calledOnce(performUpdateSpy);

    // Simulate unbinding
    treeElement.onunbind();
    performUpdateSpy.resetHistory();

    // Trigger event again
    node.dispatchEventToListeners(SDK.DOMModel.DOMNodeEvents.GRID_OVERLAY_STATE_CHANGED, {enabled: false});

    sinon.assert.notCalled(performUpdateSpy);
  });

  it('updates when persistent scroll snap overlay state changes', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const node = new SDK.DOMModel.DOMNode(domModel);
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;

    // Simulate binding to the tree
    treeElement.onbind();

    const performUpdateSpy = sinon.spy(treeElement, 'performUpdate');

    // Trigger event
    node.dispatchEventToListeners(SDK.DOMModel.DOMNodeEvents.SCROLL_SNAP_OVERLAY_STATE_CHANGED, {enabled: true});

    sinon.assert.calledOnce(performUpdateSpy);

    // Simulate unbinding
    treeElement.onunbind();
    performUpdateSpy.resetHistory();

    // Trigger event again
    node.dispatchEventToListeners(SDK.DOMModel.DOMNodeEvents.SCROLL_SNAP_OVERLAY_STATE_CHANGED, {enabled: false});

    sinon.assert.notCalled(performUpdateSpy);
  });

  it('initializes the slot adorner if the node has an assigned slot', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const node = new SDK.DOMModel.DOMNode(domModel);
    const shortcut = {
      deferredNode: {
        resolve: (callback: (node: SDK.DOMModel.DOMNode) => void) => {
          callback(node);
        },
        resolvePromise: () => Promise.resolve(node),
        backendNodeId: () => 1,
        highlight: () => {},
      },
    } as unknown as SDK.DOMModel.DOMNodeShortcut;
    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();

    sinon.stub(node, 'hasAssignedSlot').returns(true);
    sinon.stub(node, 'assignedSlot').value(shortcut);

    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;
    // Simulate binding to the tree
    treeElement.onbind();

    treeElement.performUpdate();

    const adorner = treeElement.listItemElement.querySelector('devtools-adorner');
    assert.exists(adorner);
    assert.strictEqual(adorner.name, 'slot');
  });

  it('renders STARTING_STYLE adorner when enabled', async () => {
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(domModel);
    const cssModel = target.model(SDK.CSSModel.CSSModel);
    assert.exists(cssModel);
    const node = new SDK.DOMModel.DOMNode(domModel);
    node.id = 1 as Protocol.DOM.NodeId;

    const treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();

    sinon.stub(node, 'affectedByStartingStyles').returns(true);

    const treeElement = new Elements.ElementsTreeElement.ElementsTreeElement(node);
    treeElement.treeOutline = treeOutline;
    treeElement.onbind();
    treeElement.performUpdate();

    const adorner = treeElement.listItemElement.querySelector('.starting-style');
    assert.exists(adorner);

    const forceSpy = sinon.spy(cssModel, 'forceStartingStyle');
    (adorner as HTMLElement).click();
    sinon.assert.calledWith(forceSpy, node, true);

    (adorner as HTMLElement).click();
    sinon.assert.calledWith(forceSpy, node, false);
  });
});

describeWithMockConnection('ElementsTreeElement highlighting', () => {
  let domModel: SDK.DOMModel.DOMModel;
  let treeOutline: Elements.ElementsTreeOutline.ElementsTreeOutline;
  let containerNode: SDK.DOMModel.DOMNode;
  let attrTestNode: SDK.DOMModel.DOMNode;
  let childTestNode: SDK.DOMModel.DOMNode;
  let textTestNode: SDK.DOMModel.DOMNode;
  let attrTestTreeElement: Elements.ElementsTreeElement.ElementsTreeElement;
  let childTestTreeElement: Elements.ElementsTreeElement.ElementsTreeElement;
  let textTestTreeElement: Elements.ElementsTreeElement.ElementsTreeElement;
  let nodeId = 0;

  function createDOMNodePayload(name: string, attrs: Record<string, string> = {}): Protocol.DOM.Node {
    const attrList: string[] = [];
    for (const [key, value] of Object.entries(attrs)) {
      attrList.push(key, value);
    }
    return {
      nodeId: ++nodeId as Protocol.DOM.NodeId,
      backendNodeId: ++nodeId as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: name.toUpperCase(),
      localName: name,
      nodeValue: '',
      attributes: attrList,
      childNodeCount: 0,
    };
  }

  function createTextNodePayload(text: string): Protocol.DOM.Node {
    return {
      nodeId: ++nodeId as Protocol.DOM.NodeId,
      backendNodeId: ++nodeId as Protocol.DOM.BackendNodeId,
      nodeType: Node.TEXT_NODE,
      nodeName: '#text',
      localName: '',
      nodeValue: text,
      childNodeCount: 0,
    };
  }

  beforeEach(async () => {
    const target = createTarget();
    domModel = target.model(SDK.DOMModel.DOMModel)!;

    const containerPayload = createDOMNodePayload('div', {id: 'container'});
    const attrTestPayload = createDOMNodePayload('div', {id: 'attrTest', attrFoo: 'foo'});
    const childTestPayload = createDOMNodePayload('div', {id: 'childTest'});
    const textTestPayload = createDOMNodePayload('div', {id: 'textTest'});

    containerNode = SDK.DOMModel.DOMNode.create(domModel, null, false, containerPayload);
    containerNode.setChildrenPayload([attrTestPayload, childTestPayload, textTestPayload]);

    attrTestNode = containerNode.children()![0];
    childTestNode = containerNode.children()![1];
    textTestNode = containerNode.children()![2];

    treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline();
    treeOutline.wireToDOMModel(domModel);

    const containerTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(containerNode);
    attrTestTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(attrTestNode);
    containerTreeElement.appendChild(attrTestTreeElement);
    childTestTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(childTestNode);
    containerTreeElement.appendChild(childTestTreeElement);
    textTestTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(textTestNode);
    containerTreeElement.appendChild(textTestTreeElement);
    treeOutline.appendChild(containerTreeElement);

    treeOutline.setVisible(true);
    renderElementIntoDOM(treeOutline.element);
    containerTreeElement.expand();
  });

  afterEach(() => {
    treeOutline.removeChildren();
    treeOutline.setVisible(false);
  });

  let stub: sinon.SinonStub<[], void>|undefined;
  async function waitForHighlights(element: Elements.ElementsTreeElement.ElementsTreeElement) {
    stub?.restore();
    return await new Promise(resolve => {
      stub = sinon.stub(treeOutline, 'updateModifiedNodes');
      stub.callsFake(() => {
        stub?.wrappedMethod.call(treeOutline);
        resolve(element.listItemElement.querySelectorAll('.dom-update-highlight').length);
      });
    });
  }

  it('highlights attribute value change', async () => {
    const highlights = waitForHighlights(attrTestTreeElement);
    domModel.attributeModified(attrTestNode.id, 'attrFoo', 'bar');
    assert.strictEqual(await highlights, 1);
  });

  it('highlights attribute set to empty', async () => {
    const highlights = waitForHighlights(attrTestTreeElement);
    domModel.attributeModified(attrTestNode.id, 'attrFoo', '');
    assert.strictEqual(await highlights, 1);
  });

  it('highlights new attribute', async () => {
    const highlights = waitForHighlights(attrTestTreeElement);
    domModel.attributeModified(attrTestNode.id, 'attrBar', 'bar');
    assert.strictEqual(await highlights, 1);
  });

  it('highlights attribute removal', async () => {
    const highlights = waitForHighlights(attrTestTreeElement);
    domModel.attributeRemoved(attrTestNode.id, 'attrFoo');
    assert.strictEqual(await highlights, 1);
  });

  it('highlights appending child to an empty node', async () => {
    const highlights = waitForHighlights(childTestTreeElement);
    const child1Payload = createDOMNodePayload('span', {id: 'child1'});
    const child1Node = SDK.DOMModel.DOMNode.create(domModel, childTestNode.ownerDocument, false, child1Payload);
    child1Node.parentNode = childTestNode;
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, child1Node);
    assert.strictEqual(await highlights, 1);
  });

  it('highlights appending child to an expanded node', async () => {
    childTestTreeElement.expand();
    const child1Payload = createDOMNodePayload('span', {id: 'child1'});
    const child1Node = SDK.DOMModel.DOMNode.create(domModel, childTestNode.ownerDocument, false, child1Payload);
    child1Node.parentNode = childTestNode;
    childTestNode.setChildrenPayload([child1Payload]);
    const child1TreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(child1Node);
    childTestTreeElement.appendChild(child1TreeElement);

    const highlights = waitForHighlights(childTestTreeElement);
    const child2Payload = createDOMNodePayload('span', {id: 'child2'});
    const child2Node = SDK.DOMModel.DOMNode.create(domModel, childTestNode.ownerDocument, false, child2Payload);
    child2Node.parentNode = childTestNode;
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, child2Node);
    assert.strictEqual(await highlights, 1);
  });

  it('highlights child removal', async () => {
    const child1Payload = createDOMNodePayload('span', {id: 'child1'});
    const child1Node = SDK.DOMModel.DOMNode.create(domModel, childTestNode.ownerDocument, false, child1Payload);
    child1Node.parentNode = childTestNode;
    childTestNode.setChildrenPayload([child1Payload]);
    const child1TreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(child1Node);
    childTestTreeElement.appendChild(child1TreeElement);

    const highlights = waitForHighlights(childTestTreeElement);
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeRemoved, {node: child1Node, parent: childTestNode});
    assert.strictEqual(await highlights, 1);
  });

  it('highlights setting text content', async () => {
    const highlights = waitForHighlights(textTestTreeElement);
    const textNodePayload = createTextNodePayload('Text');
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textNode.parentNode = textTestNode;
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.NodeInserted, textNode);
    assert.strictEqual(await highlights, 1);
  });

  it('highlights changing text node content', async () => {
    const textNodePayload = createTextNodePayload('Text');
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textTestNode.setChildrenPayload([textNodePayload]);
    textNode.parentNode = textTestNode;
    const textNodeTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(textNode);
    textTestTreeElement.appendChild(textNodeTreeElement);

    const highlights = waitForHighlights(textTestTreeElement);
    domModel.characterDataModified(textNode.id, 'Changed');
    assert.strictEqual(await highlights, 2);
  });

  it('highlights removing a text node', async () => {
    const textNodePayload = createTextNodePayload('Text');
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textNode.parentNode = textTestNode;
    textTestNode.setChildrenPayload([textNodePayload]);
    const textNodeTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(textNode);
    textTestTreeElement.appendChild(textNodeTreeElement);

    const highlights = waitForHighlights(textTestTreeElement);
    domModel.childNodeRemoved(textTestNode.id, textNode.id);
    assert.strictEqual(await highlights, 1);
  });

  it('highlights clearing text node content', async () => {
    const textNodePayload = createTextNodePayload('Text');
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textTestNode.setChildrenPayload([textNodePayload]);
    textNode.parentNode = textTestNode;
    const textNodeTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(textNode);
    textTestTreeElement.appendChild(textNodeTreeElement);

    const highlights = waitForHighlights(textTestTreeElement);
    domModel.characterDataModified(textNode.id, '');
    assert.strictEqual(await highlights, 2);
  });

  it('does not highlight when panel is hidden', async () => {
    treeOutline.setVisible(false);
    attrTestNode.setAttribute('attrFoo', 'bar');
    let highlights = waitForHighlights(attrTestTreeElement);
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.AttrModified, {node: attrTestNode, name: 'attrFoo'});
    assert.strictEqual(await highlights, 0);

    treeOutline.setVisible(true);
    highlights = waitForHighlights(attrTestTreeElement);
    attrTestNode.setAttribute('attrFoo', 'baz');
    domModel.dispatchEventToListeners(SDK.DOMModel.Events.AttrModified, {node: attrTestNode, name: 'attrFoo'});
    assert.strictEqual(await highlights, 1);
  });

  it('edits a text node', async () => {
    const longText = 'This is a long text that is longer than 80 characters to ensure that the text node is ' +
        'not rendered inline and the parent element is expandable.';
    const textNodePayload = createTextNodePayload(longText);
    const textNode = SDK.DOMModel.DOMNode.create(domModel, textTestNode.ownerDocument, false, textNodePayload);
    textTestNode.setChildrenPayload([textNodePayload]);
    textNode.parentNode = textTestNode;

    const setNodeValueSpy = sinon.spy(textNode, 'setNodeValue');
    sinon.stub(SDK.OverlayModel.OverlayModel, 'hideDOMNodeHighlight');

    const textNodeTreeElement = new Elements.ElementsTreeElement.ElementsTreeElement(textNode);
    assert.exists(textNodeTreeElement);
    textTestTreeElement.appendChild(textNodeTreeElement);

    await textTestTreeElement.onpopulate();

    treeOutline.selectDOMNode(textNode, true);

    const textElementDOM = textNodeTreeElement.listItemElement.querySelector('.webkit-html-text-node') as HTMLElement;
    assert.exists(textElementDOM);

    // Start editing by calling ondblclick
    const event = new MouseEvent('dblclick', {bubbles: true, cancelable: true});
    Object.defineProperty(event, 'target', {value: textElementDOM});
    assert.isFalse(textNodeTreeElement.ondblclick(event));

    assert.isTrue(textNodeTreeElement.isEditing());

    assert.strictEqual(textElementDOM.textContent, longText);

    // The inplace editor is now active on textElementDOM.
    textElementDOM.textContent = 'New Text';

    // The commit is triggered by blur or enter.
    textElementDOM.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));

    assert.isFalse(textNodeTreeElement.isEditing());

    sinon.assert.calledOnce(setNodeValueSpy);
    sinon.assert.calledWith(setNodeValueSpy, 'New Text');
  });

});
