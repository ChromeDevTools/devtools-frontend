// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import {createNetworkRequest, mockAidaClient} from '../../testing/AiAssistanceHelpers.js';
import {
  describeWithEnvironment,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import * as Bindings from '../bindings/bindings.js';
import * as Logs from '../logs/logs.js';
import * as NetworkTimeCalculator from '../network_time_calculator/network_time_calculator.js';
import * as Workspace from '../workspace/workspace.js';

import * as AiAssistance from './ai_assistance.js';

describeWithEnvironment('AiConversation', () => {
  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace,
    });
  });

  it('should be able to switch agent type based on context', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const conversation =
        new AiAssistance.AiConversation.AiConversation({type: AiAssistance.AiHistoryStorage.ConversationType.STYLING});
    const networkRequest = new AiAssistance.NetworkAgent.RequestContext(
        createNetworkRequest(), new NetworkTimeCalculator.NetworkTransferTimeCalculator());

    conversation.setContext(networkRequest);

    assert(conversation.type === AiAssistance.AiHistoryStorage.ConversationType.NETWORK);
  });

  it('should be able to switch agent type when context is removed', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const conversation =
        new AiAssistance.AiConversation.AiConversation({type: AiAssistance.AiHistoryStorage.ConversationType.STYLING});

    conversation.setContext(null);

    assert(conversation.type === AiAssistance.AiHistoryStorage.ConversationType.NONE);
  });

  it('should update context when agent returns CONTEXT_CHANGE', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const project = {
      id: () => 'test-project',
      type: () => Workspace.Workspace.projectTypes.Network,
      uiSourceCodes: () => [file],
      fullDisplayName: () => 'script.js',
    } as unknown as Workspace.Workspace.Project;
    const file = new Workspace.UISourceCode.UISourceCode(
        project, Platform.DevToolsPath.urlString`https://example.com/script.js`,
        Common.ResourceType.resourceTypes.Script);
    sinon.stub(workspace, 'projects').returns([project]);

    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient: mockAidaClient([
        [{
          functionCalls: [{
            name: 'selectSourceFile',
            args: {
              id: 1,
            },
          }],
          explanation: '',
        }],
        [{explanation: 'Done'}],
      ]),
    });

    await Array.fromAsync(conversation.run('test'));

    assert.exists(conversation.selectedContext);
    assert.instanceOf(conversation.selectedContext, AiAssistance.FileAgent.FileContext);
  });

  it('should yield UserQuery when run is called', async () => {
    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient: mockAidaClient([
        [{explanation: 'Answer'}],
      ]),
    });

    const result = await Array.fromAsync(conversation.run('test query'));

    assert.deepEqual(result[0], {
      type: AiAssistance.AiAgent.ResponseType.USER_QUERY,
      query: 'test query',
      imageId: undefined,
      imageInput: undefined,
    });
  });

  it('should add UserQuery to history when run is called', async () => {
    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient: mockAidaClient([
        [{explanation: 'Answer'}],
      ]),
    });

    await Array.fromAsync(conversation.run('test query'));

    assert.deepEqual(conversation.history[0], {
      type: AiAssistance.AiAgent.ResponseType.USER_QUERY,
      query: 'test query',
      imageId: undefined,
      imageInput: undefined,
    });
  });

  it('should update conversation origin when agent returns CONTEXT_CHANGE', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const aidaClient = mockAidaClient([
      [
        {
          explanation: '',
          functionCalls: [{
            name: 'selectNetworkRequest',
            args: {id: 'requestId-0'},
          }],
        },
      ],
      [
        {
          explanation: 'Done',
        },
      ],
    ]);

    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient,
    });

    const networkRequest = createNetworkRequest({
      url: Platform.DevToolsPath.urlString`https://example.com/test`,
      documentURL: Platform.DevToolsPath.urlString`https://example.com`
    });
    const contentData = new TextUtils.ContentData.ContentData('test content', false, 'text/plain');
    sinon.stub(networkRequest, 'requestContentData').resolves(contentData);
    sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'requests').returns([networkRequest]);

    assert.isUndefined(conversation.origin);

    await Array.fromAsync(conversation.run('test query'));

    assert.strictEqual(conversation.origin, 'https://example.com');
  });

  it('should forward history to the new agent when switching agents', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    function hasFunctionCalls(request: Host.AidaClient.DoConversationRequest): boolean {
      return request.historical_contexts?.some(history => {
        return history.parts.some(part => 'functionCall' in part || 'functionResponse' in part);
      }) ??
          false;
    }

    const aidaClient = mockAidaClient([
      [
        {
          explanation: '',
          functionCalls: [{
            name: 'selectNetworkRequest',
            args: {id: 'requestId-0'},
          }],
        },
      ],
      [
        {
          explanation: 'Works 1',
        },
      ],
      [
        {
          explanation: 'Works 2',
        },
      ],
      [
        {
          explanation: 'Works 3',
        },
      ]
    ]);

    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient,
    });
    const networkRequest = createNetworkRequest({
      url: Platform.DevToolsPath.urlString`https://example.com`,
      documentURL: Platform.DevToolsPath.urlString`https://example.com`
    });
    sinon.stub(networkRequest, 'requestContentData')
        .resolves(new TextUtils.ContentData.ContentData('test content', false, 'text/plain'));

    sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'requests').returns([networkRequest]);

    await Array.fromAsync(conversation.run('test query 1'));
    // Called two time as we pass the convestation to the new agent.
    assert.lengthOf(aidaClient.doConversation.getCalls(), 2);
    const firstRequest = aidaClient.doConversation.getCall(1).firstArg;
    assert.isFalse(hasFunctionCalls(firstRequest));
    assert.lengthOf(firstRequest.historical_contexts ?? [], 1);

    await Array.fromAsync(conversation.run('test query 1'));
    assert.lengthOf(aidaClient.doConversation.getCalls(), 3);
    const secondRequest = aidaClient.doConversation.getCall(1).firstArg;
    assert.isFalse(hasFunctionCalls(secondRequest));
    assert.lengthOf(secondRequest.historical_contexts ?? [], 1);

    conversation.setContext(new AiAssistance.NetworkAgent.RequestContext(
        networkRequest, new NetworkTimeCalculator.NetworkTransferTimeCalculator()));

    await Array.fromAsync(conversation.run('test query 2'));
    assert.lengthOf(aidaClient.doConversation.getCalls(), 4);
    const thirdRequest = aidaClient.doConversation.getCall(2).firstArg;
    assert.isFalse(hasFunctionCalls(thirdRequest));
    assert.lengthOf(thirdRequest.historical_contexts ?? [], 3);
  });

  it('filters network requests by security origin', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const origin = Platform.DevToolsPath.urlString`https://example.com`;
    const otherOrigin = Platform.DevToolsPath.urlString`https://other.com`;

    const target = sinon.createStubInstance(SDK.Target.Target);
    target.inspectedURL.returns(Platform.DevToolsPath.urlString`${origin}/`);
    sinon.stub(SDK.TargetManager.TargetManager.instance(), 'primaryPageTarget').returns(target);

    const sameOriginRequest = SDK.NetworkRequest.NetworkRequest.create(
        'requestId1' as Protocol.Network.RequestId,
        Platform.DevToolsPath.urlString`${origin}/foo`,
        Platform.DevToolsPath.urlString`${origin}/foo`,
        null,
        null,
        null,
    );
    sameOriginRequest.statusCode = 200;
    sameOriginRequest.setIssueTime(0, 0);
    sameOriginRequest.endTime = 1;

    const crossOriginRequest = SDK.NetworkRequest.NetworkRequest.create(
        'requestId2' as Protocol.Network.RequestId,
        Platform.DevToolsPath.urlString`${otherOrigin}/bar`,
        Platform.DevToolsPath.urlString`${otherOrigin}/bar`,
        null,
        null,
        null,
    );
    crossOriginRequest.statusCode = 200;
    crossOriginRequest.setIssueTime(0, 0);
    crossOriginRequest.endTime = 1;

    const networkLog = Logs.NetworkLog.NetworkLog.instance();
    sinon.stub(networkLog, 'requests').returns([sameOriginRequest, crossOriginRequest]);

    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{
          name: 'listNetworkRequests',
          args: {},
        }],
        explanation: '',
      }],
      [{explanation: 'Done'}],
    ]);
    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient,
    });

    await Array.fromAsync(conversation.run('test'));

    const requestToAida = aidaClient.doConversation.getCall(1).firstArg;
    const part = requestToAida.current_message.parts[0];

    assert(part && 'functionResponse' in part, 'Expected functionResponse part');
    assert.strictEqual(part.functionResponse.name, 'listNetworkRequests');
    assert.deepEqual(part.functionResponse.response.result, [
      {
        id: 'requestId1',
        url: `${origin}/foo`,
        statusCode: 200,
        duration: '1.00\xA0s',
        transferSize: '0.0\xA0kB',
      },
    ]);
  });

  it('locks the origin when listNetworkRequests is called', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const origin = Platform.DevToolsPath.urlString`https://example.com`;
    const otherOrigin = Platform.DevToolsPath.urlString`https://other.com`;

    const target = sinon.createStubInstance(SDK.Target.Target);
    target.inspectedURL.returns(Platform.DevToolsPath.urlString`${origin}/`);
    sinon.stub(SDK.TargetManager.TargetManager.instance(), 'primaryPageTarget').returns(target);

    const request1 = SDK.NetworkRequest.NetworkRequest.create(
        'requestId1' as Protocol.Network.RequestId,
        Platform.DevToolsPath.urlString`${origin}/foo`,
        Platform.DevToolsPath.urlString`${origin}/foo`,
        null,
        null,
        null,
    );
    request1.statusCode = 200;
    request1.setIssueTime(0, 0);
    request1.endTime = 1;

    const networkLog = Logs.NetworkLog.NetworkLog.instance();
    const requestsStub = sinon.stub(networkLog, 'requests').returns([request1]);

    const aidaClient = mockAidaClient([
      [{
        functionCalls: [{
          name: 'listNetworkRequests',
          args: {},
        }],
        explanation: '',
      }],
      [{explanation: 'Done'}],
      [{
        functionCalls: [{
          name: 'listNetworkRequests',
          args: {},
        }],
        explanation: '',
      }],
      [{explanation: 'Done2'}],
    ]);
    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient,
    });

    await Array.fromAsync(conversation.run('test'));

    target.inspectedURL.returns(Platform.DevToolsPath.urlString`${otherOrigin}/`);

    const request2 = SDK.NetworkRequest.NetworkRequest.create(
        'requestId2' as Protocol.Network.RequestId,
        Platform.DevToolsPath.urlString`${otherOrigin}/bar`,
        Platform.DevToolsPath.urlString`${otherOrigin}/bar`,
        null,
        null,
        null,
    );
    request2.statusCode = 200;
    request2.setIssueTime(0, 0);
    request2.endTime = 1;
    requestsStub.returns([request2]);

    await Array.fromAsync(conversation.run('test2'));

    const requestToAida = aidaClient.doConversation.getCall(3).firstArg;
    const part = requestToAida.current_message.parts[0];

    assert(part && 'functionResponse' in part, 'Expected functionResponse part');
    assert.strictEqual(part.functionResponse.name, 'listNetworkRequests');
    assert.deepEqual(part.functionResponse.response, {
      error: 'No requests showing with origin https://example.com. Tell the user to start a new chat',
      widgets: undefined,
    });
  });

  it('should correctly serialize history by removing non-serializable data', async () => {
    const conversation =
        new AiAssistance.AiConversation.AiConversation({type: AiAssistance.AiHistoryStorage.ConversationType.STYLING});

    const userQuery: AiAssistance.AiAgent.UserQuery = {
      type: AiAssistance.AiAgent.ResponseType.USER_QUERY,
      query: 'test query',
      imageId: 'test-image-id',
      imageInput: {inlineData: {data: 'base64', mimeType: 'image/png'}},
    };

    const contextResponse: AiAssistance.AiAgent.ContextResponse = {
      type: AiAssistance.AiAgent.ResponseType.CONTEXT,
      details: [{title: 'Detail', text: 'Text'}],
      widgets: [{name: 'DOM_TREE', data: {root: {} as SDK.DOMModel.DOMNodeSnapshot}}],
    };

    const actionResponse: AiAssistance.AiAgent.ActionResponse = {
      type: AiAssistance.AiAgent.ResponseType.ACTION,
      code: 'code',
      output: 'output',
      canceled: false,
      widgets: [{
        name: 'COMPUTED_STYLES',
        data: {
          computedStyles: new Map(),
          backendNodeId: 0 as Protocol.DOM.BackendNodeId,
          matchedCascade: {} as SDK.CSSMatchedStyles.CSSMatchedStyles,
          properties: [],
        },
      }],
    };

    const sideEffectResponse: AiAssistance.AiAgent.SideEffectResponse = {
      type: AiAssistance.AiAgent.ResponseType.SIDE_EFFECT,
      description: 'Side effect',
      code: 'code',
      confirm: () => {},
    };

    conversation.history.push(userQuery, contextResponse, actionResponse, sideEffectResponse);

    const serialized = conversation.serialize();

    assert.lengthOf(serialized.history, 4);

    // UserQuery should have imageInput removed
    assert.strictEqual(serialized.history[0].type, AiAssistance.AiAgent.ResponseType.USER_QUERY);
    assert.isUndefined((serialized.history[0] as AiAssistance.AiAgent.UserQuery).imageInput);
    assert.strictEqual((serialized.history[0] as AiAssistance.AiAgent.UserQuery).imageId, 'test-image-id');

    // ContextResponse should have widgets removed
    assert.strictEqual(serialized.history[1].type, AiAssistance.AiAgent.ResponseType.CONTEXT);
    assert.isUndefined((serialized.history[1] as AiAssistance.AiAgent.ContextResponse).widgets);

    // ActionResponse should have widgets removed
    assert.strictEqual(serialized.history[2].type, AiAssistance.AiAgent.ResponseType.ACTION);
    assert.isUndefined((serialized.history[2] as AiAssistance.AiAgent.ActionResponse).widgets);
  });
});
