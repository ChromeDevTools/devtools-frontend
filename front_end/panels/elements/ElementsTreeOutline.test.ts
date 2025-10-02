// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {createTarget, expectConsoleLogs} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Elements from './elements.js';

describeWithMockConnection('ElementsTreeOutline', () => {
  let target: SDK.Target.Target;
  let model: SDK.DOMModel.DOMModel;
  let treeOutline: Elements.ElementsTreeOutline.ElementsTreeOutline;

  beforeEach(() => {
    target = createTarget();

    treeOutline = new Elements.ElementsTreeOutline.ElementsTreeOutline(/* omitRootDOMNode */ true);
    treeOutline.wireToDOMModel(target.model(SDK.DOMModel.DOMModel) as SDK.DOMModel.DOMModel);

    const modelBeforeAssertion = target.model(SDK.DOMModel.DOMModel);
    assert.exists(modelBeforeAssertion);
    model = modelBeforeAssertion;
  });

  afterEach(() => {
    target.dispose('NO_REASON');
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
      const tagElement = treeElement.listItemElement.getElementsByClassName('webkit-html-tag-name')[0];
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
      const tagElement = treeElement.listItemElement.getElementsByClassName('webkit-html-tag-name')[0];
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
      const tagElement = treeElement.listItemElement.getElementsByClassName('webkit-html-tag-name')[0];
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
      const tagElement = treeElement.listItemElement.getElementsByClassName('webkit-html-tag-name')[0];
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

    const textNodeContainer = treeElement.listItemElement.querySelector('.webkit-html-text-node');
    assert.isNotNull(textNodeContainer);

    assert.isFalse(UI.UIUtils.isEditing());
    textNodeContainer.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));

    assert.isTrue(UI.UIUtils.isEditing());
    const event = new MouseEvent('contextmenu', {bubbles: true});
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

    const textNodeContainer = treeElement.listItemElement.querySelector('.webkit-html-text-node');
    assert.isNotNull(textNodeContainer);

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
    });
    // We need to stub the tree element here, since this method
    // determines the treeElement based on pageX and pageY coordinates which we can't directly
    // set on the event.
    sinon.stub(treeOutline, 'treeElementFromEventInternal').returns(treeElement);
    const preventDefaultSpy = sinon.spy(event, 'preventDefault');
    textNodeContainer.dispatchEvent(event);

    sinon.assert.called(preventDefaultSpy);
  });
});
