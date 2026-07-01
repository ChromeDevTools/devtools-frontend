// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {SnapshotTester} from '../../../testing/SnapshotTester.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as Logs from '../../logs/logs.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import * as TextUtils from '../../text_utils/text_utils.js';
import {AiAgent, NetworkAgent, RequestContext} from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('NetworkAgent', function() {
  setupSettingsHooks();
  const snapshotTester = new SnapshotTester(this, import.meta);
  function mockHostConfig(modelId?: string, temperature?: number) {
    updateHostConfig({
      devToolsAiAssistanceNetworkAgent: {
        modelId,
        temperature,
      },
    });
  }

  afterEach(async () => {
    await RenderCoordinator.done();
  });

  describe('buildRequest', () => {
    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      const agent = new NetworkAgent.NetworkAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.model_id,
          'test model',
      );
    });

    it('builds a request with a temperature', async () => {
      mockHostConfig('test model', 1);
      const agent = new NetworkAgent.NetworkAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.temperature,
          1,
      );
    });
  });

  describe('run', () => {
    const exampleResponse = JSON.stringify({request: 'body'});

    let selectedNetworkRequest: SDK.NetworkRequest.NetworkRequest;
    let calculator: NetworkTimeCalculator.NetworkTransferTimeCalculator;
    const timingInfo: Protocol.Network.ResourceTiming = {
      requestTime: 500,
      proxyStart: 0,
      proxyEnd: 0,
      dnsStart: 0,
      dnsEnd: 0,
      connectStart: 0,
      connectEnd: 0,
      sslStart: 0,
      sslEnd: 0,
      sendStart: 800,
      sendEnd: 900,
      pushStart: 0,
      pushEnd: 0,
      receiveHeadersStart: 1000,
      receiveHeadersEnd: 0,
    } as unknown as Protocol.Network.ResourceTiming;

    beforeEach(() => {
      selectedNetworkRequest = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com`, urlString``, null, null, null);
      selectedNetworkRequest.statusCode = 200;
      selectedNetworkRequest.setRequestHeaders([{name: 'content-type', value: 'bar1'}]);
      selectedNetworkRequest.responseHeaders =
          [{name: 'content-type', value: 'bar2'}, {name: 'x-forwarded-for', value: 'bar3'}];
      selectedNetworkRequest.timing = timingInfo;
      selectedNetworkRequest.requestContentData = () => {
        return Promise.resolve(
            new TextUtils.ContentData.ContentData(exampleResponse, false, 'application/json', 'utf-8'));
      };
      const initiatorNetworkRequest = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.initiator.com`, urlString``, null, null,
          null);
      const initiatedNetworkRequest1 = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/1`, urlString``, null, null,
          null);
      const initiatedNetworkRequest2 = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, urlString`https://www.example.com/2`, urlString``, null, null,
          null);

      sinon.stub(Logs.NetworkLog.NetworkLog.instance(), 'initiatorGraphForRequest')
          .withArgs(selectedNetworkRequest)
          .returns({
            initiators: new Set([selectedNetworkRequest, initiatorNetworkRequest]),
            initiated: new Map([
              [selectedNetworkRequest, initiatorNetworkRequest],
              [initiatedNetworkRequest1, selectedNetworkRequest],
              [initiatedNetworkRequest2, selectedNetworkRequest],
            ]),
          })
          .withArgs(initiatedNetworkRequest1)
          .returns({
            initiators: new Set([]),
            initiated: new Map([
              [initiatedNetworkRequest1, selectedNetworkRequest],
            ]),
          })
          .withArgs(initiatedNetworkRequest2)
          .returns({
            initiators: new Set([]),
            initiated: new Map([
              [initiatedNetworkRequest2, selectedNetworkRequest],
            ]),
          });

      calculator = new NetworkTimeCalculator.NetworkTransferTimeCalculator();
      calculator.updateBoundaries(selectedNetworkRequest);
    });

    it('generates an answer', async function() {
      const agent = new NetworkAgent.NetworkAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
        }]]),
      });

      const responses = await Array.fromAsync(
          agent.run('test', {selected: new RequestContext.RequestContext(selectedNetworkRequest, calculator)}));
      snapshotTester.assert(this, JSON.stringify(responses, null, 2));
    });

    it('yields a ContextResponse containing a NETWORK_REQUEST_GENERAL_HEADERS widget', async function() {
      const agent = new NetworkAgent.NetworkAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
        }]]),
      });

      const responses = await Array.fromAsync(
          agent.run('test', {selected: new RequestContext.RequestContext(selectedNetworkRequest, calculator)}));

      const contextResponse = responses.find(r => r.type === AiAgent.ResponseType.CONTEXT);
      assert.exists(contextResponse);
      assert.exists(contextResponse.widgets);
      assert.lengthOf(contextResponse.widgets, 1);
      assert.strictEqual(contextResponse.widgets[0].name, 'NETWORK_REQUEST_GENERAL_HEADERS');
      const widget = contextResponse.widgets[0] as AiAgent.NetworkRequestGeneralHeadersAiWidget;
      assert.strictEqual(widget.data.request, selectedNetworkRequest);
    });

    it('builds historical contexts', async function() {
      const agent = new NetworkAgent.NetworkAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
        }]]),
      });

      await Array.fromAsync(
          agent.run('test', {selected: new RequestContext.RequestContext(selectedNetworkRequest, calculator)}));

      const historicalCtx = agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts;
      snapshotTester.assert(this, JSON.stringify(historicalCtx, null, 2));
    });
  });
});
