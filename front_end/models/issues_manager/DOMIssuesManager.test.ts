// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockIssuesModel} from '../../testing/MockIssuesModel.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as IssuesManager from './issues_manager.js';

describe('DOMIssuesManager', () => {
  setupLocaleHooks();

  let universe: TestUniverse;
  let target: SDK.Target.Target;
  let domModel: SDK.DOMModel.DOMModel;
  let node: SDK.DOMModel.DOMNode;
  let domIssuesManager: IssuesManager.DOMIssuesManager.DOMIssuesManager;

  beforeEach(() => {
    universe = new TestUniverse();
    target = universe.createTarget();
    const maybeDomModel = target.model(SDK.DOMModel.DOMModel);
    assert.exists(maybeDomModel);
    domModel = maybeDomModel;
    domIssuesManager = universe.domIssuesManager;

    node = SDK.DOMModel.DOMNode.create(domModel, null, false, {
      nodeId: 2 as Protocol.DOM.NodeId,
      backendNodeId: 2 as Protocol.DOM.BackendNodeId,
      nodeType: SDK.DOMModel.NodeType.ELEMENT_NODE,
      nodeName: 'DIV',
      localName: 'div',
      nodeValue: '',
    });
  });

  function createGenericIssue(backendNodeId: Protocol.DOM.BackendNodeId,
                              mockModel: SDK.IssuesModel.IssuesModel): IssuesManager.GenericIssue.GenericIssue {
    const inspectorIssue = {
      code: Protocol.Audits.InspectorIssueCode.GenericIssue,
      details: {
        genericIssueDetails: {
          errorType: Protocol.Audits.GenericIssueErrorType.FormLabelForNameError,
          frameId: 'main' as Protocol.Page.FrameId,
          violatingNodeId: backendNodeId,
        },
      },
    };
    return IssuesManager.GenericIssue.GenericIssue.fromInspectorIssue(mockModel, inspectorIssue)[0];
  }

  it('adds issue to node and dispatches event when issue is added', async () => {
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(node);
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    const issue = createGenericIssue(2 as Protocol.DOM.BackendNodeId, mockModel);

    const addedEvents: Array<{node: SDK.DOMModel.DOMNode, issue: IssuesManager.Issue.Issue}> = [];
    domIssuesManager.addEventListener(IssuesManager.DOMIssuesManager.Events.DOM_ISSUE_ADDED,
                                      event => addedEvents.push(event.data));

    assert.isEmpty(domIssuesManager.issuesForNode(node));

    universe.issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                                    {issuesModel: mockModel, issue});
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.deepEqual(domIssuesManager.issuesForNode(node), [issue]);
    assert.deepEqual(addedEvents, [{node, issue}]);
  });

  it('removes issue from node when issue is hidden and adds it back when unhidden', async () => {
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(node);
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    const issue = createGenericIssue(2 as Protocol.DOM.BackendNodeId, mockModel);

    const removedEvents: Array<{node: SDK.DOMModel.DOMNode, issue: IssuesManager.Issue.Issue}> = [];
    domIssuesManager.addEventListener(IssuesManager.DOMIssuesManager.Events.DOM_ISSUE_REMOVED,
                                      event => removedEvents.push(event.data));

    universe.issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                                    {issuesModel: mockModel, issue});
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.deepEqual(domIssuesManager.issuesForNode(node), [issue]);

    issue.setHidden(true);
    universe.issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_HIDDEN_STATUS_UPDATED,
                                                    {issue});
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.isEmpty(domIssuesManager.issuesForNode(node));
    assert.deepEqual(removedEvents, [{node, issue}]);

    issue.setHidden(false);
    universe.issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_HIDDEN_STATUS_UPDATED,
                                                    {issue});
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.deepEqual(domIssuesManager.issuesForNode(node), [issue]);
  });

  it('adds issues on DocumentUpdated event', async () => {
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(node);
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    const issue = createGenericIssue(2 as Protocol.DOM.BackendNodeId, mockModel);

    sinon.stub(universe.issuesManager, 'issues').returns([issue]);

    assert.isEmpty(domIssuesManager.issuesForNode(node));

    domModel.dispatchEventToListeners(SDK.DOMModel.Events.DocumentUpdated, domModel);
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.deepEqual(domIssuesManager.issuesForNode(node), [issue]);
  });

  it('updates issues on FULL_UPDATE_REQUIRED event', async () => {
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(node);
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    const issue1 = createGenericIssue(2 as Protocol.DOM.BackendNodeId, mockModel);
    const issue2 = createGenericIssue(2 as Protocol.DOM.BackendNodeId, mockModel);

    // Initially add issue1.
    universe.issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                                    {issuesModel: mockModel, issue: issue1});
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(domIssuesManager.issuesForNode(node), [issue1]);

    // When full update occurs with only issue2, issue1 should be removed and issue2 added.
    sinon.stub(universe.issuesManager, 'issues').returns([issue2]);
    universe.issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.FULL_UPDATE_REQUIRED);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(domIssuesManager.issuesForNode(node), [issue2]);
  });

  it('notifies subscribers registered via subscribeByNodeId and stops on unsubscribeByNodeId', async () => {
    sinon.stub(SDK.DOMModel.DeferredDOMNode.prototype, 'resolvePromise').resolves(node);
    const mockModel = new MockIssuesModel([]) as unknown as SDK.IssuesModel.IssuesModel;
    const issue = createGenericIssue(2 as Protocol.DOM.BackendNodeId, mockModel);

    let callbackCount = 0;
    const callback = () => {
      callbackCount++;
    };

    domIssuesManager.subscribeByNodeId(node.id, callback);

    universe.issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_ADDED,
                                                    {issuesModel: mockModel, issue});
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.strictEqual(callbackCount, 1);

    domIssuesManager.unsubscribeByNodeId(node.id, callback);

    issue.setHidden(true);
    universe.issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUE_HIDDEN_STATUS_UPDATED,
                                                    {issue});
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.strictEqual(callbackCount, 1);
  });
});
