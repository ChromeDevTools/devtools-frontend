// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
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
        new AiAssistance.AiConversation.AiConversation(AiAssistance.AiHistoryStorage.ConversationType.STYLING);
    const networkRequest = new AiAssistance.NetworkAgent.RequestContext(
        createNetworkRequest(), new NetworkTimeCalculator.NetworkTransferTimeCalculator());

    conversation.setContext(networkRequest);

    assert(conversation.type === AiAssistance.AiHistoryStorage.ConversationType.NETWORK);
  });

  it('should be able to switch agent type when context is removed', async () => {
    updateHostConfig({devToolsAiAssistanceContextSelectionAgent: {enabled: true}});

    const conversation =
        new AiAssistance.AiConversation.AiConversation(AiAssistance.AiHistoryStorage.ConversationType.STYLING);

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

    const conversation = new AiAssistance.AiConversation.AiConversation(
        AiAssistance.AiHistoryStorage.ConversationType.NONE, [], 'test-id', false, mockAidaClient([
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
        ]));

    await Array.fromAsync(conversation.run('test'));

    assert.exists(conversation.selectedContext);
    assert.instanceOf(conversation.selectedContext, AiAssistance.FileAgent.FileContext);
  });

  it('should yield UserQuery when run is called', async () => {
    const conversation = new AiAssistance.AiConversation.AiConversation(
        AiAssistance.AiHistoryStorage.ConversationType.NONE, [], 'test-id', false, mockAidaClient([
          [{explanation: 'Answer'}],
        ]));

    const result = await Array.fromAsync(conversation.run('test query'));

    assert.deepEqual(result[0], {
      type: AiAssistance.AiAgent.ResponseType.USER_QUERY,
      query: 'test query',
      imageId: undefined,
      imageInput: undefined,
    });
  });

  it('should add UserQuery to history when run is called', async () => {
    const conversation = new AiAssistance.AiConversation.AiConversation(
        AiAssistance.AiHistoryStorage.ConversationType.NONE, [], 'test-id', false, mockAidaClient([
          [{explanation: 'Answer'}],
        ]));

    await Array.fromAsync(conversation.run('test query'));

    assert.deepEqual(conversation.history[0], {
      type: AiAssistance.AiAgent.ResponseType.USER_QUERY,
      query: 'test query',
      imageId: undefined,
      imageInput: undefined,
    });
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

    const conversation = new AiAssistance.AiConversation.AiConversation(
        AiAssistance.AiHistoryStorage.ConversationType.NONE,
        [],
        'test-id',
        false,
        aidaClient,
    );
    const networkRequest = createNetworkRequest({url: Platform.DevToolsPath.urlString`https://example.com`});
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
});
