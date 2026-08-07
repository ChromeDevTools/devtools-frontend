// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {doubleRaf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment, expectConsoleLogs} from '../../testing/EnvironmentHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithEnvironment('ElementsTreeOutline', () => {
  let target: SDK.Target.Target;
  let model: SDK.DOMModel.DOMModel;
  let treeOutline: Elements.ElementsTreeOutline.ElementsTreeOutline;

  beforeEach(() => {
    const universe = new TestUniverse();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    target = createTarget();

    treeOutline =
        new Elements.ElementsTreeOutline.ElementsTreeOutline(/* omitRootDOMNode */ true, /* selectEnabled */ true);
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

  it('should add an element-related issue to the relevant tree element', async () => {
    const divNodePayload = {
      nodeId: 2 as Protocol.DOM.NodeId,
      parentId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'DIV',
      childNodeCount: 0,
      localName: 'div',
      nodeValue: 'A div',
    };
    const rootNode = SDK.DOMModel.DOMNode.create(model, null, false, {
      nodeId: 1 as Protocol.DOM.NodeId,
      backendNodeId: 1 as Protocol.DOM.BackendNodeId,
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'BODY',
      localName: 'body',
      nodeValue: 'Body',
      childNodeCount: 1,
      children: [divNodePayload],
    });
    assert.isNotNull(rootNode);
    treeOutline.rootDOMNode = rootNode;
    const divNode = rootNode.children()![0];
    assert.isNotNull(divNode);
    const treeElement = treeOutline.findTreeElement(divNode);
    assert.isNotNull(treeElement);
    const deferredDOMNodeStub = sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(divNode);

    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;

    // Test that generic issue can be added to the tree element.
    {
      const inspectorIssue = {
        code: Protocol.Audits.InspectorIssueCode.GenericIssue,
        details: {
          genericIssueDetails: {
            errorType: Protocol.Audits.GenericIssueErrorType.FormLabelForNameError,
            frameId: 'main' as Protocol.Page.FrameId,
            violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
          },
        },
      };
      const issue = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
      issuesManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
      await deferredDOMNodeStub();
      const tagElement = treeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
      assert.isTrue(tagElement.classList.contains('violating-element'));
      // Reset tag to prepare for subsequent tests.
      tagElement.classList.remove('violating-element');
    }

    // Test that <select> issue can be added to the tree element.
    {
      const inspectorIssue = {
        code: Protocol.Audits.InspectorIssueCode.ElementAccessibilityIssue,
        details: {
          elementAccessibilityIssueDetails: {
            nodeId: 2 as Protocol.DOM.BackendNodeId,
            elementAccessibilityIssueReason: Protocol.Audits.ElementAccessibilityIssueReason.DisallowedSelectChild,
            hasDisallowedAttributes: false,
          },
        },
      };
      const issue = IssuesManager.ElementAccessibilityIssue.ElementAccessibilityIssue.fromInspectorIssue(
          mockModel, inspectorIssue)[0];
      issuesManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
      await deferredDOMNodeStub();
      const tagElement = treeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
      assert.isTrue(tagElement.classList.contains('violating-element'));
      // Reset tag to prepare for subsequent tests.
      tagElement.classList.remove('violating-element');
    }

    // Test that multiple issues being added to the tree element.
    {
      const inspectorIssue = {
        code: Protocol.Audits.InspectorIssueCode.GenericIssue,
        details: {
          genericIssueDetails: {
            errorType: Protocol.Audits.GenericIssueErrorType.FormEmptyIdAndNameAttributesForInputError,
            frameId: 'main' as Protocol.Page.FrameId,
            violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
          },
        },
      };
      const issue = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
      issuesManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
      await deferredDOMNodeStub();
      const tagElement = treeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
      assert.isTrue(tagElement.classList.contains('violating-element'));
      const issues = treeElement.issuesByNodeElement.get(tagElement);
      assert.strictEqual(issues?.length, 3);
      // Reset tag to prepare for subsequent tests.
      tagElement.classList.remove('violating-element');
    }

    // Test that non-supported issue won't be added to the tree element.
    {
      const inspectorIssue = {
        code: Protocol.Audits.InspectorIssueCode.ContentSecurityPolicyIssue,
        details: {},
      };
      const issue = IssuesManager.ContentSecurityPolicyIssue.ContentSecurityPolicyIssue.fromInspectorIssue(
          mockModel, inspectorIssue)[0];
      issuesManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
      await deferredDOMNodeStub();
      const tagElement = treeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
      assert.isFalse(tagElement.classList.contains('violating-element'));
    }

    // Test that issue can be hidden from the tree element.
    {
      const inspectorIssue = {
        code: Protocol.Audits.InspectorIssueCode.GenericIssue,
        details: {
          genericIssueDetails: {
            errorType: Protocol.Audits.GenericIssueErrorType.FormLabelForNameError,
            frameId: 'main' as Protocol.Page.FrameId,
            violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
          },
        },
      };
      // Remove the issues added in previous tests.
      const tagElement = treeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
      const issues = treeElement.issuesByNodeElement.get(tagElement);
      for (const issue of issues ?? []) {
        treeElement.removeIssue(issue);
      }
      // Add the issue.
      const issue = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
      issuesManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
      await deferredDOMNodeStub();
      assert.isTrue(tagElement.classList.contains('violating-element'));
      // Hide the issue.
      issue.setHidden(true);
      issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_HIDDEN_STATUS_UPDATED, {issue});
      await deferredDOMNodeStub();
      assert.isFalse(tagElement.classList.contains('violating-element'));
    }

    // Test that hidden issue can be unhidden from the tree element.
    {
      const inspectorIssue = {
        code: Protocol.Audits.InspectorIssueCode.GenericIssue,
        details: {
          genericIssueDetails: {
            errorType: Protocol.Audits.GenericIssueErrorType.FormLabelForNameError,
            frameId: 'main' as Protocol.Page.FrameId,
            violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
          },
        },
      };
      // Add the issue.
      const issue = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
      issuesManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
      await deferredDOMNodeStub();
      const tagElement = treeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
      assert.isTrue(tagElement.classList.contains('violating-element'));
      // Hide the issue.
      issue.setHidden(true);
      issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_HIDDEN_STATUS_UPDATED, {issue});
      await deferredDOMNodeStub();
      assert.isFalse(tagElement.classList.contains('violating-element'));
      // Unhide the issue.
      issue.setHidden(false);
      issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_HIDDEN_STATUS_UPDATED, {issue});
      await deferredDOMNodeStub();
      assert.isTrue(tagElement.classList.contains('violating-element'));
      // Remove issue to prepare for subsequent tests.
      treeElement.removeIssue(issue);
    }

    // Test that new pre-hidden issue won't be added to the tree element.
    {
      const inspectorIssue = {
        code: Protocol.Audits.InspectorIssueCode.GenericIssue,
        details: {
          genericIssueDetails: {
            errorType: Protocol.Audits.GenericIssueErrorType.FormLabelForNameError,
            frameId: 'main' as Protocol.Page.FrameId,
            violatingNodeId: 2 as Protocol.DOM.BackendNodeId,
          },
        },
      };
      const issue = IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
      issue.setHidden(true);
      issuesManager.dispatchEventToListeners(
          IssuesManager.IssuesManager.Events.ISSUE_ADDED, {issuesModel: mockModel, issue});
      await deferredDOMNodeStub();
      const tagElement = treeElement.widget.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
      assert.isFalse(tagElement.classList.contains('violating-element'));
    }
  });

  it('showContextMenu should allow default context menu on text selection', async () => {
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
        nodeType: Node.TEXT_NODE,
        nodeName: '#text',
        localName: '#text',
        nodeValue: 'Some text',
      }],
    });
    assert.isNotNull(rootNode);
    treeOutline.rootDOMNode = rootNode;

    const pNode = rootNode.children()![0];
    treeOutline.selectDOMNode(pNode);
    const treeElement = treeOutline.findTreeElement(pNode);
    assert.isNotNull(treeElement);

    const textNodeContainer = treeElement.widget.contentElement.querySelector('.webkit-html-text-node');
    assert.isNotNull(textNodeContainer);

    assert.isFalse(UI.UIUtils.isEditing());
    textNodeContainer.dispatchEvent(new MouseEvent('dblclick', {bubbles: true, composed: true}));

    assert.isTrue(UI.UIUtils.isEditing());
    const event = new MouseEvent('contextmenu', {bubbles: true, composed: true});
    const preventDefaultSpy = sinon.spy(event, 'preventDefault');
    await treeOutline.showContextMenu(treeElement, event);
    sinon.assert.notCalled(preventDefaultSpy);
    UI.UIUtils.markBeingEdited(textNodeContainer, false);
  });

  it('should prevent default context menu on node selection and no edit', async () => {
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
        nodeType: Node.TEXT_NODE,
        nodeName: '#text',
        localName: '#text',
        nodeValue: 'Some text',
      }],
    });
    assert.isNotNull(rootNode);
    treeOutline.rootDOMNode = rootNode;

    const pNode = rootNode.children()![0];
    treeOutline.selectDOMNode(pNode);
    const treeElement = treeOutline.findTreeElement(pNode);
    assert.isNotNull(treeElement);

    assert.isFalse(UI.UIUtils.isEditing());

    const textNodeContainer = treeElement.widget.contentElement.querySelector('.webkit-html-text-node');
    assert.isNotNull(textNodeContainer);

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      composed: true,
    });
    // We need to stub the tree element here, since this method
    // determines the treeElement based on pageX and pageY coordinates which we can't directly
    // set on the event.
    sinon.stub(treeOutline, 'treeElementFromEventInternal').returns(treeElement);
    const preventDefaultSpy = sinon.spy(event, 'preventDefault');
    textNodeContainer.dispatchEvent(event);

    sinon.assert.called(preventDefaultSpy);
  });
  describe('Snapshot mode', () => {
    it('does not attach event listeners in snapshot mode', () => {
      const addEventListenerSpy = sinon.spy(HTMLElement.prototype, 'addEventListener');
      const snapshotTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(
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
      const snapshotTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(
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
      const snapshotTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(
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
      const snapshotTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(
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
      const snapshotTreeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(
          /* omitRootDOMNode */ false, /* selectEnabled */ true, /* hideGutter */ true, /* maxTreeDepth */ 2,
          /* enableContextMenu */ false, /* showComments */ false, /* showAIButton */ false, /* disableEdits */ true,
          /* expandRoot */ true);
      snapshotTreeOutline.addEventListener(Elements.ElementsTreeOutline.ElementsTreeOutline.Events.ShowAllRows, () => {
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
});
