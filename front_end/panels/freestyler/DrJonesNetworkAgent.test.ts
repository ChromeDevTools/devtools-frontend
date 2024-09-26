// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Logs from '../../models/logs/logs.js';
import {
  describeWithEnvironment,
  getGetHostConfigStub,
} from '../../testing/EnvironmentHelpers.js';

import {DrJonesNetworkAgent, ResponseType} from './freestyler.js';

describeWithEnvironment('DrJonesNetworkAgent', () => {
  function mockHostConfig(modelId?: string) {
    getGetHostConfigStub({
      devToolsExplainThisResourceDogfood: {
        modelId,
      },
    });
  }

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.restore();
    });

    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      assert.strictEqual(
          DrJonesNetworkAgent.buildRequest({input: 'test input'}).options?.model_id,
          'test model',
      );
    });

    it('builds a request with logging', async () => {
      mockHostConfig('test model');
      assert.strictEqual(
          DrJonesNetworkAgent.buildRequest({input: 'test input', serverSideLoggingEnabled: true})
              .metadata?.disable_user_content_logging,
          false,
      );
    });

    it('builds a request without logging', async () => {
      mockHostConfig('test model');
      assert.strictEqual(
          DrJonesNetworkAgent.buildRequest({input: 'test input', serverSideLoggingEnabled: false})
              .metadata?.disable_user_content_logging,
          true,
      );
    });

    it('builds a request with input', async () => {
      mockHostConfig();
      const request = DrJonesNetworkAgent.buildRequest({input: 'test input'});
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, undefined);
      assert.strictEqual(request.chat_history, undefined);
    });

    it('builds a request with a sessionId', async () => {
      mockHostConfig();
      const request = DrJonesNetworkAgent.buildRequest({input: 'test input', sessionId: 'sessionId'});
      assert.strictEqual(request.metadata?.string_session_id, 'sessionId');
    });

    it('builds a request with preamble', async () => {
      mockHostConfig();
      const request = DrJonesNetworkAgent.buildRequest({input: 'test input', preamble: 'preamble'});
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, 'preamble');
      assert.strictEqual(request.chat_history, undefined);
    });

    it('builds a request with chat history', async () => {
      mockHostConfig();
      const request = DrJonesNetworkAgent.buildRequest({
        input: 'test input',
        chatHistory: [
          {
            text: 'test',
            entity: Host.AidaClient.Entity.USER,
          },
        ],
      });
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, undefined);
      assert.deepStrictEqual(request.chat_history, [
        {
          text: 'test',
          entity: 1,
        },
      ]);
    });

    it('structure matches the snapshot', () => {
      mockHostConfig('test model');
      assert.deepStrictEqual(
          DrJonesNetworkAgent.buildRequest({
            input: 'test input',
            preamble: 'preamble',
            chatHistory: [
              {
                text: 'first',
                entity: Host.AidaClient.Entity.UNKNOWN,
              },
              {
                text: 'second',
                entity: Host.AidaClient.Entity.SYSTEM,
              },
              {
                text: 'third',
                entity: Host.AidaClient.Entity.USER,
              },
            ],
            serverSideLoggingEnabled: true,
            sessionId: 'sessionId',
          }),
          {
            input: 'test input',
            client: 'CHROME_DEVTOOLS',
            preamble: 'preamble',
            chat_history: [
              {
                entity: 0,
                text: 'first',
              },
              {
                entity: 2,
                text: 'second',
              },
              {
                entity: 1,
                text: 'third',
              },
            ],
            metadata: {
              disable_user_content_logging: false,
              string_session_id: 'sessionId',
              user_tier: 2,
            },
            options: {
              model_id: 'test model',
            },
            client_feature: 2,
            functionality_type: 1,
          },
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
          'requestId' as Protocol.Network.RequestId, 'https://www.example.com' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      selectedNetworkRequest.statusCode = 200;
      selectedNetworkRequest.setRequestHeaders([{name: 'foo1', value: 'bar1'}]);
      selectedNetworkRequest.responseHeaders = [{name: 'foo2', value: 'bar2'}, {name: 'foo3', value: 'bar3'}];
      selectedNetworkRequest.timing = timingInfo;

      const initiatorNetworkRequest = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, 'https://www.initiator.com' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      const initiatedNetworkRequest1 = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, 'https://www.example.com/1' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);
      const initiatedNetworkRequest2 = SDK.NetworkRequest.NetworkRequest.create(
          'requestId' as Protocol.Network.RequestId, 'https://www.example.com/2' as Platform.DevToolsPath.UrlString,
          '' as Platform.DevToolsPath.UrlString, null, null, null);

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

    function mockAidaClient(
        fetch: () => AsyncGenerator<Host.AidaClient.AidaResponse, void, void>,
        ): Host.AidaClient.AidaClient {
      return {
        fetch,
        registerClientEvent: () => Promise.resolve({}),
      };
    }

    it('generates an answer', async () => {
      async function* generateAnswer() {
        yield {
          explanation: 'This is the answer',
          metadata: {
            rpcGlobalId: 123,
          },
          completed: true,
        };
      }

      const agent = new DrJonesNetworkAgent({
        aidaClient: mockAidaClient(generateAnswer),
      });

      const responses = await Array.fromAsync(agent.run('test', {selectedNetworkRequest}));
      assert.deepStrictEqual(responses, [
        {
          type: ResponseType.TITLE,
          rpcId: undefined,
          title: 'Inspecting network data',
        },
        {
          type: ResponseType.THOUGHT,
          rpcId: undefined,
          thought: 'Data used to generate this response',
          contextDetails: [
            {
              title: 'Request',
              text: 'Request URL: https://www.example.com\n\nRequest Headers\nfoo1: bar1',
            },
            {
              title: 'Response',
              text: 'Response Status: 200 \n\nResponse Headers\nfoo2: bar2\nfoo3: bar3',
            },
            {
              title: 'Timing',
              text: `Request start time: 500
Request end time: -1
Receiving response headers start time: 1000
Receiving response headers end time: 0
Proxy negotiation start time: 0
Proxy negotiation end time: 0
DNS lookup start time: 0
DNS lookup end time: 0
TCP start time: 0
TCP end time: 0
SSL start time: 0
SSL end time: 0
Sending start: 800
Sending end: 900
`,
            },
            {
              title: 'Request Initiator Chain',
              text: `- URL: https://www.initiator.com
\t- URL: https://www.example.com
\t\t- URL: https://www.example.com/1
\t\t- URL: https://www.example.com/2
`,
            },
          ],
        },
        {
          type: ResponseType.ANSWER,
          text: 'This is the answer',
          rpcId: 123,
          fixable: false,
        },
      ]);
      assert.deepStrictEqual(agent.chatHistoryForTesting, [
        {
          entity: 1,
          text: `# Selected network request \nRequest: https://www.example.com

Request headers:
foo1: bar1

Response headers:
foo2: bar2
foo3: bar3

Response status: 200 \n
Request Timing:
Request start time: 500
Request end time: -1
Receiving response headers start time: 1000
Receiving response headers end time: 0
Proxy negotiation start time: 0
Proxy negotiation end time: 0
DNS lookup start time: 0
DNS lookup end time: 0
TCP start time: 0
TCP end time: 0
SSL start time: 0
SSL end time: 0
Sending start: 800
Sending end: 900


Request Initiator Chain:
- URL: https://www.initiator.com
\t- URL: https://www.example.com
\t\t- URL: https://www.example.com/1
\t\t- URL: https://www.example.com/2


# User request

test`,
        },
        {
          entity: 2,
          text: 'This is the answer',
        },
      ]);
    });
  });
});
