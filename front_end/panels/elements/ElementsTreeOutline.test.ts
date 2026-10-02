// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import {doubleRaf, renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, expectConsoleLogs} from '../../testing/EnvironmentHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import type * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithEnvironment('ElementsTreeOutline', () => {
  let target: SDK.Target.Target;
  let model: SDK.DOMModel.DOMModel;
  let treeOutline: Elements.DOMTreeWidget.ElementsTreeOutline;

  beforeEach(() => {
    const universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    target = createTarget();

    treeOutline = new Elements.DOMTreeWidget.ElementsTreeOutline(/* omitRootDOMNode */ true, /* selectEnabled */ true);
    treeOutline.wireToDOMModel(target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel);

    const modelBeforeAssertion = target.model(SDK.DOMModel.DOMModel);
    assert.exists(modelBeforeAssertion);
    model = modelBeforeAssertion;
  });

  it('should include the ::checkmark pseudo element', () => {
    const optionNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'option',
      localName: 'option',
      nodeValue: 'An Option',
      childNodeCount: 1,
      pseudoElements: [{
        parentId: 1 as Protocol.DOM.NodeId,
        nodeId: 2 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        pseudoType: Protocol.DOM.PseudoType.Checkmark,
        pseudoIdentifier: '::checkmark',
        nodeName: '::checkmark',
        localName: '::checkmark',
        nodeValue: '*',
      }],
    });
    assert.isNotNull(optionNode);

    const checkmarkNode = optionNode.checkmarkPseudoElement();
    assert.isNotNull(checkmarkNode);

    treeOutline.rootDOMNode = optionNode;
    assert.isNotNull(treeOutline.findTreeElement(checkmarkNode!));
  });

  expectConsoleLogs({
    warn: ['Content security policy issue without details received.'],
  });

  it('should include the ::picker-icon pseudo element', () => {
    const selectNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'select',
      localName: 'select',
      nodeValue: 'A Select',
      childNodeCount: 1,
      pseudoElements: [{
        parentId: 1 as Protocol.DOM.NodeId,
        nodeId: 2 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        pseudoType: Protocol.DOM.PseudoType.PickerIcon,
        pseudoIdentifier: '::picker-icon',
        nodeName: '::picker-icon',
        localName: '::picker-icon',
        nodeValue: '^',
      }],
    });
    assert.isNotNull(selectNode);

    const pickerIconNode = selectNode.pickerIconPseudoElement();
    assert.isNotNull(pickerIconNode);

    treeOutline.rootDOMNode = selectNode;
    assert.isNotNull(treeOutline.findTreeElement(pickerIconNode!));
  });

  it('should include the ::interest-button pseudo element', () => {
    const buttonNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'button',
      localName: 'button',
      nodeValue: 'A Button',
      childNodeCount: 1,
      pseudoElements: [{
        parentId: 1 as Protocol.DOM.NodeId,
        nodeId: 2 as Protocol.DOM.NodeId,
        backendNodeId: 2 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        pseudoType: Protocol.DOM.PseudoType.InterestButton,
        pseudoIdentifier: '::interest-button',
        nodeName: '::interest-button',
        localName: '::interest-button',
        nodeValue: 'i',
      }],
    });
    assert.isNotNull(buttonNode);

    const interestButtonNode = buttonNode.interestButtonPseudoElement();
    assert.isNotNull(interestButtonNode);

    treeOutline.rootDOMNode = buttonNode;
    assert.isNotNull(treeOutline.findTreeElement(interestButtonNode!));
  });

  describe('Snapshot mode', () => {
    it('does not attach event listeners in snapshot mode', () => {
      const addEventListenerSpy = sinon.spy(HTMLElement.prototype, 'addEventListener');
      const snapshotTreeOutline = new Elements.DOMTreeWidget.ElementsTreeOutline(
          /* omitRootDOMNode */ true, /* selectEnabled */ true, /* hideGutter */ true, /* maxTreeDepth */ 2,
          /* enableContextMenu */ false, /* showComments */ false, /* showAIButton */ false, /* disableEdits */ true,
          /* expandRoot */ true);

      const eventsToCheck = [
        'dragstart',
        'dragover',
        'dragleave',
        'drop',
        'dragend',
        'contextmenu',
        'clipboard-beforecopy',
        'clipboard-copy',
        'clipboard-cut',
        'clipboard-paste',
      ];
      for (const event of eventsToCheck) {
        assert.isFalse(
            addEventListenerSpy.calledWith(event),
            `Event listener for ${event} should not be attached in snapshot mode`);
      }
      snapshotTreeOutline.element.remove();
    });

    it('auto-expands the root node in snapshot mode', async () => {
      const snapshotTreeOutline = new Elements.DOMTreeWidget.ElementsTreeOutline(
          /* omitRootDOMNode */ false, /* selectEnabled */ true, /* hideGutter */ true, /* maxTreeDepth */ 2,
          /* enableContextMenu */ false, /* showComments */ false, /* showAIButton */ false, /* disableEdits */ true,
          /* expandRoot */ true);
      const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'BODY',
        localName: 'body',
        nodeValue: '',
        childNodeCount: 1,
        children: [{
          nodeId: 2 as Protocol.DOM.NodeId,
          parentId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'DIV',
          localName: 'div',
          nodeValue: 'A div',
          childNodeCount: 0,
          attributes: [],
        } as Protocol.DOM.Node],
        attributes: [],
      });

      const snapshot = await rootNode.takeSnapshot();
      snapshotTreeOutline.rootDOMNode = snapshot;
      const rootTreeElement =
          snapshotTreeOutline.rootElement().childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
      assert.isNotNull(rootTreeElement);
      assert.isTrue(rootTreeElement.expanded, 'Root element should be expanded in snapshot mode');
    });

    it('limits depth to root + 1 level in snapshot mode', async () => {
      const snapshotTreeOutline = new Elements.DOMTreeWidget.ElementsTreeOutline(
          /* omitRootDOMNode */ false, /* selectEnabled */ true, /* hideGutter */ true, /* maxTreeDepth */ 2,
          /* enableContextMenu */ false, /* showComments */ false, /* showAIButton */ false, /* disableEdits */ true,
          /* expandRoot */ true);

      // Root -> Child -> GrandChild
      const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'BODY',
        localName: 'body',
        nodeValue: '',
        childNodeCount: 1,
        children: [{
          nodeId: 2 as Protocol.DOM.NodeId,
          parentId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'DIV',
          localName: 'div',
          nodeValue: 'Child',
          childNodeCount: 1,
          children: [{
            nodeId: 3 as Protocol.DOM.NodeId,
            parentId: 2 as Protocol.DOM.NodeId,
            backendNodeId: 3 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'SPAN',
            localName: 'span',
            nodeValue: 'Grandchild',
            childNodeCount: 0,
            attributes: [],
          } as Protocol.DOM.Node],
          attributes: [],
        } as Protocol.DOM.Node],
        attributes: [],
      });

      const snapshot = await rootNode.takeSnapshot();
      snapshotTreeOutline.rootDOMNode = snapshot;

      const rootTreeElement =
          snapshotTreeOutline.rootElement().childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
      assert.isNotNull(rootTreeElement);
      assert.isTrue(rootTreeElement.isExpandable(), 'Root should be expandable');

      await snapshotTreeOutline.populateTreeElement(rootTreeElement);

      const childTreeElement = rootTreeElement.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
      assert.isNotNull(childTreeElement);
      assert.isFalse(childTreeElement.isExpandable(), 'Child should NOT be expandable due to depth limit');

      assert.strictEqual(childTreeElement.childCount(), 0, 'Child should not have children populated');
    });

    it('allows ShadowRoot to exceed depth limit', async () => {
      const snapshotTreeOutline = new Elements.DOMTreeWidget.ElementsTreeOutline(
          /* omitRootDOMNode */ false, /* selectEnabled */ true, /* hideGutter */ true, /* maxTreeDepth */ 2,
          /* enableContextMenu */ false, /* showComments */ false, /* showAIButton */ false, /* disableEdits */ true);

      // Root -> ShadowRoot -> Child
      const rootPayload = {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'DIV',
        localName: 'div',
        nodeValue: '',
        childNodeCount: 1,
        shadowRoots: [{
          nodeId: 2 as Protocol.DOM.NodeId,
          parentId: 1 as Protocol.DOM.NodeId,
          backendNodeId: 2 as Protocol.DOM.BackendNodeId,
          nodeType: Node.DOCUMENT_FRAGMENT_NODE,
          nodeName: '#shadow-root',
          localName: '#shadow-root',
          nodeValue: '',
          shadowRootType: Protocol.DOM.ShadowRootType.Open,
          childNodeCount: 1,
          children: [{
            nodeId: 3 as Protocol.DOM.NodeId,
            parentId: 2 as Protocol.DOM.NodeId,
            backendNodeId: 3 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'SPAN',
            localName: 'span',
            nodeValue: 'Child',
            childNodeCount: 0,
            attributes: [],
          } as Protocol.DOM.Node],
          attributes: [],
        } as Protocol.DOM.Node],
        attributes: [],
      };

      const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, rootPayload);
      const snapshot = await rootNode.takeSnapshot();
      snapshotTreeOutline.rootDOMNode = snapshot;

      const rootTreeElement =
          snapshotTreeOutline.rootElement().childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
      assert.isNotNull(rootTreeElement);
      assert.isTrue(rootTreeElement.isExpandable(), 'Host should be expandable');

      await snapshotTreeOutline.populateTreeElement(rootTreeElement);

      const shadowRootTreeElement = rootTreeElement.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
      assert.isNotNull(shadowRootTreeElement);
      assert.strictEqual(shadowRootTreeElement.node().nodeName(), '#shadow-root');
      assert.isTrue(shadowRootTreeElement.isExpandable(), 'ShadowRoot should be expandable (exception)');

      await snapshotTreeOutline.populateTreeElement(shadowRootTreeElement);

      const childTreeElement = shadowRootTreeElement.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
      assert.isNotNull(childTreeElement);
      assert.isFalse(childTreeElement.isExpandable(), 'Child inside ShadowRoot should NOT be expandable');
    });

    it('limits the total number of rows and shows a "Show all" button', async () => {
      const snapshotTreeOutline = new Elements.DOMTreeWidget.ElementsTreeOutline(
          /* omitRootDOMNode */ false, /* selectEnabled */ true, /* hideGutter */ true, /* maxTreeDepth */ 2,
          /* enableContextMenu */ false, /* showComments */ false, /* showAIButton */ false, /* disableEdits */ true,
          /* expandRoot */ true);
      snapshotTreeOutline.addEventListener(Elements.DOMTreeWidget.ElementsTreeOutline.Events.ShowAllRows, () => {
        snapshotTreeOutline.maxRowsShown = undefined;
      });

      // Root -> 3 Children (Total 4 rows)
      const rootPayload = {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'BODY',
        localName: 'body',
        nodeValue: '',
        childNodeCount: 3,
        children: [
          {
            nodeId: 2 as Protocol.DOM.NodeId,
            parentId: 1 as Protocol.DOM.NodeId,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'DIV',
            localName: 'div',
            nodeValue: 'Child 1',
            childNodeCount: 0,
            attributes: [],
          },
          {
            nodeId: 3 as Protocol.DOM.NodeId,
            parentId: 1 as Protocol.DOM.NodeId,
            backendNodeId: 3 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'DIV',
            localName: 'div',
            nodeValue: 'Child 2',
            childNodeCount: 0,
            attributes: [],
          },
          {
            nodeId: 4 as Protocol.DOM.NodeId,
            parentId: 1 as Protocol.DOM.NodeId,
            backendNodeId: 4 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'DIV',
            localName: 'div',
            nodeValue: 'Child 3',
            childNodeCount: 0,
            attributes: [],
          },
        ] as Protocol.DOM.Node[],
        attributes: [],
      };

      const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, rootPayload);
      const snapshot = await rootNode.takeSnapshot();
      snapshotTreeOutline.rootDOMNode = snapshot;

      renderElementIntoDOM(snapshotTreeOutline.element);
      snapshotTreeOutline.maxRowsShown = 2;  // Limit to 2 rows after rendering
      await doubleRaf();

      const shadowRoot = snapshotTreeOutline.element.shadowRoot!;
      const container = shadowRoot.querySelector('.elements-disclosure') as HTMLElement;
      assert.isTrue(container.classList.contains('elements-tree-truncated'), 'Container should have truncated class');
      assert.strictEqual(container.style.getPropertyValue('--max-rows'), '2', 'Max rows CSS variable should be set');

      const showAllButton = shadowRoot.querySelector('.elements-tree-show-all') as HTMLElement;
      assert.isNotNull(showAllButton, 'Show all button should be present');
      assert.isFalse(showAllButton.classList.contains('hidden'), 'Show all button should be visible');
      // Root (1) + 3 children (3) = 4 total rows/lines.
      assert.include(showAllButton.textContent, 'Show all (2 lines)');

      // Click show all
      showAllButton.click();
      await doubleRaf();

      assert.isTrue(showAllButton.classList.contains('hidden'), 'Show all button should be hidden after click');
      assert.isFalse(
          container.classList.contains('elements-tree-truncated'),
          'Container should not have truncated class after click');
    });
  });

  it('passes selectorList "*" when highlighting display: contents element on mousemove', () => {
    const childPayload = {
      nodeId: 2 as Protocol.DOM.NodeId,
      parentId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      attributes: [],
    } as Protocol.DOM.Node;
    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'BODY',
      localName: 'body',
      nodeValue: '',
      childNodeCount: 1,
      children: [childPayload],
      attributes: [],
    });
    assert.isNotNull(rootNode);
    treeOutline.rootDOMNode = rootNode;

    const childNode = rootNode.children()![0];
    const treeElement = treeOutline.findTreeElement(childNode);
    assert.isNotNull(treeElement);

    sinon.stub(treeElement!, 'isDisplayContents').returns(true);
    const highlightSpy = sinon.spy(model.overlayModel(), 'highlightInOverlay');

    treeOutline['highlightTreeElement'](treeElement, true);

    sinon.assert.calledWith(highlightSpy, sinon.match({node: childNode, selectorList: '*'}), 'all', true);
  });

  it('highlights the closing tag and not the opening tag when hovering over expanded closing tag', () => {
    const childPayload = {
      nodeId: 3 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 3 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'SPAN',
      localName: 'span',
      nodeValue: '',
      childNodeCount: 0,
      attributes: [],
    } as Protocol.DOM.Node;
    const containerPayload = {
      nodeId: 2 as Protocol.DOM.NodeId,
      parentId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 1,
      children: [childPayload],
      attributes: [],
    } as Protocol.DOM.Node;
    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'BODY',
      localName: 'body',
      nodeValue: '',
      childNodeCount: 1,
      children: [containerPayload],
      attributes: [],
    });
    assert.isNotNull(rootNode);
    treeOutline.rootDOMNode = rootNode;

    const containerNode = rootNode.children()![0];
    const containerTreeElement = treeOutline.findTreeElement(containerNode);
    assert.isNotNull(containerTreeElement);
    containerTreeElement!.expand();

    const closingTreeElement = containerTreeElement!.childAt(containerTreeElement!.childCount() - 1) as
        Elements.ElementsTreeElement.ElementsTreeElement;
    assert.exists(closingTreeElement);
    assert.isTrue(closingTreeElement.isClosingTag());

    const highlightSpy = sinon.spy(model.overlayModel(), 'highlightInOverlay');

    // Hover over closing tag.
    closingTreeElement.listItemElement.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
    assert.isTrue(closingTreeElement.hovered);
    assert.isTrue(closingTreeElement.listItemElement.classList.contains('hovered'));
    assert.isFalse(containerTreeElement!.hovered);
    assert.isFalse(containerTreeElement!.listItemElement.classList.contains('hovered'));
    sinon.assert.calledWith(highlightSpy, sinon.match({node: containerNode}), 'all', true);

    // Hover over opening tag.
    containerTreeElement!.listItemElement.dispatchEvent(new MouseEvent('mousemove', {bubbles: true}));
    assert.isFalse(closingTreeElement.hovered);
    assert.isFalse(closingTreeElement.listItemElement.classList.contains('hovered'));
    assert.isTrue(containerTreeElement!.hovered);
    assert.isTrue(containerTreeElement!.listItemElement.classList.contains('hovered'));
  });

  it('updates the DOM tree structure upon changing or removing namespaced attributes', () => {
    const aNodePayload = {
      nodeId: 2 as Protocol.DOM.NodeId,
      parentId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'a',
      localName: 'a',
      nodeValue: '',
      childNodeCount: 0,
      attributes: ['id', 'node', 'xlink:href', 'http://localhost'],
    } as Protocol.DOM.Node;
    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'svg',
      localName: 'svg',
      nodeValue: '',
      childNodeCount: 1,
      children: [aNodePayload],
      attributes: [],
    });
    assert.isNotNull(rootNode);
    treeOutline.rootDOMNode = rootNode;

    const aNode = rootNode.children()![0];
    const treeElement = treeOutline.findTreeElement(aNode);
    assert.isNotNull(treeElement);

    const getAttributeValue = (name: string): string|null => {
      const attributes = treeElement.widget.contentElement.querySelectorAll('.webkit-html-attribute');
      for (const attribute of attributes) {
        const nameElement = attribute.getElementsByClassName('webkit-html-attribute-name')[0];
        if (nameElement?.textContent === name) {
          const valueElement = attribute.getElementsByClassName('webkit-html-attribute-value')[0];
          return valueElement?.textContent ? valueElement.textContent.replace(/\u200B/g, '') : '';
        }
      }
      return null;
    };

    // Initial state: namespaced attribute is present
    assert.strictEqual(aNode.getAttribute('xlink:href'), 'http://localhost');
    assert.strictEqual(getAttributeValue('xlink:href'), 'http://localhost');

    // Modify attribute
    model.attributeModified(aNode.id, 'xlink:href', 'changed-url');
    treeOutline.runPendingUpdates();

    assert.strictEqual(aNode.getAttribute('xlink:href'), 'changed-url');
    assert.strictEqual(getAttributeValue('xlink:href'), 'changed-url');

    // Remove attribute
    model.attributeRemoved(aNode.id, 'xlink:href');
    treeOutline.runPendingUpdates();

    assert.isUndefined(aNode.getAttribute('xlink:href'));
    assert.isNull(getAttributeValue('xlink:href'));
  });

  it('properly populates and selects after immediate updates', async () => {
    sinon.stub(model.target().domAgent(), 'invoke_requestChildNodes').callsFake(async payload => {
      const nodeId = payload.nodeId;
      if (nodeId === 3) {  // 3 is the BODY node ID
        const child1 = {
          nodeId: 4 as Protocol.DOM.NodeId,
          parentId: 3 as Protocol.DOM.NodeId,
          backendNodeId: 4 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'DIV',
          localName: 'div',
          nodeValue: '',
          childNodeCount: 0,
          attributes: [],
        } as Protocol.DOM.Node;
        const child2 = {
          nodeId: 5 as Protocol.DOM.NodeId,
          parentId: 3 as Protocol.DOM.NodeId,
          backendNodeId: 5 as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'DIV',
          localName: 'div',
          nodeValue: '',
          childNodeCount: 0,
          attributes: [],
        } as Protocol.DOM.Node;

        // Simulating the backend pushing the children to the model
        model.setChildNodes(3 as Protocol.DOM.NodeId, [child1, child2]);
      }
      return {getError: () => undefined} as Protocol.ProtocolResponseWithError;
    });

    const bodyPayload = {
      nodeId: 3 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 3 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'BODY',
      localName: 'body',
      nodeValue: '',
      childNodeCount: 2,
    } as Protocol.DOM.Node;

    const htmlPayload = {
      nodeId: 2 as Protocol.DOM.NodeId,
      parentId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'HTML',
      localName: 'html',
      nodeValue: '',
      childNodeCount: 1,
      children: [bodyPayload],
    } as Protocol.DOM.Node;

    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      localName: '',
      nodeValue: '',
      childNodeCount: 1,
      children: [htmlPayload],
    });
    assert.isNotNull(rootNode);
    treeOutline.rootDOMNode = rootNode;

    const htmlNode = rootNode.children()![0];
    const node = htmlNode.children()![0];

    treeOutline.selectDOMNode(node);

    assert.isNull(node.children());
    assert.strictEqual(node.childNodeCount(), 2);

    // Any operation that modifies the node, followed by an immediate, synchronous update.
    model.childNodeCountUpdated(node.id, 3);
    treeOutline.updateModifiedNodes();

    assert.isNull(node.children());
    assert.strictEqual(node.childNodeCount(), 3);

    const treeElement = treeOutline.findTreeElement(node) as Elements.ElementsTreeElement.ElementsTreeElement;
    assert.isNotNull(treeElement);

    treeElement.expand();
    await new Promise(r => setTimeout(r, 0));

    assert.strictEqual(treeElement.childCount(), 3);

    treeOutline.selectDOMNode(node, true);

    const selectedTreeElement = treeOutline.selectedTreeElement as Elements.ElementsTreeElement.ElementsTreeElement;
    assert.strictEqual(selectedTreeElement?.node().nodeName(), 'BODY');
  });

  it('tests that elements hidden by "Show more" limit are revealed properly', async () => {
    const childrenPayload = [];
    for (let i = 1; i <= 10; i++) {
      childrenPayload.push({
        nodeId: (i + 2) as Protocol.DOM.NodeId,
        parentId: 2 as Protocol.DOM.NodeId,
        backendNodeId: (i + 2) as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'DIV',
        localName: 'div',
        nodeValue: '',
        childNodeCount: 1,
        children: [{
          nodeId: (i + 100) as Protocol.DOM.NodeId,
          parentId: (i + 2) as Protocol.DOM.NodeId,
          backendNodeId: (i + 100) as Protocol.DOM.BackendNodeId,
          nodeType: Node.ELEMENT_NODE,
          nodeName: 'SPAN',
          localName: 'span',
          nodeValue: '',
          childNodeCount: 0,
          attributes: ['id', `id${i}`],
        } as Protocol.DOM.Node],
        attributes: [],
      } as Protocol.DOM.Node);
    }

    const containerPayload = {
      nodeId: 2 as Protocol.DOM.NodeId,
      parentId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      attributes: ['id', 'data'],
      childNodeCount: 10,
      children: childrenPayload,
    } as Protocol.DOM.Node;

    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 1,
      children: [containerPayload],
      attributes: [],
    });

    treeOutline.rootDOMNode = rootNode;

    const containerNode = rootNode.children()![0];
    assert.exists(containerNode);

    const containerTreeElement =
        treeOutline.findTreeElement(containerNode) as Elements.ElementsTreeElement.ElementsTreeElement;
    assert.exists(containerTreeElement);

    // Set the expanded children limit to 5.
    treeOutline.setExpandedChildrenLimit(containerTreeElement, 5);

    await treeOutline.populateTreeElement(containerTreeElement);
    containerTreeElement.expand();

    // Verify only 5 children are visible, along with 1 button and 1 closing tag.
    assert.strictEqual(containerTreeElement.childCount(), 7);  // Five children, one button, and one closing tag.
    assert.exists(containerTreeElement.expandAllButtonElement);
    assert.strictEqual(containerTreeElement.expandAllButtonElement.title, 'Show all nodes (5 more)');

    // Now reveal the 10th child (id10).
    const hiddenNode = containerNode.children()![9];
    assert.exists(hiddenNode);

    // Select the hidden node, which should trigger a reveal and expand the limit.
    treeOutline.selectDOMNode(hiddenNode);

    // Wait for updates.
    await new Promise(r => setTimeout(r, 0));

    // Verify the limit is expanded to 10.
    assert.strictEqual(containerTreeElement.expandedChildrenLimit(), 10);
    // Verify the "Show all" button is gone.
    assert.isNull(containerTreeElement.expandAllButtonElement);
    // Verify all 10 children are visible, plus 1 closing tag.
    assert.strictEqual(containerTreeElement.childCount(), 11);
  });

  it('expands elements recursively', async () => {
    let childPayload: Protocol.DOM.Node = {
      nodeId: 10 as Protocol.DOM.NodeId,
      parentId: 9 as Protocol.DOM.NodeId,
      backendNodeId: 10 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      attributes: ['id', 'depth-10'],
    } as Protocol.DOM.Node;

    for (let i = 9; i >= 1; i--) {
      childPayload = {
        nodeId: i as Protocol.DOM.NodeId,
        parentId: (i - 1) as Protocol.DOM.NodeId,
        backendNodeId: i as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'DIV',
        localName: 'div',
        nodeValue: '',
        childNodeCount: 1,
        children: [childPayload],
        attributes: ['id', `depth-${i}`],
      } as Protocol.DOM.Node;
    }

    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 0 as Protocol.DOM.NodeId,
      backendNodeId: 0 as Protocol.DOM.BackendNodeId,
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      localName: '',
      nodeValue: '',
      childNodeCount: 1,
      children: [childPayload],
      attributes: [],
    });

    treeOutline.rootDOMNode = rootNode;
    const depth1Node = rootNode.children()![0];
    const treeElement = treeOutline.findTreeElement(depth1Node) as Elements.ElementsTreeElement.ElementsTreeElement;

    await treeElement.expandRecursively();

    let currentTreeElement: UI.TreeOutline.TreeElement = treeElement;
    for (let i = 1; i < 10; i++) {
      assert.isTrue(currentTreeElement.expanded, `depth-${i} should be expanded`);
      // It should have some visible child
      assert.isAbove(currentTreeElement.childCount(), 0, `depth-${i} should have at least 1 child`);
      currentTreeElement = currentTreeElement.childAt(0) as UI.TreeOutline.TreeElement;
    }
    assert.isFalse(currentTreeElement.expanded, 'depth-10 should not be expanded');
  });

  it('updates the DOM tree structure upon node insertion', async () => {
    const child1Payload = {
      nodeId: 3 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 3 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      children: [],
      attributes: ['id', 'child1'],
    } as Protocol.DOM.Node;

    const child2Payload = {
      nodeId: 4 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 4 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      children: [],
      attributes: ['id', 'child2'],
    } as Protocol.DOM.Node;

    const child3Payload = {
      nodeId: 5 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 5 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      children: [],
      attributes: ['id', 'child3'],
    } as Protocol.DOM.Node;

    const containerPayload = {
      nodeId: 2 as Protocol.DOM.NodeId,
      parentId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 3,
      children: [child1Payload, child2Payload, child3Payload],
      attributes: ['id', 'container'],
    } as Protocol.DOM.Node;

    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      localName: '',
      nodeValue: '',
      childNodeCount: 1,
      children: [containerPayload],
      attributes: [],
    });

    treeOutline.rootDOMNode = rootNode;
    const containerNode = rootNode.children()![0];
    assert.exists(containerNode);
    const containerTreeElement =
        treeOutline.findTreeElement(containerNode) as Elements.ElementsTreeElement.ElementsTreeElement;
    assert.exists(containerTreeElement);
    await treeOutline.populateTreeElement(containerTreeElement);
    containerTreeElement.expand();

    const getChildIds = (): string[] => {
      return (containerNode.children() || []).map(child => child.getAttribute('id') || '');
    };

    // Verify the initial state.
    assert.deepEqual(getChildIds(), ['child1', 'child2', 'child3']);
    assert.isNotNull(treeOutline.findTreeElement(containerNode.children()![0]));
    assert.isNotNull(treeOutline.findTreeElement(containerNode.children()![1]));
    assert.isNotNull(treeOutline.findTreeElement(containerNode.children()![2]));

    // Insert before first child.
    const childBeforePayload = {
      nodeId: 6 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 6 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      children: [],
      attributes: ['id', 'child-before'],
    } as Protocol.DOM.Node;
    model.childNodeInserted(2 as Protocol.DOM.NodeId, 0 as Protocol.DOM.NodeId, childBeforePayload);
    treeOutline.runPendingUpdates();
    assert.deepEqual(getChildIds(), ['child-before', 'child1', 'child2', 'child3']);
    const childBeforeNode = model.nodeForId(6 as Protocol.DOM.NodeId);
    assert.exists(childBeforeNode);
    assert.isNotNull(treeOutline.findTreeElement(childBeforeNode));

    // Insert middle child (before child2, after child1).
    const childMiddlePayload = {
      nodeId: 7 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 7 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      children: [],
      attributes: ['id', 'child-middle'],
    } as Protocol.DOM.Node;
    model.childNodeInserted(2 as Protocol.DOM.NodeId, 3 as Protocol.DOM.NodeId, childMiddlePayload);
    treeOutline.runPendingUpdates();
    assert.deepEqual(getChildIds(), ['child-before', 'child1', 'child-middle', 'child2', 'child3']);
    const childMiddleNode = model.nodeForId(7 as Protocol.DOM.NodeId);
    assert.exists(childMiddleNode);
    assert.isNotNull(treeOutline.findTreeElement(childMiddleNode));

    // Append child (after child3).
    const childAfterPayload = {
      nodeId: 8 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 8 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      children: [],
      attributes: ['id', 'child-after'],
    } as Protocol.DOM.Node;
    model.childNodeInserted(2 as Protocol.DOM.NodeId, 5 as Protocol.DOM.NodeId, childAfterPayload);
    treeOutline.runPendingUpdates();
    assert.deepEqual(getChildIds(), ['child-before', 'child1', 'child-middle', 'child2', 'child3', 'child-after']);
    const childAfterNode = model.nodeForId(8 as Protocol.DOM.NodeId);
    assert.exists(childAfterNode);
    assert.isNotNull(treeOutline.findTreeElement(childAfterNode));

    // Append child with text node.
    const textChildPayload = {
      nodeId: 10 as Protocol.DOM.NodeId,
      parentId: 9 as Protocol.DOM.NodeId,
      backendNodeId: 10 as Protocol.DOM.BackendNodeId,
      nodeType: Node.TEXT_NODE,
      nodeName: '#text',
      localName: '',
      nodeValue: 'Text',
      childNodeCount: 0,
    } as Protocol.DOM.Node;
    const childWithTextPayload = {
      nodeId: 9 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 9 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 1,
      children: [textChildPayload],
      attributes: ['id', 'child-with-text', 'style', 'display: none;'],
    } as Protocol.DOM.Node;
    model.childNodeInserted(2 as Protocol.DOM.NodeId, 8 as Protocol.DOM.NodeId, childWithTextPayload);
    treeOutline.runPendingUpdates();
    assert.deepEqual(getChildIds(),
                     ['child-before', 'child1', 'child-middle', 'child2', 'child3', 'child-after', 'child-with-text']);
    const childWithTextNode = model.nodeForId(9 as Protocol.DOM.NodeId);
    assert.exists(childWithTextNode);
    assert.isNotNull(treeOutline.findTreeElement(childWithTextNode));
    const boundTextNode = model.nodeForId(10 as Protocol.DOM.NodeId);
    assert.exists(boundTextNode);
    assert.strictEqual(boundTextNode.nodeValue(), 'Text');

    // Insert first text node into child3.
    const firstTextPayload = {
      nodeId: 11 as Protocol.DOM.NodeId,
      parentId: 5 as Protocol.DOM.NodeId,
      backendNodeId: 11 as Protocol.DOM.BackendNodeId,
      nodeType: Node.TEXT_NODE,
      nodeName: '#text',
      localName: '',
      nodeValue: 'First text',
      childNodeCount: 0,
    } as Protocol.DOM.Node;
    model.childNodeInserted(5 as Protocol.DOM.NodeId, 0 as Protocol.DOM.NodeId, firstTextPayload);
    treeOutline.runPendingUpdates();
    const child3Node = model.nodeForId(5 as Protocol.DOM.NodeId);
    assert.exists(child3Node);
    const boundFirstTextNode = model.nodeForId(11 as Protocol.DOM.NodeId);
    assert.exists(boundFirstTextNode);
    assert.strictEqual(boundFirstTextNode.nodeValue(), 'First text');
  });

  it('updates the DOM tree structure upon node removal', async () => {
    const textNodePayload = {
      nodeId: 7 as Protocol.DOM.NodeId,
      parentId: 3 as Protocol.DOM.NodeId,
      backendNodeId: 7 as Protocol.DOM.BackendNodeId,
      nodeType: Node.TEXT_NODE,
      nodeName: '#text',
      localName: '',
      nodeValue: 'Text',
      childNodeCount: 0,
      children: [],
    } as Protocol.DOM.Node;

    const child1Payload = {
      nodeId: 3 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 3 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 1,
      children: [textNodePayload],
      attributes: ['id', 'child1'],
    } as Protocol.DOM.Node;

    const child2Payload = {
      nodeId: 4 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 4 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      children: [],
      attributes: ['id', 'child2'],
    } as Protocol.DOM.Node;

    const child3Payload = {
      nodeId: 5 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 5 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      children: [],
      attributes: ['id', 'child3'],
    } as Protocol.DOM.Node;

    const child4Payload = {
      nodeId: 6 as Protocol.DOM.NodeId,
      parentId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 6 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      children: [],
      attributes: ['id', 'child4'],
    } as Protocol.DOM.Node;

    const containerPayload = {
      nodeId: 2 as Protocol.DOM.NodeId,
      parentId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 4,
      children: [child1Payload, child2Payload, child3Payload, child4Payload],
      attributes: ['id', 'container'],
    } as Protocol.DOM.Node;

    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      localName: '',
      nodeValue: '',
      childNodeCount: 1,
      children: [containerPayload],
      attributes: [],
    });

    treeOutline.rootDOMNode = rootNode;
    const containerNode = rootNode.children()![0];
    assert.exists(containerNode);
    const containerTreeElement =
        treeOutline.findTreeElement(containerNode) as Elements.ElementsTreeElement.ElementsTreeElement;
    assert.exists(containerTreeElement);
    await treeOutline.populateTreeElement(containerTreeElement);
    containerTreeElement.expand();

    const getChildIds = (): string[] => {
      return (containerNode.children() || []).map(child => child.getAttribute('id') || '');
    };

    // Verify the initial state.
    assert.deepEqual(getChildIds(), ['child1', 'child2', 'child3', 'child4']);
    assert.isNotNull(treeOutline.findTreeElement(containerNode.children()![0]));
    assert.isNotNull(treeOutline.findTreeElement(containerNode.children()![1]));
    assert.isNotNull(treeOutline.findTreeElement(containerNode.children()![2]));
    assert.isNotNull(treeOutline.findTreeElement(containerNode.children()![3]));

    // Remove text node
    model.childNodeRemoved(3 as Protocol.DOM.NodeId, 7 as Protocol.DOM.NodeId);
    treeOutline.runPendingUpdates();
    assert.deepEqual(getChildIds(), ['child1', 'child2', 'child3', 'child4']);
    assert.isNull(model.nodeForId(7 as Protocol.DOM.NodeId));
    const child1Node = model.nodeForId(3 as Protocol.DOM.NodeId);
    assert.exists(child1Node);
    assert.strictEqual(child1Node.childNodeCount(), 0);

    // Remove first child
    model.childNodeRemoved(2 as Protocol.DOM.NodeId, 3 as Protocol.DOM.NodeId);
    treeOutline.runPendingUpdates();
    assert.deepEqual(getChildIds(), ['child2', 'child3', 'child4']);
    assert.isNull(model.nodeForId(3 as Protocol.DOM.NodeId));

    // Remove middle child (child3)
    model.childNodeRemoved(2 as Protocol.DOM.NodeId, 5 as Protocol.DOM.NodeId);
    treeOutline.runPendingUpdates();
    assert.deepEqual(getChildIds(), ['child2', 'child4']);
    assert.isNull(model.nodeForId(5 as Protocol.DOM.NodeId));

    // Remove last child (child4)
    model.childNodeRemoved(2 as Protocol.DOM.NodeId, 6 as Protocol.DOM.NodeId);
    treeOutline.runPendingUpdates();
    assert.deepEqual(getChildIds(), ['child2']);
    assert.isNull(model.nodeForId(6 as Protocol.DOM.NodeId));

    // Remove the only (child2)
    model.childNodeRemoved(2 as Protocol.DOM.NodeId, 4 as Protocol.DOM.NodeId);
    treeOutline.runPendingUpdates();
    assert.deepEqual(getChildIds(), []);
    assert.isNull(model.nodeForId(4 as Protocol.DOM.NodeId));
  });

  it('displays author shadow roots and hides user-agent ones by default', async () => {
    const nodePayload = {
      nodeId: 2 as Protocol.DOM.NodeId,
      parentId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
      childNodeCount: 0,
      shadowRoots: [
        {
          nodeId: 3 as Protocol.DOM.NodeId,
          parentId: 2 as Protocol.DOM.NodeId,
          backendNodeId: 3 as Protocol.DOM.BackendNodeId,
          nodeType: Node.DOCUMENT_FRAGMENT_NODE,
          nodeName: '#shadow-root',
          localName: '',
          nodeValue: '',
          childNodeCount: 1,
          shadowRootType: Protocol.DOM.ShadowRootType.Open,
          children: [{
            nodeId: 4 as Protocol.DOM.NodeId,
            parentId: 3 as Protocol.DOM.NodeId,
            backendNodeId: 4 as Protocol.DOM.BackendNodeId,
            nodeType: Node.TEXT_NODE,
            nodeName: '#text',
            localName: '',
            nodeValue: '',
            childNodeCount: 0,
          }],
        },
        {
          nodeId: 5 as Protocol.DOM.NodeId,
          parentId: 2 as Protocol.DOM.NodeId,
          backendNodeId: 5 as Protocol.DOM.BackendNodeId,
          nodeType: Node.DOCUMENT_FRAGMENT_NODE,
          nodeName: '#shadow-root',
          localName: '',
          nodeValue: '',
          childNodeCount: 1,
          shadowRootType: Protocol.DOM.ShadowRootType.Closed,
          children: [{
            nodeId: 6 as Protocol.DOM.NodeId,
            parentId: 5 as Protocol.DOM.NodeId,
            backendNodeId: 6 as Protocol.DOM.BackendNodeId,
            nodeType: Node.TEXT_NODE,
            nodeName: '#text',
            localName: '',
            nodeValue: '',
            childNodeCount: 0,
          }],
        },
        {
          nodeId: 7 as Protocol.DOM.NodeId,
          parentId: 2 as Protocol.DOM.NodeId,
          backendNodeId: 7 as Protocol.DOM.BackendNodeId,
          nodeType: Node.DOCUMENT_FRAGMENT_NODE,
          nodeName: '#shadow-root',
          localName: '',
          nodeValue: '',
          childNodeCount: 1,
          shadowRootType: Protocol.DOM.ShadowRootType.UserAgent,
          children: [{
            nodeId: 8 as Protocol.DOM.NodeId,
            parentId: 7 as Protocol.DOM.NodeId,
            backendNodeId: 8 as Protocol.DOM.BackendNodeId,
            nodeType: Node.TEXT_NODE,
            nodeName: '#text',
            localName: '',
            nodeValue: '',
            childNodeCount: 0,
          }],
        },
      ],
      children: [],
      attributes: ['id', 'container'],
    } as Protocol.DOM.Node;

    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.DOCUMENT_NODE,
      nodeName: '#document',
      localName: '',
      nodeValue: '',
      childNodeCount: 1,
      children: [nodePayload],
      attributes: [],
    });

    treeOutline.rootDOMNode = rootNode;
    const containerNode = rootNode.children()![0];
    assert.exists(containerNode);
    const containerTreeElement =
        treeOutline.findTreeElement(containerNode) as Elements.ElementsTreeElement.ElementsTreeElement;
    assert.exists(containerTreeElement);
    await treeOutline.populateTreeElement(containerTreeElement);
    containerTreeElement.expand();

    const children = [];
    for (let i = 0; i < containerTreeElement.childCount(); i++) {
      const child = containerTreeElement.childAt(i);
      if (child instanceof Elements.ElementsTreeElement.ElementsTreeElement) {
        children.push(child);
      }
    }

    const shadowRoots = children.filter(child => child.node().isShadowRoot());

    assert.lengthOf(shadowRoots, 2);
    assert.strictEqual(shadowRoots[0].node().id, 3);
    assert.strictEqual(shadowRoots[0].node().shadowRootType(), Protocol.DOM.ShadowRootType.Open);
    assert.strictEqual(shadowRoots[1].node().id, 5);
    assert.strictEqual(shadowRoots[1].node().shadowRootType(), Protocol.DOM.ShadowRootType.Closed);
  });

  describe('Drag and drop', () => {
    let parentNode: SDK.DOMModel.DOMNode;
    let childNode1: SDK.DOMModel.DOMNode;
    let childNode2: SDK.DOMModel.DOMNode;
    let childTreeElement1: Elements.ElementsTreeElement.ElementsTreeElement;
    let childTreeElement2: Elements.ElementsTreeElement.ElementsTreeElement;

    beforeEach(async () => {
      parentNode = SDK.DOMModel.DOMNode.create(model, null, false, {
        nodeId: 1 as Protocol.DOM.NodeId,
        backendNodeId: 1 as Protocol.DOM.BackendNodeId,
        nodeType: Node.ELEMENT_NODE,
        nodeName: 'BODY',
        localName: 'body',
        nodeValue: '',
        childNodeCount: 2,
        children: [
          {
            nodeId: 2 as Protocol.DOM.NodeId,
            backendNodeId: 2 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'SPAN',
            localName: 'span',
            nodeValue: '',
          },
          {
            nodeId: 3 as Protocol.DOM.NodeId,
            backendNodeId: 3 as Protocol.DOM.BackendNodeId,
            nodeType: Node.ELEMENT_NODE,
            nodeName: 'P',
            localName: 'p',
            nodeValue: '',
          },
        ],
      });
      childNode1 = parentNode.children()![0];
      childNode2 = parentNode.children()![1];

      treeOutline.domTreeWidget = new Elements.DOMTreeWidget.DOMTreeWidget();
      treeOutline.rootDOMNode = parentNode;
      renderElementIntoDOM(treeOutline.element);
      await doubleRaf();

      childTreeElement1 = treeOutline.findTreeElement(childNode1) as Elements.ElementsTreeElement.ElementsTreeElement;
      childTreeElement2 = treeOutline.findTreeElement(childNode2) as Elements.ElementsTreeElement.ElementsTreeElement;
      assert.exists(childTreeElement1);
      assert.exists(childTreeElement2);
    });

    it('sets renderSelection to true and configures draggable on list items', () => {
      assert.isTrue(treeOutline.renderSelection);
      assert.isTrue(childTreeElement1.listItemElement.draggable);
      assert.isTrue(childTreeElement2.listItemElement.draggable);
    });

    it('renders exactly one selection element when hovered to avoid duplicate highlights', async () => {
      childTreeElement1.hovered = true;
      await doubleRaf();
      const selections = childTreeElement1.listItemElement.querySelectorAll('.selection');
      assert.lengthOf(selections, 1);
      assert.isNull(childTreeElement1.listItemElement.querySelector(':scope > .selection'));
    });

    it('handles dragstart and populates dataTransfer', () => {
      const dataStore = new Map<string, string>();
      const dragEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: {
          setData: (type: string, val: string) => dataStore.set(type, val),
          effectAllowed: 'none',
        },
      });

      childTreeElement1.listItemElement.dispatchEvent(dragEvent);
      assert.isTrue(dataStore.has('text/plain'));
    });

    it('adds and removes elements-drag-over class on dragover and dragleave', () => {
      const dragEvent = new DragEvent('dragstart', {bubbles: true, cancelable: true});
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: {setData: () => {}, effectAllowed: 'none'},
      });
      childTreeElement1.listItemElement.dispatchEvent(dragEvent);

      const dragOverEvent = new DragEvent('dragover', {bubbles: true, cancelable: true});
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: {dropEffect: 'none'},
      });
      childTreeElement2.listItemElement.dispatchEvent(dragOverEvent);
      assert.isTrue(childTreeElement2.listItemElement.classList.contains('elements-drag-over'));

      const dragLeaveEvent = new DragEvent('dragleave', {bubbles: true, cancelable: true});
      childTreeElement2.listItemElement.dispatchEvent(dragLeaveEvent);
      assert.isFalse(childTreeElement2.listItemElement.classList.contains('elements-drag-over'));
    });

    it('moves node on drop', () => {
      const moveToStub = sinon.stub(childNode1, 'moveTo');
      const dragEvent = new DragEvent('dragstart', {bubbles: true, cancelable: true});
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: {setData: () => {}, effectAllowed: 'none'},
      });
      childTreeElement1.listItemElement.dispatchEvent(dragEvent);

      const dropEvent = new DragEvent('drop', {bubbles: true, cancelable: true});
      childTreeElement2.listItemElement.dispatchEvent(dropEvent);

      sinon.assert.calledOnce(moveToStub);
      assert.strictEqual(moveToStub.firstCall.args[0], parentNode);
      assert.strictEqual(moveToStub.firstCall.args[1], childNode2);
    });
  });

  function makeNodePayload(nodeId: number, nodeName: string, opts: Partial<Protocol.DOM.Node> = {}): Protocol.DOM.Node {
    return {
      nodeId: nodeId as Protocol.DOM.NodeId,
      backendNodeId: nodeId as Protocol.DOM.BackendNodeId,
      nodeType: opts.nodeType ?? Node.ELEMENT_NODE,
      nodeName,
      localName: opts.localName ?? nodeName.toLowerCase(),
      nodeValue: opts.nodeValue ?? '',
      childNodeCount: opts.children?.length ?? opts.childNodeCount ?? 0,
      children: opts.children ?? [],
      attributes: opts.attributes ?? [],
      ...opts,
    };
  }

  it('removes doctype and document element from #document via ChildNodeRemoved without crashing', () => {
    const doctypePayload = makeNodePayload(
        2, 'html', {parentId: 1 as Protocol.DOM.NodeId, nodeType: Node.DOCUMENT_TYPE_NODE, publicId: '', systemId: ''});
    const htmlPayload = makeNodePayload(3, 'HTML', {parentId: 1 as Protocol.DOM.NodeId});
    const rootNode = SDK.DOMModel.DOMNode.create(
        model, null, false,
        makeNodePayload(1, '#document', {nodeType: Node.DOCUMENT_NODE, children: [doctypePayload, htmlPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const doctypeNode = model.nodeForId(2 as Protocol.DOM.NodeId)!;
    const htmlNode = model.nodeForId(3 as Protocol.DOM.NodeId)!;
    const doctypeTreeElement = treeOutline.findTreeElement(doctypeNode);
    assert.isNotNull(doctypeTreeElement);
    assert.isNotNull(treeOutline.findTreeElement(htmlNode));
    const topLevelNodes = () => treeOutline.rootElement().children().map(
        child => child instanceof Elements.ElementsTreeElement.ElementsTreeElement ? child.node() : null);
    assert.include(topLevelNodes(), doctypeNode);

    model.childNodeRemoved(1 as Protocol.DOM.NodeId, 2 as Protocol.DOM.NodeId);
    treeOutline.runPendingUpdates();
    assert.isNull(model.nodeForId(2 as Protocol.DOM.NodeId));
    // The doctype tree element must be gone from the rendered tree.
    assert.notInclude(topLevelNodes(), doctypeNode);
    assert.isNull(doctypeTreeElement.parent);
    assert.isNull(doctypeTreeElement.treeOutline);
    assert.isNotNull(treeOutline.findTreeElement(htmlNode));

    model.childNodeRemoved(1 as Protocol.DOM.NodeId, 3 as Protocol.DOM.NodeId);
    treeOutline.runPendingUpdates();
    assert.isNull(model.nodeForId(3 as Protocol.DOM.NodeId));
    assert.isEmpty(rootNode.children() ?? []);
  });

  it('updates isExpandable on a collapsed element when ChildNodeCountUpdated fires', () => {
    const childPayload =
        makeNodePayload(2, 'DIV', {parentId: 1 as Protocol.DOM.NodeId, attributes: ['id', 'collapsed-target']});
    const rootNode =
        SDK.DOMModel.DOMNode.create(model, null, false, makeNodePayload(1, 'BODY', {children: [childPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const childNode = model.nodeForId(2 as Protocol.DOM.NodeId)!;
    const treeElement = treeOutline.findTreeElement(childNode)!;
    assert.isFalse(treeElement.expanded);
    assert.isFalse(treeElement.isExpandable());

    model.childNodeCountUpdated(2 as Protocol.DOM.NodeId, 1);
    treeOutline.runPendingUpdates();

    assert.isTrue(treeElement.isExpandable());
    assert.isFalse(treeElement.expanded);
  });

  it('updates tree element title when setting an attribute on a non-HTML SVG element', () => {
    const rectPayload = makeNodePayload(2, 'rect', {parentId: 1 as Protocol.DOM.NodeId, attributes: ['width', '100']});
    const rootNode =
        SDK.DOMModel.DOMNode.create(model, null, false, makeNodePayload(1, 'svg', {children: [rectPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const rectNode = model.nodeForId(2 as Protocol.DOM.NodeId)!;
    const rectTreeElement = treeOutline.findTreeElement(rectNode)!;
    model.attributeModified(2 as Protocol.DOM.NodeId, 'viewBox', '0 0 50 50');
    treeOutline.runPendingUpdates();

    assert.strictEqual(rectNode.getAttribute('viewBox'), '0 0 50 50');
    assert.include(rectTreeElement.widget.contentElement.textContent, 'viewBox');
    assert.include(rectTreeElement.widget.contentElement.textContent, '0 0 50 50');
  });

  it('creates open and closed #shadow-root tree elements when ShadowRootPushed fires', async () => {
    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, makeNodePayload(1, 'BODY', {
                                                   children: [
                                                     makeNodePayload(2, 'DIV', {parentId: 1 as Protocol.DOM.NodeId}),
                                                     makeNodePayload(3, 'DIV', {parentId: 1 as Protocol.DOM.NodeId}),
                                                   ],
                                                 }));
    treeOutline.rootDOMNode = rootNode;

    model.shadowRootPushed(2 as Protocol.DOM.NodeId, makeNodePayload(4, '#shadow-root', {
                             parentId: 2 as Protocol.DOM.NodeId,
                             nodeType: Node.DOCUMENT_FRAGMENT_NODE,
                             shadowRootType: Protocol.DOM.ShadowRootType.Open,
                           }));
    model.shadowRootPushed(3 as Protocol.DOM.NodeId, makeNodePayload(5, '#shadow-root', {
                             parentId: 3 as Protocol.DOM.NodeId,
                             nodeType: Node.DOCUMENT_FRAGMENT_NODE,
                             shadowRootType: Protocol.DOM.ShadowRootType.Closed,
                           }));
    treeOutline.runPendingUpdates();

    const openHostEl = treeOutline.findTreeElement(model.nodeForId(2 as Protocol.DOM.NodeId)!)!;
    const closedHostEl = treeOutline.findTreeElement(model.nodeForId(3 as Protocol.DOM.NodeId)!)!;
    await treeOutline.populateTreeElement(openHostEl);
    await treeOutline.populateTreeElement(closedHostEl);

    const openShadowEl = openHostEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
    const closedShadowEl = closedHostEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
    assert.strictEqual(openShadowEl.node().nodeNameInCorrectCase(), '#shadow-root (open)');
    assert.strictEqual(closedShadowEl.node().nodeNameInCorrectCase(), '#shadow-root (closed)');
  });

  it('renders shadow host with <slot> and distributed nodes in tree children', async () => {
    const slotPayload = makeNodePayload(5, 'SLOT', {
      parentId: 4 as Protocol.DOM.NodeId,
      distributedNodes:
          [{nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN', backendNodeId: 3 as Protocol.DOM.BackendNodeId}],
    });
    const shadowPayload = makeNodePayload(4, '#shadow-root', {
      parentId: 2 as Protocol.DOM.NodeId,
      nodeType: Node.DOCUMENT_FRAGMENT_NODE,
      shadowRootType: Protocol.DOM.ShadowRootType.Open,
      children: [slotPayload],
    });
    const hostPayload = makeNodePayload(2, 'DIV', {
      parentId: 1 as Protocol.DOM.NodeId,
      children: [makeNodePayload(3, 'SPAN', {parentId: 2 as Protocol.DOM.NodeId})],
      shadowRoots: [shadowPayload],
    });
    const rootNode = SDK.DOMModel.DOMNode.create(
        model, null, false, makeNodePayload(1, '#document', {nodeType: Node.DOCUMENT_NODE, children: [hostPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const hostEl = treeOutline.findTreeElement(model.nodeForId(2 as Protocol.DOM.NodeId)!)!;
    await treeOutline.populateTreeElement(hostEl);
    const shadowEl = hostEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
    await treeOutline.populateTreeElement(shadowEl);
    const slotEl = shadowEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
    await treeOutline.populateTreeElement(slotEl);

    assert.isTrue(slotEl.isExpandable());
    assert.lengthOf(slotEl.node().distributedNodes(), 1);
    assert.isAbove(slotEl.childCount(), 1);
  });

  it('refreshes slot links when slot attributes and DistributedNodesUpdated fire', async () => {
    const slotPayload = makeNodePayload(4, 'SLOT', {
      parentId: 3 as Protocol.DOM.NodeId,
      attributes: ['name', 's1'],
      distributedNodes: [],
    });
    const shadowPayload = makeNodePayload(3, '#shadow-root', {
      parentId: 2 as Protocol.DOM.NodeId,
      nodeType: Node.DOCUMENT_FRAGMENT_NODE,
      shadowRootType: Protocol.DOM.ShadowRootType.Open,
      children: [slotPayload],
    });
    const hostPayload = makeNodePayload(2, 'DIV', {parentId: 1 as Protocol.DOM.NodeId, shadowRoots: [shadowPayload]});
    const rootNode = SDK.DOMModel.DOMNode.create(
        model, null, false, makeNodePayload(1, '#document', {nodeType: Node.DOCUMENT_NODE, children: [hostPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const hostEl = treeOutline.findTreeElement(model.nodeForId(2 as Protocol.DOM.NodeId)!)!;
    await treeOutline.populateTreeElement(hostEl);
    const shadowEl = hostEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
    await treeOutline.populateTreeElement(shadowEl);
    const slotEl = shadowEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
    await treeOutline.populateTreeElement(slotEl);

    model.attributeModified(4 as Protocol.DOM.NodeId, 'name', 's2');
    model.distributedNodesUpdated(4 as Protocol.DOM.NodeId, [
      {nodeType: Node.ELEMENT_NODE, nodeName: 'DIV', backendNodeId: 10 as Protocol.DOM.BackendNodeId},
      {nodeType: Node.TEXT_NODE, nodeName: '#text', backendNodeId: 11 as Protocol.DOM.BackendNodeId},
    ]);
    treeOutline.runPendingUpdates();

    assert.strictEqual(slotEl.node().getAttribute('name'), 's2');
    assert.lengthOf(slotEl.node().distributedNodes(), 2);
    assert.strictEqual(slotEl.childCount(), 3);
  });

  it('removes child tree element inside a shadow root when ChildNodeRemoved fires', async () => {
    const shadowChild =
        makeNodePayload(4, 'DIV', {parentId: 3 as Protocol.DOM.NodeId, attributes: ['id', 'shadow-child']});
    const shadowPayload = makeNodePayload(3, '#shadow-root', {
      parentId: 2 as Protocol.DOM.NodeId,
      nodeType: Node.DOCUMENT_FRAGMENT_NODE,
      shadowRootType: Protocol.DOM.ShadowRootType.Open,
      children: [shadowChild],
    });
    const hostPayload = makeNodePayload(2, 'DIV', {parentId: 1 as Protocol.DOM.NodeId, shadowRoots: [shadowPayload]});
    const rootNode = SDK.DOMModel.DOMNode.create(
        model, null, false, makeNodePayload(1, '#document', {nodeType: Node.DOCUMENT_NODE, children: [hostPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const hostEl = treeOutline.findTreeElement(model.nodeForId(2 as Protocol.DOM.NodeId)!)!;
    await treeOutline.populateTreeElement(hostEl);
    const shadowEl = hostEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
    await treeOutline.populateTreeElement(shadowEl);
    assert.isNotNull(treeOutline.findTreeElement(model.nodeForId(4 as Protocol.DOM.NodeId)!));

    model.childNodeRemoved(3 as Protocol.DOM.NodeId, 4 as Protocol.DOM.NodeId);
    treeOutline.runPendingUpdates();

    assert.isNull(model.nodeForId(4 as Protocol.DOM.NodeId));
    assert.strictEqual(shadowEl.childCount(), 0);
  });

  /**
   * Describes the children of a tree element in the same spirit as the legacy
   * `ElementsTestRunner.dumpElementsTree` output.
   */
  function describeChildren(treeElement: UI.TreeOutline.TreeElement): string[] {
    return treeElement.children().map(child => {
      const shortcutTitle = child.listItemElement.querySelector('.elements-tree-shortcut-title');
      if (shortcutTitle) {
        return `${shortcutTitle.textContent?.trim()} ${
                   child.listItemElement.textContent?.includes('reveal') ? 'reveal' : ''}`
            .trim();
      }
      if (!(child instanceof Elements.ElementsTreeElement.ElementsTreeElement)) {
        return child.button ? `[${child.title}]` : '<other>';
      }
      const node = child.node();
      if (child.isClosingTag()) {
        return `</${node.nodeNameInCorrectCase()}>`;
      }
      if (node.nodeType() === Node.TEXT_NODE) {
        return `"${node.nodeValue()}"`;
      }
      const attrs = node.attributes().map(attr => ` ${attr.name}="${attr.value}"`).join('');
      return node.nodeType() === Node.ELEMENT_NODE ? `<${node.nodeNameInCorrectCase()}${attrs}>` :
                                                     node.nodeNameInCorrectCase();
    });
  }

  async function expandTreeElement(treeElement: Elements.ElementsTreeElement.ElementsTreeElement):
      Promise<Elements.ElementsTreeElement.ElementsTreeElement> {
    await treeOutline.populateTreeElement(treeElement);
    treeElement.expand();
    return treeElement;
  }

  it('keeps #shadow-root first and appends new light children last, rendering slot fallback content', async () => {
    // Mirrors legacy shadow/shadow-host-display-modes.
    const fallbackPayload =
        makeNodePayload(13, 'DIV', {parentId: 12 as Protocol.DOM.NodeId, attributes: ['id', 'fallbackOldest']});
    const slotPayload = makeNodePayload(12, 'SLOT', {
      parentId: 11 as Protocol.DOM.NodeId,
      attributes: ['name', '.distributeMeToOldest'],
      distributedNodes: [],
      children: [fallbackPayload],
    });
    const mainPayload = makeNodePayload(11, 'DIV', {
      parentId: 10 as Protocol.DOM.NodeId,
      attributes: ['class', 'oldestShadowMain'],
      children: [slotPayload],
    });
    const hostPayload = makeNodePayload(2, 'DIV', {
      parentId: 1 as Protocol.DOM.NodeId,
      attributes: ['id', 'shadowHost'],
      children: [
        makeNodePayload(3, 'DIV', {parentId: 2 as Protocol.DOM.NodeId, attributes: ['slot', 'distributeMeToYoungest']}),
        makeNodePayload(4, 'DIV', {parentId: 2 as Protocol.DOM.NodeId, attributes: ['slot', 'distributeMeToOldest']}),
      ],
    });
    const rootNode = SDK.DOMModel.DOMNode.create(
        model, null, false, makeNodePayload(1, '#document', {nodeType: Node.DOCUMENT_NODE, children: [hostPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const hostEl = await expandTreeElement(treeOutline.findTreeElement(model.nodeForId(2 as Protocol.DOM.NodeId)!)!);
    assert.deepEqual(describeChildren(hostEl), [
      '<div slot="distributeMeToYoungest">',
      '<div slot="distributeMeToOldest">',
      '</div>',
    ]);

    model.shadowRootPushed(2 as Protocol.DOM.NodeId, makeNodePayload(10, '#shadow-root', {
                             parentId: 2 as Protocol.DOM.NodeId,
                             nodeType: Node.DOCUMENT_FRAGMENT_NODE,
                             shadowRootType: Protocol.DOM.ShadowRootType.Open,
                             children: [mainPayload],
                           }));
    treeOutline.runPendingUpdates();

    assert.deepEqual(describeChildren(hostEl), [
      '#shadow-root (open)',
      '<div slot="distributeMeToYoungest">',
      '<div slot="distributeMeToOldest">',
      '</div>',
    ]);
    const shadowEl = await expandTreeElement(hostEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement);
    const mainEl = await expandTreeElement(shadowEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement);
    const slotEl = await expandTreeElement(mainEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement);
    assert.deepEqual(describeChildren(mainEl), ['<slot name=".distributeMeToOldest">', '</div>']);
    // With no distributed nodes, the slot shows its fallback child and no shortcut links.
    assert.deepEqual(describeChildren(slotEl), ['<div id="fallbackOldest">', '</slot>']);

    model.childNodeInserted(
        2 as Protocol.DOM.NodeId, 4 as Protocol.DOM.NodeId,
        makeNodePayload(5, 'DIV', {parentId: 2 as Protocol.DOM.NodeId, attributes: ['slot', 'distributeMeAsWell_1']}));
    treeOutline.runPendingUpdates();
    assert.deepEqual(describeChildren(hostEl), [
      '#shadow-root (open)',
      '<div slot="distributeMeToYoungest">',
      '<div slot="distributeMeToOldest">',
      '<div slot="distributeMeAsWell_1">',
      '</div>',
    ]);

    model.childNodeInserted(
        2 as Protocol.DOM.NodeId, 5 as Protocol.DOM.NodeId,
        makeNodePayload(6, 'DIV', {parentId: 2 as Protocol.DOM.NodeId, attributes: ['slot', 'distributeMeAsWell_2']}));
    treeOutline.runPendingUpdates();
    assert.deepEqual(describeChildren(hostEl), [
      '#shadow-root (open)',
      '<div slot="distributeMeToYoungest">',
      '<div slot="distributeMeToOldest">',
      '<div slot="distributeMeAsWell_1">',
      '<div slot="distributeMeAsWell_2">',
      '</div>',
    ]);
    assert.strictEqual(hostEl.childAt(0), shadowEl);
    assert.deepEqual(describeChildren(slotEl), ['<div id="fallbackOldest">', '</slot>']);
  });

  for (const [mode, expectedTitle] of [[Protocol.DOM.ShadowRootType.Open, '#shadow-root (open)'],
                                       [Protocol.DOM.ShadowRootType.Closed, '#shadow-root (closed)'],
  ] as const) {
    it(`inserts a ${mode} #shadow-root before existing light children of an expanded host`, async () => {
      // Mirrors legacy shadow/create-shadow-root.
      const hostPayload = makeNodePayload(2, 'DIV', {
        parentId: 1 as Protocol.DOM.NodeId,
        attributes: ['id', 'container'],
        children: [makeNodePayload(3, 'DIV', {parentId: 2 as Protocol.DOM.NodeId, attributes: ['id', 'child']})],
      });
      const rootNode = SDK.DOMModel.DOMNode.create(
          model, null, false, makeNodePayload(1, '#document', {nodeType: Node.DOCUMENT_NODE, children: [hostPayload]}));
      treeOutline.rootDOMNode = rootNode;

      const hostEl = await expandTreeElement(treeOutline.findTreeElement(model.nodeForId(2 as Protocol.DOM.NodeId)!)!);
      assert.deepEqual(describeChildren(hostEl), ['<div id="child">', '</div>']);
      const lightChildEl = hostEl.childAt(0);

      model.shadowRootPushed(
          2 as Protocol.DOM.NodeId, makeNodePayload(4, '#shadow-root', {
            parentId: 2 as Protocol.DOM.NodeId,
            nodeType: Node.DOCUMENT_FRAGMENT_NODE,
            shadowRootType: mode,
            children: [makeNodePayload(5, 'DIV', {parentId: 4 as Protocol.DOM.NodeId, attributes: ['id', 'shadow-1']})],
          }));
      treeOutline.runPendingUpdates();

      assert.deepEqual(describeChildren(hostEl), [expectedTitle, '<div id="child">', '</div>']);
      // The light child tree element is reused, just moved after the shadow root.
      assert.strictEqual(hostEl.childAt(1), lightChildEl);
      const shadowEl = hostEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement;
      assert.strictEqual(shadowEl.widget.contentElement.textContent?.trim(), expectedTitle);
      await expandTreeElement(shadowEl);
      assert.deepEqual(describeChildren(shadowEl), ['<div id="shadow-1">']);
      assert.include(
          (shadowEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement).widget.contentElement.textContent,
          'shadow-1');
    });
  }

  it('renders slot shortcut links in distributed nodes order and removes them when unassigned', async () => {
    // Mirrors legacy shadow/shadow-slot-assignment.
    const shadowPayload = makeNodePayload(3, '#shadow-root', {
      parentId: 2 as Protocol.DOM.NodeId,
      nodeType: Node.DOCUMENT_FRAGMENT_NODE,
      shadowRootType: Protocol.DOM.ShadowRootType.Open,
      children: [
        makeNodePayload(4, 'SLOT',
                        {parentId: 3 as Protocol.DOM.NodeId, attributes: ['name', 'slot1'], distributedNodes: []}),
        makeNodePayload(5, 'SLOT',
                        {parentId: 3 as Protocol.DOM.NodeId, attributes: ['name', 'slot2'], distributedNodes: []}),
      ],
    });
    const hostPayload = makeNodePayload(
        2, 'DIV', {parentId: 1 as Protocol.DOM.NodeId, attributes: ['id', 'host1'], shadowRoots: [shadowPayload]});
    const rootNode = SDK.DOMModel.DOMNode.create(
        model, null, false, makeNodePayload(1, '#document', {nodeType: Node.DOCUMENT_NODE, children: [hostPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const hostEl = await expandTreeElement(treeOutline.findTreeElement(model.nodeForId(2 as Protocol.DOM.NodeId)!)!);
    const shadowEl = await expandTreeElement(hostEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement);
    const slot1El = await expandTreeElement(shadowEl.childAt(0) as Elements.ElementsTreeElement.ElementsTreeElement);
    const slot2El = await expandTreeElement(shadowEl.childAt(1) as Elements.ElementsTreeElement.ElementsTreeElement);
    assert.deepEqual(describeChildren(slot1El), ['</slot>']);
    assert.deepEqual(describeChildren(slot2El), ['</slot>']);

    const span = {nodeType: Node.ELEMENT_NODE, nodeName: 'SPAN', backendNodeId: 6 as Protocol.DOM.BackendNodeId};
    const h1 = {nodeType: Node.ELEMENT_NODE, nodeName: 'H1', backendNodeId: 7 as Protocol.DOM.BackendNodeId};
    const text = {nodeType: Node.TEXT_NODE, nodeName: '#text', backendNodeId: 8 as Protocol.DOM.BackendNodeId};

    model.childNodeInserted(
        2 as Protocol.DOM.NodeId, 0 as Protocol.DOM.NodeId,
        makeNodePayload(6, 'SPAN', {parentId: 2 as Protocol.DOM.NodeId, attributes: ['slot', 'slot2']}));
    model.distributedNodesUpdated(5 as Protocol.DOM.NodeId, [span]);
    treeOutline.runPendingUpdates();
    assert.deepEqual(describeChildren(slot1El), ['</slot>']);
    assert.deepEqual(describeChildren(slot2El), ['\u21AA <span> reveal', '</slot>']);

    model.distributedNodesUpdated(5 as Protocol.DOM.NodeId, [span, h1, text]);
    treeOutline.runPendingUpdates();
    assert.deepEqual(describeChildren(slot2El),
                     ['\u21AA <span> reveal', '\u21AA <h1> reveal', '\u21AA #text reveal', '</slot>']);

    // Order follows the distributedNodes order reported by the backend.
    model.distributedNodesUpdated(5 as Protocol.DOM.NodeId, [h1, span]);
    treeOutline.runPendingUpdates();
    assert.deepEqual(describeChildren(slot2El), ['\u21AA <h1> reveal', '\u21AA <span> reveal', '</slot>']);

    // Reassigning to slot1 moves the links over.
    model.distributedNodesUpdated(5 as Protocol.DOM.NodeId, []);
    model.distributedNodesUpdated(4 as Protocol.DOM.NodeId, [span]);
    treeOutline.runPendingUpdates();
    assert.deepEqual(describeChildren(slot2El), ['</slot>']);
    assert.deepEqual(describeChildren(slot1El), ['\u21AA <span> reveal', '</slot>']);
  });

  it('updates the "Show all nodes" label on DOM mutations while paginated and loads all via the button', async () => {
    // Mirrors legacy elements/elements-panel-limited-children.
    const children = Array.from({length: 10}, (_, i) => makeNodePayload(10 + i, 'DIV', {
                                                parentId: 2 as Protocol.DOM.NodeId,
                                                attributes: ['id', `id${i + 1}`],
                                                children: [makeNodePayload(30 + i, '#text', {
                                                  parentId: (10 + i) as Protocol.DOM.NodeId,
                                                  nodeType: Node.TEXT_NODE,
                                                  nodeValue: String(i + 1),
                                                })],
                                              }));
    const dataPayload =
        makeNodePayload(2, 'DIV', {parentId: 3 as Protocol.DOM.NodeId, attributes: ['id', 'data'], children});
    const bodyPayload = makeNodePayload(3, 'BODY', {parentId: 1 as Protocol.DOM.NodeId, children: [dataPayload]});
    const rootNode = SDK.DOMModel.DOMNode.create(
        model, null, false, makeNodePayload(1, '#document', {nodeType: Node.DOCUMENT_NODE, children: [bodyPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const dataEl = treeOutline.findTreeElement(model.nodeForId(2 as Protocol.DOM.NodeId)!)!;
    dataEl.setExpandedChildrenLimit(5);
    await expandTreeElement(dataEl);
    treeOutline.runPendingUpdates();
    assert.deepEqual(describeChildren(dataEl), [
      '<div id="id1">',
      '<div id="id2">',
      '<div id="id3">',
      '<div id="id4">',
      '<div id="id5">',
      '[Show all nodes (5 more)]',
      '</div>',
    ]);

    // Protocol events produced by the legacy insertNode() page function:
    // append <a>#50, remove #id2, insert <a>#51 before #id1, move #51 to the end, then back before #id1.
    const anchor = (id: number) => makeNodePayload(id, 'A', {parentId: 2 as Protocol.DOM.NodeId});
    model.childNodeInserted(2 as Protocol.DOM.NodeId, 19 as Protocol.DOM.NodeId, anchor(50));
    model.childNodeRemoved(2 as Protocol.DOM.NodeId, 11 as Protocol.DOM.NodeId);
    model.childNodeInserted(2 as Protocol.DOM.NodeId, 0 as Protocol.DOM.NodeId, anchor(51));
    model.childNodeRemoved(2 as Protocol.DOM.NodeId, 51 as Protocol.DOM.NodeId);
    model.childNodeInserted(2 as Protocol.DOM.NodeId, 50 as Protocol.DOM.NodeId, anchor(51));
    model.childNodeRemoved(2 as Protocol.DOM.NodeId, 51 as Protocol.DOM.NodeId);
    model.childNodeInserted(2 as Protocol.DOM.NodeId, 0 as Protocol.DOM.NodeId, anchor(51));
    treeOutline.runPendingUpdates();

    assert.deepEqual(describeChildren(dataEl), [
      '<a>',
      '<div id="id1">',
      '<div id="id3">',
      '<div id="id4">',
      '<div id="id5">',
      '[Show all nodes (6 more)]',
      '</div>',
    ]);
    const button = dataEl.expandAllButtonElement?.button;
    assert.exists(button);

    button.click();
    treeOutline.runPendingUpdates();

    assert.isNull(dataEl.expandAllButtonElement);
    assert.deepEqual(describeChildren(dataEl), [
      '<a>',
      '<div id="id1">',
      '<div id="id3">',
      '<div id="id4">',
      '<div id="id5">',
      '<div id="id6">',
      '<div id="id7">',
      '<div id="id8">',
      '<div id="id9">',
      '<div id="id10">',
      '<a>',
      '</div>',
    ]);
  });

  it('switches an inline text element to separate child tree elements after a Range split', async () => {
    // Mirrors legacy elements/modify-chardata (testModifyViaRange).
    const textPayload = makeNodePayload(3, '#text', {
      parentId: 2 as Protocol.DOM.NodeId,
      nodeType: Node.TEXT_NODE,
      nodeValue: 'Lorem ipsum dolor sit amet',
    });
    const divPayload = makeNodePayload(
        2, 'DIV', {parentId: 1 as Protocol.DOM.NodeId, attributes: ['id', 'rangenode'], children: [textPayload]});
    const rootNode = SDK.DOMModel.DOMNode.create(
        model, null, false, makeNodePayload(1, '#document', {nodeType: Node.DOCUMENT_NODE, children: [divPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const divNode = model.nodeForId(2 as Protocol.DOM.NodeId)!;
    const divEl = treeOutline.findTreeElement(divNode)!;
    divEl.widget.performUpdate();
    // Initially, the single text child is rendered inline in the element title.
    assert.isFalse(divEl.isExpandable());
    assert.strictEqual(divEl.childCount(), 0);
    assert.strictEqual(divEl.widget.contentElement.querySelector('.webkit-html-text-node')?.textContent,
                       'Lorem ipsum dolor sit amet');

    // range.deleteContents() + range.insertNode(span) produce these protocol events.
    model.characterDataModified(3 as Protocol.DOM.NodeId, 'Lorem ipslor sit amet');
    model.characterDataModified(3 as Protocol.DOM.NodeId, 'Lorem ips');
    model.childNodeInserted(
        2 as Protocol.DOM.NodeId, 3 as Protocol.DOM.NodeId,
        makeNodePayload(4, '#text',
                        {parentId: 2 as Protocol.DOM.NodeId, nodeType: Node.TEXT_NODE, nodeValue: 'lor sit amet'}));
    model.childNodeInserted(2 as Protocol.DOM.NodeId, 3 as Protocol.DOM.NodeId, makeNodePayload(5, 'SPAN', {
                              parentId: 2 as Protocol.DOM.NodeId,
                              children: [makeNodePayload(6, '#text', {
                                parentId: 5 as Protocol.DOM.NodeId,
                                nodeType: Node.TEXT_NODE,
                                nodeValue: 'test',
                              })],
                            }));
    treeOutline.runPendingUpdates();

    assert.isTrue(divEl.isExpandable());
    await expandTreeElement(divEl);
    divEl.widget.performUpdate();
    assert.isNull(divEl.widget.contentElement.querySelector('.webkit-html-text-node'));
    assert.deepEqual(describeChildren(divEl), ['"Lorem ips"', '<span>', '"lor sit amet"', '</div>']);
    const spanEl = divEl.childAt(1) as Elements.ElementsTreeElement.ElementsTreeElement;
    spanEl.widget.performUpdate();
    assert.strictEqual(spanEl.widget.contentElement.querySelector('.webkit-html-text-node')?.textContent, 'test');
  });

  it('does not fire SelectedNodeChanged when a child is appended to the parent of the selected node', async () => {
    // Mirrors legacy elements/node-reselect-on-append-child.
    const firstPayload = makeNodePayload(3, 'DIV', {
      parentId: 2 as Protocol.DOM.NodeId,
      attributes: ['id', 'first'],
      children: [makeNodePayload(
          4, '#text', {parentId: 3 as Protocol.DOM.NodeId, nodeType: Node.TEXT_NODE, nodeValue: 'First Child'})],
    });
    const parentPayload = makeNodePayload(2, 'DIV', {parentId: 1 as Protocol.DOM.NodeId, children: [firstPayload]});
    const rootNode =
        SDK.DOMModel.DOMNode.create(model, null, false, makeNodePayload(1, 'BODY', {children: [parentPayload]}));
    treeOutline.rootDOMNode = rootNode;

    const parentNode = model.nodeForId(2 as Protocol.DOM.NodeId)!;
    const firstNode = model.nodeForId(3 as Protocol.DOM.NodeId)!;
    const parentEl = await expandTreeElement(treeOutline.findTreeElement(parentNode)!);
    treeOutline.selectDOMNode(firstNode);
    const firstEl = treeOutline.findTreeElement(firstNode)!;
    assert.strictEqual(treeOutline.selectedDOMNode(), firstNode);
    assert.strictEqual(treeOutline.selectedTreeElement, firstEl);

    const selectionChanged = sinon.spy();
    treeOutline.addEventListener(Elements.DOMTreeWidget.ElementsTreeOutline.Events.SelectedNodeChanged,
                                 selectionChanged);
    const updateChildrenSpy = sinon.spy(
        treeOutline as unknown as {updateChildren: (el: Elements.ElementsTreeElement.ElementsTreeElement) => void},
        'updateChildren');

    model.childNodeInserted(2 as Protocol.DOM.NodeId, 3 as Protocol.DOM.NodeId,
                            makeNodePayload(5, 'DIV', {parentId: 2 as Protocol.DOM.NodeId}));
    treeOutline.runPendingUpdates();

    // The parent's children were actually re-rendered...
    sinon.assert.calledWith(updateChildrenSpy, parentEl);
    assert.deepEqual(describeChildren(parentEl), ['<div id="first">', '<div>', '</div>']);
    // ...but the selection was preserved without a SelectedNodeChanged event.
    sinon.assert.notCalled(selectionChanged);
    assert.strictEqual(treeOutline.selectedDOMNode(), firstNode);
    assert.strictEqual(treeOutline.selectedTreeElement, firstEl);
    assert.isTrue(firstEl.selected);
  });

  it('unhides the tree outline and clears updateRecords when updateModifiedNodes throws with >10 modified nodes',
     () => {
       const children =
           Array.from({length: 12},
                      (_, i) => makeNodePayload(i + 2, 'DIV',
                                                {parentId: 1 as Protocol.DOM.NodeId, attributes: ['id', `item-${i}`]}));
       const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, makeNodePayload(1, 'BODY', {children}));
       treeOutline.rootDOMNode = rootNode;

       const firstChild = model.nodeForId(2 as Protocol.DOM.NodeId)!;
       const firstChildEl = treeOutline.findTreeElement(firstChild)!;
       sinon.stub(firstChildEl, 'updateTitle').throws(new Error('Simulated updateTitle failure'));

       for (let i = 0; i < 12; i++) {
         model.attributeModified((i + 2) as Protocol.DOM.NodeId, 'class', 'updated');
       }

       assert.throws(() => treeOutline.runPendingUpdates(), 'Simulated updateTitle failure');
       assert.isFalse(treeOutline.element.classList.contains('hidden'));

       // Subsequent updates should not re-process the failed batch.
       (firstChildEl.updateTitle as sinon.SinonStub).restore();
       assert.doesNotThrow(() => treeOutline.runPendingUpdates());
     });
});
