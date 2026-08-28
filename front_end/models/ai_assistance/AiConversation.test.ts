// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import type * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Protocol from '../../generated/protocol.js';
import {
  assertSkillLoaded,
  assertSkillNotLoaded,
  createNetworkRequest,
  mockAidaClient,
} from '../../testing/AiAssistanceHelpers.js';
import {
  deinitializeGlobalVars,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Bindings from '../bindings/bindings.js';
import * as Logs from '../logs/logs.js';
import * as NetworkTimeCalculator from '../network_time_calculator/network_time_calculator.js';
import * as Workspace from '../workspace/workspace.js';

import * as AiAssistance from './ai_assistance.js';

describe('AiConversation', () => {
  setupLocaleHooks();

  after(async () => {
    await deinitializeGlobalVars();
  });

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    const {targetManager, workspace, settings, networkLog, ignoreListManager, debuggerWorkspaceBinding} = universe;

    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(workspace);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(targetManager);
    sinon.stub(Common.Settings.Settings, 'instance').returns(settings);
    sinon.stub(Logs.NetworkLog.NetworkLog, 'instance').returns(networkLog);
    sinon.stub(Workspace.IgnoreListManager.IgnoreListManager, 'instance').returns(ignoreListManager);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(debuggerWorkspaceBinding);
  });

  it('should be able to switch agent type based on context', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const conversation =
        new AiAssistance.AiConversation.AiConversation({type: AiAssistance.AiHistoryStorage.ConversationType.STYLING});
    const networkRequest = new AiAssistance.RequestContext.RequestContext(
        createNetworkRequest(), new NetworkTimeCalculator.NetworkTransferTimeCalculator());

    conversation.setContext(networkRequest);

    assert(conversation.type === AiAssistance.AiHistoryStorage.ConversationType.NETWORK);
  });

  it('updates conversation type across context changes when devToolsAiV2Architecture is enabled', async () => {
    updateHostConfig({
      devToolsAiV2Architecture: {enabled: true},
    });

    const conversation =
        new AiAssistance.AiConversation.AiConversation({type: AiAssistance.AiHistoryStorage.ConversationType.NONE});

    const networkRequest = new AiAssistance.RequestContext.RequestContext(
        createNetworkRequest(), new NetworkTimeCalculator.NetworkTransferTimeCalculator());
    conversation.setContext(networkRequest);
    assert.strictEqual(conversation.type, AiAssistance.AiHistoryStorage.ConversationType.NETWORK);

    conversation.setContext(null);
    assert.strictEqual(conversation.type, AiAssistance.AiHistoryStorage.ConversationType.NONE);
  });

  it('resets context state when context is removed across conversation turns', async () => {
    updateHostConfig({
      devToolsAiV2Architecture: {enabled: true},
    });

    const origin = Platform.DevToolsPath.urlString`https://example.com`;
    const target = sinon.createStubInstance(SDK.Target.Target);
    target.inspectedURL.returns(Platform.DevToolsPath.urlString`${origin}/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(target);

    const listNetworkRequestsTool = AiAssistance.ToolRegistry.ToolRegistry.get('listNetworkRequests');
    assert.exists(listNetworkRequestsTool);
    const stub = sinon.stub(listNetworkRequestsTool, 'handler').resolves({result: {requests: []}});

    const aidaClient = mockAidaClient([
      // Turn 1: Model loads network skill and executes listNetworkRequests.
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['network']}}],
      }],
      [{
        explanation: 'Listing requests.',
        functionCalls: [{name: 'listNetworkRequests', args: {}}],
      }],
      [{
        explanation: 'Turn 1 done.',
      }],
      // Turn 2: Query with cleared context. Model calls listNetworkRequests again.
      [{
        explanation: 'Listing requests on turn 2.',
        functionCalls: [{name: 'listNetworkRequests', args: {}}],
      }],
      [{
        explanation: 'Turn 2 done.',
      }],
    ]);

    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      aidaClient,
    });

    const networkRequest = createNetworkRequest({
      url: Platform.DevToolsPath.urlString`https://example.com/test`,
      documentURL: Platform.DevToolsPath.urlString`https://example.com`,
    });
    sinon.stub(networkRequest, 'requestContentData')
        .resolves(new TextUtils.ContentData.ContentData('test content', false, 'text/plain'));
    const requestContext = new AiAssistance.RequestContext.RequestContext(
        networkRequest, new NetworkTimeCalculator.NetworkTransferTimeCalculator());

    // Turn 1: Query with active RequestContext.
    conversation.setContext(requestContext);
    await Array.fromAsync(conversation.run('turn 1'));
    assert.strictEqual(conversation.selectedContext, requestContext);
    assert.strictEqual(conversation.type, AiAssistance.AiHistoryStorage.ConversationType.NETWORK);
    sinon.assert.calledOnce(stub);

    // Turn 2: Query with cleared context.
    conversation.setContext(null);
    await Array.fromAsync(conversation.run('turn 2'));
    assert.isUndefined(conversation.selectedContext);
    assert.strictEqual(conversation.type, AiAssistance.AiHistoryStorage.ConversationType.NONE);
    sinon.assert.calledTwice(stub);
  });

  it('preserves activeSkills across context changes when devToolsAiV2Architecture is enabled', async () => {
    updateHostConfig({
      devToolsAiV2Architecture: {enabled: true},
    });

    const origin = Platform.DevToolsPath.urlString`https://example.com`;
    const target = sinon.createStubInstance(SDK.Target.Target);
    target.inspectedURL.returns(Platform.DevToolsPath.urlString`${origin}/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(target);

    const aidaClient = mockAidaClient([
      // Turn 1: Model loads 'network' skill.
      [{
        explanation: '',
        functionCalls: [{name: 'learnSkills', args: {skills: ['network']}}],
      }],
      [{
        explanation: 'Loaded network skill.',
      }],
      // Turn 2: Response after context change.
      [{
        explanation: 'Second turn response.',
      }],
    ]);

    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      aidaClient,
    });

    // Turn 1: Load 'network' skill.
    await Array.fromAsync(conversation.run('load network skill'));

    // Context changes between turns.
    const networkRequest = createNetworkRequest({
      url: Platform.DevToolsPath.urlString`https://example.com/test`,
      documentURL: Platform.DevToolsPath.urlString`https://example.com`,
    });
    sinon.stub(networkRequest, 'requestContentData')
        .resolves(new TextUtils.ContentData.ContentData('test content', false, 'text/plain'));
    const requestContext = new AiAssistance.RequestContext.RequestContext(
        networkRequest, new NetworkTimeCalculator.NetworkTransferTimeCalculator());
    conversation.setContext(requestContext);

    // Turn 2: Query again.
    await Array.fromAsync(conversation.run('analyze'));

    // 'network' should remain active on the agent across context changes, so it is omitted from
    // the unloaded skills manifest, while other unloaded skills like 'styling' remain listed.
    const lastRequest = aidaClient.doConversation.lastCall.firstArg;
    const promptText = 'text' in lastRequest.current_message.parts[0] ? lastRequest.current_message.parts[0].text : '';
    assertSkillLoaded(promptText, 'network');
    assertSkillNotLoaded(promptText, 'styling');
  });

  it('disables server-side logging when running with a context that disallows logging', async () => {
    updateHostConfig({
      devToolsAiV2Architecture: {enabled: true},
    });

    const origin = Platform.DevToolsPath.urlString`https://example.com`;
    const target = sinon.createStubInstance(SDK.Target.Target);
    target.inspectedURL.returns(Platform.DevToolsPath.urlString`${origin}/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(target);

    const aidaClient = mockAidaClient([
      [{explanation: 'Storage query response.'}],
    ]);

    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      aidaClient,
    });

    const cookieItem = new AiAssistance.StorageItem.CookieItem(origin, origin, 'session_id');
    const storageContext = new AiAssistance.StorageContext.StorageContext(cookieItem);
    conversation.setContext(storageContext);

    await Array.fromAsync(conversation.run('inspect cookie'));

    sinon.assert.calledOnce(aidaClient.doConversation);
    const request = aidaClient.doConversation.firstCall.firstArg;
    assert.isTrue(request.metadata?.disable_user_content_logging);
  });

  it('does not re-enable server-side logging across context transitions once disabled', async () => {
    updateHostConfig({
      devToolsAiV2Architecture: {enabled: true},
    });

    const origin = Platform.DevToolsPath.urlString`https://example.com`;
    const target = sinon.createStubInstance(SDK.Target.Target);
    target.inspectedURL.returns(Platform.DevToolsPath.urlString`${origin}/`);
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(target);

    const aidaClient = mockAidaClient([
      [{explanation: 'Turn 1 storage response.'}],
      [{explanation: 'Turn 2 network response.'}],
    ]);

    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.NONE,
      aidaClient,
    });

    // Turn 1: Run with sensitive StorageContext that disallows logging.
    const cookieItem = new AiAssistance.StorageItem.CookieItem(origin, origin, 'session_id');
    const storageContext = new AiAssistance.StorageContext.StorageContext(cookieItem);
    conversation.setContext(storageContext);
    await Array.fromAsync(conversation.run('turn 1'));

    const turn1Request = aidaClient.doConversation.firstCall.firstArg;
    assert.isTrue(turn1Request.metadata?.disable_user_content_logging);

    // Turn 2: Switch to RequestContext which allows logging.
    const networkRequest = createNetworkRequest({
      url: Platform.DevToolsPath.urlString`https://example.com/test`,
      documentURL: Platform.DevToolsPath.urlString`https://example.com`,
    });
    sinon.stub(networkRequest, 'requestContentData')
        .resolves(new TextUtils.ContentData.ContentData('test content', false, 'text/plain'));
    const requestContext = new AiAssistance.RequestContext.RequestContext(
        networkRequest, new NetworkTimeCalculator.NetworkTransferTimeCalculator());
    conversation.setContext(requestContext);
    await Array.fromAsync(conversation.run('turn 2'));

    sinon.assert.calledTwice(aidaClient.doConversation);
    const turn2Request = aidaClient.doConversation.secondCall.firstArg;
    assert.isTrue(turn2Request.metadata?.disable_user_content_logging);
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
    const workspace = universe.workspace;
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

    const nextId = AiAssistance.ContextSelectionAgent.ContextSelectionAgent.lastSourceId + 1;
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
              id: nextId,
            },
          }],
          explanation: '',
        }],
        [{explanation: 'Done'}],
      ]),
    });

    await Array.fromAsync(conversation.run('test'));

    assert.exists(conversation.selectedContext);
    assert.instanceOf(conversation.selectedContext, AiAssistance.FileContext.FileContext);
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
      documentURL: Platform.DevToolsPath.urlString`https://example.com`,
    });
    const contentData = new TextUtils.ContentData.ContentData('test content', false, 'text/plain');
    sinon.stub(networkRequest, 'requestContentData').resolves(contentData);
    sinon.stub(universe.networkLog, 'requests').returns([networkRequest]);

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
      url: Platform.DevToolsPath.urlString`https://example.com`,
      documentURL: Platform.DevToolsPath.urlString`https://example.com`,
    });
    sinon.stub(networkRequest, 'requestContentData')
        .resolves(new TextUtils.ContentData.ContentData('test content', false, 'text/plain'));

    sinon.stub(universe.networkLog, 'requests').returns([networkRequest]);

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

    conversation.setContext(new AiAssistance.RequestContext.RequestContext(
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
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(target);

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

    const networkLog = universe.networkLog;
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
        duration: '1\xA0s',
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
    sinon.stub(universe.targetManager, 'primaryPageTarget').returns(target);

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

    const networkLog = universe.networkLog;
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
      widgets: [{
        name: 'DOM_TREE',
        data: {
          root: {} as SDK.DOMModel.DOMNodeSnapshot,
          title: 'Title' as Platform.UIString.LocalizedString,
          accessibleRevealLabel: 'Label' as Platform.UIString.LocalizedString,
        },
      }],
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

  it('redacts action outputs of tools annotated with REDACT_FROM_HISTORY', () => {
    const conversation =
        new AiAssistance.AiConversation.AiConversation({type: AiAssistance.AiHistoryStorage.ConversationType.STYLING});

    const dummyTool = {
      name: 'dummyTool' as AiAssistance.Tool.ToolName,
      annotations: [AiAssistance.Tool.ToolAnnotation.REDACT_FROM_HISTORY],
    } as unknown as AiAssistance.Tool.Tool;
    sinon.stub(AiAssistance.ToolRegistry.ToolRegistry, 'get').withArgs('dummyTool').returns(dummyTool);

    const actionResponseWithRedaction: AiAssistance.AiAgent.ActionResponse = {
      type: AiAssistance.AiAgent.ResponseType.ACTION,
      code: 'code',
      output: 'secret storage value',
      canceled: false,
      toolName: 'dummyTool',
    };

    const actionResponseWithoutRedaction: AiAssistance.AiAgent.ActionResponse = {
      type: AiAssistance.AiAgent.ResponseType.ACTION,
      code: 'code',
      output: 'normal output',
      canceled: false,
      toolName: 'otherTool',
    };

    conversation.history.push(actionResponseWithRedaction, actionResponseWithoutRedaction);

    const serialized = conversation.serialize();

    assert.lengthOf(serialized.history, 2);

    assert.strictEqual(serialized.history[0].type, AiAssistance.AiAgent.ResponseType.ACTION);
    assert.strictEqual((serialized.history[0] as AiAssistance.AiAgent.ActionResponse).output, '<redacted>');

    assert.strictEqual(serialized.history[1].type, AiAssistance.AiAgent.ResponseType.ACTION);
    assert.strictEqual((serialized.history[1] as AiAssistance.AiAgent.ActionResponse).output, 'normal output');
  });

  async function testNavigationDuringRun({
    navigationUrl,
    expectBlocked,
  }: {
    navigationUrl: Platform.DevToolsPath.UrlString,
    expectBlocked: boolean,
  }) {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const origin = Platform.DevToolsPath.urlString`https://example.com`;

    const target = universe.createTarget({url: Platform.DevToolsPath.urlString`${origin}/`});
    target.setInspectedURL(Platform.DevToolsPath.urlString`${origin}/`);

    const request = SDK.NetworkRequest.NetworkRequest.create(
        'requestId1' as Protocol.Network.RequestId,
        Platform.DevToolsPath.urlString`${origin}/foo`,
        Platform.DevToolsPath.urlString`${origin}/foo`,
        null,
        null,
        null,
    );
    request.statusCode = 200;
    request.setIssueTime(0, 0);
    request.endTime = 1;

    const networkLog = universe.networkLog;
    sinon.stub(networkLog, 'requests').returns([request]);

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

    const generator = conversation.run('test');

    // First yield should be the UserQuery
    const firstYield = await generator.next();
    assert.strictEqual(firstYield.value?.type, AiAssistance.AiAgent.ResponseType.USER_QUERY);

    // Simulate navigation BEFORE the tool call is processed
    target.setInspectedURL(navigationUrl);
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);
    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
      frame: {
        resourceTreeModel: () => resourceTreeModel,
        unreachableUrl: () => '',
      } as unknown as SDK.ResourceTreeModel.ResourceTreeFrame,
      type: SDK.ResourceTreeModel.PrimaryPageChangeType.NAVIGATION,
    });

    // Continue running the generator to completion
    const results = [];
    for await (const result of generator) {
      results.push(result);
    }

    const errorResult = results.find(r => r.type === AiAssistance.AiAgent.ResponseType.ERROR);
    if (expectBlocked) {
      assert.exists(errorResult);
      assert.strictEqual(errorResult.error, AiAssistance.AiAgent.ErrorType.CROSS_ORIGIN);
      sinon.assert.callCount(aidaClient.doConversation, 1);
    } else {
      assert.isUndefined(errorResult);
      sinon.assert.callCount(aidaClient.doConversation, 2);
    }
  }

  it('blocks tool calls if navigation occurs during the run', async () => {
    const otherOrigin = Platform.DevToolsPath.urlString`https://other.com`;
    await testNavigationDuringRun({
      navigationUrl: Platform.DevToolsPath.urlString`${otherOrigin}/`,
      expectBlocked: true,
    });
  });

  it('does NOT block tool calls if navigation is to about://', async () => {
    await testNavigationDuringRun({
      navigationUrl: Platform.DevToolsPath.urlString`about://`,
      expectBlocked: false,
    });
  });

  it('does NOT block tool calls if navigation is to chrome://terms', async () => {
    await testNavigationDuringRun({
      navigationUrl: Platform.DevToolsPath.urlString`chrome://terms`,
      expectBlocked: false,
    });
  });

  it('should throw an error when starting a conversation with an opaque origin', async () => {
    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.STYLING,
    });

    class OpaqueContext extends AiAssistance.AiAgent.ConversationContext<unknown> {
      override getURL(): string {
        return 'null';
      }
      override getItem(): unknown {
        return null;
      }
      override getTitle(): string {
        return 'Opaque';
      }
    }

    conversation.setContext(new OpaqueContext());

    try {
      await Array.fromAsync(conversation.run('test'));
      assert.fail('Error was not thrown');
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.strictEqual(err.message, 'cross-origin context data should not be included');
    }
  });

  it('should clear history when transitioning from storage to different agent', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const aidaClient = mockAidaClient([
      [{explanation: 'Storage analysis'}],
      [{explanation: 'Network analysis'}],
    ]);

    const conversation = new AiAssistance.AiConversation.AiConversation({
      type: AiAssistance.AiHistoryStorage.ConversationType.STORAGE,
      data: [],
      id: 'test-id',
      isReadOnly: false,
      aidaClient,
    });

    await Array.fromAsync(conversation.run('test storage query'));
    assert.lengthOf(aidaClient.doConversation.getCalls(), 1);

    const networkRequest = createNetworkRequest({
      url: Platform.DevToolsPath.urlString`https://example.com`,
      documentURL: Platform.DevToolsPath.urlString`https://example.com`,
    });
    sinon.stub(networkRequest, 'requestContentData')
        .resolves(new TextUtils.ContentData.ContentData('test content', false, 'text/plain'));
    sinon.stub(universe.networkLog, 'requests').returns([networkRequest]);

    conversation.setContext(new AiAssistance.RequestContext.RequestContext(
        networkRequest, new NetworkTimeCalculator.NetworkTransferTimeCalculator()));

    await Array.fromAsync(conversation.run('test network query'));
    assert.lengthOf(aidaClient.doConversation.getCalls(), 2);
    const secondRequest = aidaClient.doConversation.getCall(1).firstArg;
    assert.isEmpty(secondRequest.historical_contexts ?? []);
  });
});
