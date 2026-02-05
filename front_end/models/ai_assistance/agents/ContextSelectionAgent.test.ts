// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {
  restoreUserAgentForTesting,
  setUserAgentForTesting,
  updateHostConfig,
} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import * as Bindings from '../../bindings/bindings.js';
import * as Logs from '../../logs/logs.js';
import * as Workspace from '../../workspace/workspace.js';
import {AiAgent, ContextSelectionAgent} from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('ContextSelectionAgent', function() {
  const snapshotTester = new SnapshotTester(this, import.meta);

  function mockHostConfig() {
    updateHostConfig({
      devToolsAiAssistanceContextSelectionAgent: {
        enabled: true,
      },
    });
  }

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

  describe('buildRequest', () => {
    it('structure matches the snapshot', async function() {
      mockHostConfig();
      sinon.stub(crypto, 'randomUUID').returns('sessionId' as `${string}-${string}-${string}-${string}-${string}`);
      const agent = new ContextSelectionAgent.ContextSelectionAgent({
        aidaClient: mockAidaClient([[{explanation: 'answer'}]]),
        serverSideLoggingEnabled: true,
      });
      await Array.fromAsync(agent.run('question', {selected: null}));

      setUserAgentForTesting();
      const request = agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER);
      snapshotTester.assert(this, JSON.stringify(request, null, 2));

      restoreUserAgentForTesting();
    });
  });

  describe('run', () => {
    it('generates an answer', async () => {
      const agent = new ContextSelectionAgent.ContextSelectionAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
        }]]),
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: null}));

      assert.deepEqual(responses, [
        {
          type: AiAgent.ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
          imageId: undefined,
        },
        {
          type: AiAgent.ResponseType.QUERYING,
        },
        {
          type: AiAgent.ResponseType.ANSWER,
          text: 'This is the answer',
          complete: true,
          suggestions: undefined,
          rpcId: 123,
        },
      ]);

      assert.deepEqual(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts, [
        {
          role: 1,
          parts: [{
            text: `test`,
          }],
        },
        {
          role: 2,
          parts: [{text: 'This is the answer'}],
        },
      ]);
    });
  });

  describe('listNetworkRequests', () => {
    it('lists network requests', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId,
          urlString`https://example.com/`,
          urlString`https://example.com/`,
          null,
          null,
          null,
      );
      request.statusCode = 200;
      request.setIssueTime(0, 0);
      request.endTime = 2;

      const networkLog = Logs.NetworkLog.NetworkLog.instance();
      sinon.stub(networkLog, 'requests').returns([request]);

      const agent = new ContextSelectionAgent.ContextSelectionAgent({
        aidaClient: mockAidaClient([
          [{
            functionCalls: [{
              name: 'listNetworkRequests',
              args: {},
            }],
            explanation: '',
          }],
          [{explanation: 'Done'}],
        ]),
      });

      await Array.fromAsync(agent.run('test', {selected: null}));

      const requestToAida = agent.buildRequest({text: ''}, Host.AidaClient.Role.USER);
      assert.deepEqual(requestToAida.historical_contexts, [
        {
          role: 1,
          parts: [{text: 'test'}],
        },
        {
          role: 2,
          parts: [{
            functionCall: {
              name: 'listNetworkRequests',
              args: {},
            },
          }],
        },
        {
          role: Host.AidaClient.Role.ROLE_UNSPECIFIED,
          parts: [{
            functionResponse: {
              name: 'listNetworkRequests',
              response: {
                result: [
                  {
                    url: 'https://example.com/',
                    statusCode: 200,
                    duration: 2,
                  },
                ],
              },
            },
          }],
        },
        {
          role: 2,
          parts: [{text: 'Done'}],
        },
      ]);
    });
  });
});
