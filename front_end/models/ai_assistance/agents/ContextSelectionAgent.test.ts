// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
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
import type * as Trace from '../../trace/trace.js';
import * as Workspace from '../../workspace/workspace.js';
import {
  AiAgent,
  ContextSelectionAgent,
  FileAgent,
  NetworkAgent,
  PerformanceAgent,
  StylingAgent,
} from '../ai_assistance.js';

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

    it('can call the performanceRecordAndReload tool', async () => {
      const trace = {
        metadata: {},
        samples: {},
        insights: new Map(),
      } as unknown as Trace.TraceModel.ParsedTrace;
      const performanceRecordAndReload = sinon.stub().resolves(trace);
      const agent = new ContextSelectionAgent.ContextSelectionAgent({
        aidaClient: mockAidaClient([
          [{
            functionCalls: [{
              name: 'performanceRecordAndReload',
              args: {},
            }],
            explanation: '',
          }],
          [{
            explanation: 'Performance recording completed',
          }]
        ]),
        performanceRecordAndReload,
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: null}));

      sinon.assert.calledOnce(performanceRecordAndReload);
      const contextChange = responses.find(r => r.type === AiAgent.ResponseType.CONTEXT_CHANGE);
      assert.exists(contextChange);
      assert.instanceOf(contextChange.context, PerformanceAgent.PerformanceTraceContext);
      assert.strictEqual(contextChange.context.getItem().parsedTrace, trace);
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
      request.setTransferSize(3000);
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
                    id: 'requestId',
                    url: 'https://example.com/',
                    statusCode: 200,
                    duration: '2.00\xA0s',
                    transferSize: '3.0\xA0kB',
                  },
                ],
                widgets: undefined,
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

  describe('inspect_dom', () => {
    it('inspects DOM node', async () => {
      const node = sinon.createStubInstance(SDK.DOMModel.DOMNode);
      const onInspectElement = sinon.stub().resolves(node);
      const sideEffectConfirmationPromise = Promise.withResolvers();
      sideEffectConfirmationPromise.resolve(true);
      const agent = new ContextSelectionAgent.ContextSelectionAgent({
        aidaClient: mockAidaClient([
          [{
            functionCalls: [{
              name: 'inspectDom',
              args: {},
            }],
            explanation: '',
          }],
          [{explanation: 'Done'}],
        ]),
        onInspectElement,
        confirmSideEffectForTest: sinon.stub().returns(sideEffectConfirmationPromise)
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: null}));
      const contextChange = responses.find(r => r.type === AiAgent.ResponseType.CONTEXT_CHANGE);

      sinon.assert.calledOnce(onInspectElement);
      assert.exists(contextChange);
      assert.instanceOf(contextChange.context, StylingAgent.NodeContext);
      assert.strictEqual(contextChange.context.getItem(), node);
    });
  });

  describe('selectNetworkRequest', () => {
    it('selects a network request', async () => {
      const request = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId,
          urlString`https://example.com/`,
          urlString`https://example.com/`,
          null,
          null,
          null,
      );
      request.statusCode = 200;

      const networkLog = Logs.NetworkLog.NetworkLog.instance();
      sinon.stub(networkLog, 'requests').returns([request]);

      const agent = new ContextSelectionAgent.ContextSelectionAgent({
        aidaClient: mockAidaClient([
          [{
            functionCalls: [{
              name: 'selectNetworkRequest',
              args: {
                id: 'requestId',
              },
            }],
            explanation: '',
          }],
          [{explanation: 'Done'}],
        ]),
      });

      const responses = await Array.fromAsync(agent.run('test', {selected: null}));
      const contextChange = responses.find(r => r.type === AiAgent.ResponseType.CONTEXT_CHANGE);

      assert.exists(contextChange);
      assert.instanceOf(contextChange.context, NetworkAgent.RequestContext);
      assert.strictEqual(contextChange.context.getItem(), request);
    });
  });

  describe('selectSourceFile', () => {
    it('selects a source file', async () => {
      const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
      const project = {
        id: () => 'test-project',
        type: () => Workspace.Workspace.projectTypes.Network,
        uiSourceCodes: () => [file],
        fullDisplayName: () => 'script.js',
      } as unknown as Workspace.Workspace.Project;
      const file = new Workspace.UISourceCode.UISourceCode(
          project, urlString`https://example.com/script.js`, Common.ResourceType.resourceTypes.Script);
      sinon.stub(workspace, 'projects').returns([project]);
      // Populate the ID mapping.
      ContextSelectionAgent.ContextSelectionAgent.uiSourceCodeId.set(file, 1);
      const agent = new ContextSelectionAgent.ContextSelectionAgent({
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

      const responses = await Array.fromAsync(agent.run('test', {selected: null}));
      const contextChange = responses.find(r => r.type === AiAgent.ResponseType.CONTEXT_CHANGE);
      assert.exists(contextChange);
      assert.instanceOf(contextChange.context, FileAgent.FileContext);
      assert.strictEqual(contextChange.context.getItem(), file);
    });
  });
});
