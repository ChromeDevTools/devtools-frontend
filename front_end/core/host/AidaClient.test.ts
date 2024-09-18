// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment, getGetHostConfigStub} from '../../testing/EnvironmentHelpers.js';

import * as Host from './host.js';

const TEST_MODEL_ID = 'testModelId';

describeWithEnvironment('AidaClient', () => {
  it('adds no model temperature if console insights is not enabled', () => {
    const stub = getGetHostConfigStub({});
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      client_feature: 1,
      functionality_type: 2,
    });
    stub.restore();
  });

  it('adds a model temperature', () => {
    const stub = getGetHostConfigStub({
      devToolsConsoleInsights: {
        enabled: true,
        temperature: 0.5,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      options: {
        temperature: 0.5,
      },
      client_feature: 1,
      functionality_type: 2,
    });
    stub.restore();
  });

  it('adds a model temperature of 0', () => {
    const stub = getGetHostConfigStub({
      devToolsConsoleInsights: {
        enabled: true,
        temperature: 0,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      options: {
        temperature: 0,
      },
      client_feature: 1,
      functionality_type: 2,
    });
    stub.restore();
  });

  it('ignores a negative model temperature', () => {
    const stub = getGetHostConfigStub({
      devToolsConsoleInsights: {
        enabled: true,
        temperature: -1,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      client_feature: 1,
      functionality_type: 2,
    });
    stub.restore();
  });

  it('adds a model id and temperature', () => {
    const stub = getGetHostConfigStub({
      devToolsConsoleInsights: {
        enabled: true,
        modelId: TEST_MODEL_ID,
        temperature: 0.5,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      options: {
        model_id: TEST_MODEL_ID,
        temperature: 0.5,
      },
      client_feature: 1,
      functionality_type: 2,
    });
    stub.restore();
  });

  it('adds metadata to disallow logging', () => {
    const stub = getGetHostConfigStub({
      aidaAvailability: {
        disallowLogging: true,
      },
      devToolsConsoleInsights: {
        enabled: true,
        temperature: 0.5,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      metadata: {
        disable_user_content_logging: true,
      },
      options: {
        temperature: 0.5,
      },
      client_feature: 1,
      functionality_type: 2,
    });
    stub.restore();
  });

  async function getAllResults(provider: Host.AidaClient.AidaClient): Promise<Host.AidaClient.AidaResponse[]> {
    const results = [];
    for await (const result of provider.fetch(Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo'))) {
      results.push(result);
    }
    return results;
  }

  it('handles chunked response', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation')
        .callsFake(async (_, streamId, callback) => {
          const response = JSON.stringify([
            {textChunk: {text: 'hello '}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'brave '}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'new world!'}},
          ]);
          let first = true;
          for (const chunk of response.split(',{')) {
            await new Promise(resolve => setTimeout(resolve, 0));
            Host.ResourceLoader.streamWrite(streamId, first ? chunk : ',{' + chunk);
            first = false;
          }
          callback({statusCode: 200});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = await getAllResults(provider);
    assert.deepStrictEqual(results, [
      {explanation: 'hello ', metadata: {rpcGlobalId: 123}, completed: false},
      {explanation: 'hello brave ', metadata: {rpcGlobalId: 123}, completed: false},
      {explanation: 'hello brave new world!', metadata: {rpcGlobalId: 123}, completed: false},
      {explanation: 'hello brave new world!', metadata: {rpcGlobalId: 123}, completed: true},
    ]);
  });

  it('handles single square bracket as a chunk', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation')
        .callsFake(async (_, streamId, callback) => {
          const response = ['[', JSON.stringify({textChunk: {text: 'hello world'}, metadata: {rpcGlobalId: 123}}), ']'];
          for (const chunk of response) {
            await new Promise(resolve => setTimeout(resolve, 0));
            Host.ResourceLoader.streamWrite(streamId, chunk);
          }
          callback({statusCode: 200});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = await getAllResults(provider);
    assert.deepStrictEqual(results, [
      {explanation: 'hello world', metadata: {rpcGlobalId: 123}, completed: false},
      {explanation: 'hello world', metadata: {rpcGlobalId: 123}, completed: true},
    ]);
  });

  it('handles chunked response with multiple objects per chunk', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation')
        .callsFake(async (_, streamId, callback) => {
          const response = JSON.stringify([
            {textChunk: {text: 'Friends, Romans, countrymen, lend me your ears;\n'}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'I come to bury Caesar, not to praise him.\n'}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'The evil that men do lives after them;\n'}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'The good is oft interred with their bones;\n'}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'So let it be with Caesar. The noble Brutus\n'}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'Hath told you Caesar was ambitious:\n'}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'If it were so, it was a grievous fault,\n'}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'And grievously hath Caesar answer’d it.\n'}, metadata: {rpcGlobalId: 123}},
          ]);
          const chunks = response.split(',{');
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(streamId, chunks[0] + ',{' + chunks[1]);
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(streamId, ',{' + chunks[2] + ',{' + chunks[3] + ',{' + chunks[4]);
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(streamId, ',{' + chunks[5]);
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(streamId, ',{' + chunks[6] + ',{' + chunks[7]);
          callback({statusCode: 200});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = await getAllResults(provider);
    assert.deepStrictEqual(results, [
      {
        explanation: 'Friends, Romans, countrymen, lend me your ears;\n' +
            'I come to bury Caesar, not to praise him.\n',
        metadata: {rpcGlobalId: 123},
        completed: false,
      },
      {
        explanation: 'Friends, Romans, countrymen, lend me your ears;\n' +
            'I come to bury Caesar, not to praise him.\n' +
            'The evil that men do lives after them;\n' +
            'The good is oft interred with their bones;\n' +
            'So let it be with Caesar. The noble Brutus\n',
        metadata: {rpcGlobalId: 123},
        completed: false,
      },
      {
        explanation: 'Friends, Romans, countrymen, lend me your ears;\n' +
            'I come to bury Caesar, not to praise him.\n' +
            'The evil that men do lives after them;\n' +
            'The good is oft interred with their bones;\n' +
            'So let it be with Caesar. The noble Brutus\n' +
            'Hath told you Caesar was ambitious:\n',
        metadata: {rpcGlobalId: 123},
        completed: false,
      },
      {
        explanation: 'Friends, Romans, countrymen, lend me your ears;\n' +
            'I come to bury Caesar, not to praise him.\n' +
            'The evil that men do lives after them;\n' +
            'The good is oft interred with their bones;\n' +
            'So let it be with Caesar. The noble Brutus\n' +
            'Hath told you Caesar was ambitious:\n' +
            'If it were so, it was a grievous fault,\n' +
            'And grievously hath Caesar answer’d it.\n',
        metadata: {rpcGlobalId: 123},
        completed: false,
      },
      {
        explanation: 'Friends, Romans, countrymen, lend me your ears;\n' +
            'I come to bury Caesar, not to praise him.\n' +
            'The evil that men do lives after them;\n' +
            'The good is oft interred with their bones;\n' +
            'So let it be with Caesar. The noble Brutus\n' +
            'Hath told you Caesar was ambitious:\n' +
            'If it were so, it was a grievous fault,\n' +
            'And grievously hath Caesar answer’d it.\n',
        metadata: {rpcGlobalId: 123},
        completed: true,
      },
    ]);
  });

  it('handles attributionMetadata', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation')
        .callsFake(async (_, streamId, callback) => {
          const response = JSON.stringify([
            {
              textChunk: {text: 'Chunk1\n'},
              metadata: {rpcGlobalId: 123, attributionMetadata: {attributionAction: 'BLOCK', citations: []}},
            },
            {
              textChunk: {text: 'Chunk2\n'},
              metadata: {
                rpcGlobalId: 123,
                attributionMetadata:
                    {attributionAction: 'CITE', citations: [{startIndex: 0, endIndex: 1, url: 'https://example.com'}]},
              },
            },
          ]);
          const chunks = response.split(',{');
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(streamId, chunks[0] + ',{' + chunks[1]);
          await new Promise(resolve => setTimeout(resolve, 0));
          callback({statusCode: 200});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = await getAllResults(provider);
    assert.deepStrictEqual(results, [
      {
        explanation: 'Chunk1\n' +
            'Chunk2\n',
        metadata: {
          rpcGlobalId: 123,
          attributionMetadata: [
            {attributionAction: Host.AidaClient.RecitationAction.BLOCK, citations: []},
            {
              attributionAction: Host.AidaClient.RecitationAction.CITE,
              citations: [{startIndex: 0, endIndex: 1, url: 'https://example.com'}],
            },
          ],
        },
        completed: false,
      },
      {
        explanation: 'Chunk1\n' +
            'Chunk2\n',
        metadata: {
          rpcGlobalId: 123,
          attributionMetadata: [
            {attributionAction: Host.AidaClient.RecitationAction.BLOCK, citations: []},
            {
              attributionAction: Host.AidaClient.RecitationAction.CITE,
              citations: [{startIndex: 0, endIndex: 1, url: 'https://example.com'}],
            },
          ],
        },
        completed: true,
      },
    ]);
  });

  it('handles subsequent code chunks', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation')
        .callsFake(async (_, streamId, callback) => {
          const response = JSON.stringify([
            {textChunk: {text: 'hello '}},
            {codeChunk: {code: 'brave '}},
            {codeChunk: {code: 'new World()'}},
          ]);
          for (const chunk of response.split(',')) {
            await new Promise(resolve => setTimeout(resolve, 0));
            Host.ResourceLoader.streamWrite(streamId, chunk);
          }
          callback({statusCode: 200});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = (await getAllResults(provider)).map(r => r.explanation);
    assert.deepStrictEqual(results, [
      'hello ',
      'hello \n`````\nbrave \n`````\n',
      'hello \n`````\nbrave new World()\n`````\n',
      'hello \n`````\nbrave new World()\n`````\n',
    ]);
  });

  it('throws a readable error on 403', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation').callsArgWith(2, {
      statusCode: 403,
    });
    const provider = new Host.AidaClient.AidaClient();
    try {
      await getAllResults(provider);
      expect.fail('provider.fetch did not throw');
    } catch (err) {
      expect(err.message).equals('Server responded: permission denied');
    }
  });

  it('throws an error for other codes', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation').callsArgWith(2, {
      statusCode: 418,
    });
    const provider = new Host.AidaClient.AidaClient();
    try {
      await getAllResults(provider);
      expect.fail('provider.fetch did not throw');
    } catch (err) {
      expect(err.message).equals('Request failed: {"statusCode":418}');
    }
  });

  it('throws an error with all details for other failures', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation').callsArgWith(2, {
      error: 'Cannot get OAuth credentials',
      detail: '{\'@type\': \'type.googleapis.com/google.rpc.DebugInfo\', \'detail\': \'DETAILS\'}',
    });
    const provider = new Host.AidaClient.AidaClient();
    try {
      await getAllResults(provider);
      expect.fail('provider.fetch did not throw');
    } catch (err) {
      expect(err.message)
          .equals(
              'Cannot send request: Cannot get OAuth credentials {\'@type\': \'type.googleapis.com/google.rpc.DebugInfo\', \'detail\': \'DETAILS\'}');
    }
  });

  describe('getAidaClientAvailability', () => {
    function mockGetSyncInformation(information: Host.InspectorFrontendHostAPI.SyncInformation): void {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'getSyncInformation').callsFake(cb => {
        cb(information);
      });
    }

    beforeEach(() => {
      sinon.restore();
    });

    it('should return NO_INTERNET when navigator is not online', async () => {
      const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')!;
      Object.defineProperty(globalThis, 'navigator', {
        get() {
          return {onLine: false};
        },
      });

      try {
        const result = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        assert.strictEqual(result, Host.AidaClient.AidaAccessPreconditions.NO_INTERNET);
      } finally {
        Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
      }
    });

    it('should return NO_ACCOUNT_EMAIL when the syncInfo doesn\'t contain accountEmail', async () => {
      mockGetSyncInformation({accountEmail: undefined, isSyncActive: true});

      const result = await Host.AidaClient.AidaClient.checkAccessPreconditions();

      assert.strictEqual(result, Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL);
    });

    it('should return AVAILABLE when navigator is online, accountEmail exists and isSyncActive is true', async () => {
      mockGetSyncInformation({accountEmail: 'some-email', isSyncActive: true});

      const result = await Host.AidaClient.AidaClient.checkAccessPreconditions();

      assert.strictEqual(result, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    });

    it('should return AVAILABLE when navigator is online, accountEmail exists and isSyncActive is false', async () => {
      mockGetSyncInformation({accountEmail: 'some-email', isSyncActive: false});

      const result = await Host.AidaClient.AidaClient.checkAccessPreconditions();

      assert.strictEqual(result, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
    });
  });

  describe('registerClientEvent', () => {
    it('should populate the default value for Aida Client event', async () => {
      const stub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'registerAidaClientEvent');
      const RPC_ID = 0;

      const provider = new Host.AidaClient.AidaClient();
      void provider.registerClientEvent({
        corresponding_aida_rpc_global_id: RPC_ID,
        disable_user_content_logging: false,
        do_conversation_client_event: {user_feedback: {sentiment: Host.AidaClient.Rating.POSITIVE}},
      });
      const arg = JSON.parse(stub.getCalls()[0].args[0]);

      sinon.assert.match(arg, sinon.match({
        client: Host.AidaClient.CLIENT_NAME,
        event_time: sinon.match.string,
        corresponding_aida_rpc_global_id: RPC_ID,
        do_conversation_client_event: {
          user_feedback: {
            sentiment: 'POSITIVE',
          },
        },
      }));
    });
  });
});
