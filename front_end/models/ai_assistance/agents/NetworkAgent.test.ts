// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as Network from '../../../panels/network/network.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {updateHostConfig} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {createNetworkPanelForMockConnection} from '../../../testing/NetworkHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as Logs from '../../logs/logs.js';
import {
  NetworkAgent,
  RequestContext,
  ResponseType,
} from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('NetworkAgent', () => {
  let networkPanel: Network.NetworkPanel.NetworkPanel;

  function mockHostConfig(modelId?: string, temperature?: number) {
    updateHostConfig({
      devToolsAiAssistanceNetworkAgent: {
        modelId,
        temperature,
      },
    });
  }

  beforeEach(async () => {
    networkPanel = await createNetworkPanelForMockConnection();
  });

  afterEach(async () => {
    await RenderCoordinator.done();
    networkPanel.detach();
  });

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.restore();
    });

    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      const agent = new NetworkAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.model_id,
          'test model',
      );
    });

    it('builds a request with a temperature', async () => {
      mockHostConfig('test model', 1);
      const agent = new NetworkAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.temperature,
          1,
      );
    });
  });
  describe('run', () => {
    let selectedNetworkRequest: SDK.NetworkRequest.NetworkRequest;
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
    });

    afterEach(() => {
      sinon.restore();
    });

    it('generates an answer', async () => {
      const agent = new NetworkAgent({
        aidaClient: mockAidaClient([[{
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
        }]]),
      });

      const responses =
          await Array.fromAsync(agent.run('test', {selected: new RequestContext(selectedNetworkRequest)}));
      assert.deepEqual(responses, [
        {
          type: ResponseType.USER_QUERY,
          query: 'test',
          imageInput: undefined,
          imageId: undefined,
        },
        {
          type: ResponseType.CONTEXT,
          title: 'Analyzing network data',
          details: [
            {
              title: 'Request',
              text: 'Request URL: https://www.example.com\n\nRequest headers:\ncontent-type: bar1',
            },
            {
              title: 'Response',
              text: 'Response Status: 200 \n\nResponse headers:\ncontent-type: bar2\nx-forwarded-for: bar3',
            },
            {
              title: 'Timing',
              text:
                  'Queued at (timestamp): 0 μs\nStarted at (timestamp): 8.4 min\nQueueing (duration): 8.4 min\nConnection start (stalled) (duration): 800.00 ms\nRequest sent (duration): 100.00 ms\nDuration (duration): 8.4 min',
            },
            {
              title: 'Request initiator chain',
              text: `- URL: <redacted cross-origin initiator URL>
\t- URL: https://www.example.com
\t\t- URL: https://www.example.com/1
\t\t- URL: https://www.example.com/2`,
            },
          ],
        },
        {
          type: ResponseType.QUERYING,
        },
        {
          type: ResponseType.ANSWER,
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
            text: `# Selected network request \nRequest: https://www.example.com

Request headers:
content-type: bar1

Response headers:
content-type: bar2
x-forwarded-for: bar3

Response status: 200 \n
Request timing:
Queued at (timestamp): 0 μs
Started at (timestamp): 8.4 min
Queueing (duration): 8.4 min
Connection start (stalled) (duration): 800.00 ms
Request sent (duration): 100.00 ms
Duration (duration): 8.4 min

Request initiator chain:
- URL: <redacted cross-origin initiator URL>
\t- URL: https://www.example.com
\t\t- URL: https://www.example.com/1
\t\t- URL: https://www.example.com/2

# User request

test`,
          }],
        },
        {
          role: 2,
          parts: [{text: 'This is the answer'}],
        },
      ]);
    });
  });
});
