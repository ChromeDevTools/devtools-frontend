// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {
  restoreUserAgentForTesting,
  setUserAgentForTesting,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';

import * as Host from './host.js';
import type {AidaCodeCompleteResult} from './InspectorFrontendHostAPI.js';

const TEST_MODEL_ID = 'testModelId';

describe('AidaClient', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

  beforeEach(() => {
    setUserAgentForTesting();
  });

  afterEach(() => {
    restoreUserAgentForTesting();
  });

  it('adds no model temperature if console insights is not enabled', () => {
    updateHostConfig({
      aidaAvailability: {
        disallowLogging: false,
      },
      devToolsConsoleInsights: {},
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepEqual(request, {
      current_message: {
        parts: [{text: 'foo'}],
        role: Host.AidaClient.Role.USER,
      },
      client: 'CHROME_DEVTOOLS',
      client_feature: 1,
      functionality_type: 2,
      metadata: {
        disable_user_content_logging: false,
        client_version: 'unit_test',
      },
    });
  });

  it('adds a model temperature', () => {
    updateHostConfig({
      aidaAvailability: {
        disallowLogging: false,
      },
      devToolsConsoleInsights: {
        enabled: true,
        temperature: 0.5,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepEqual(request, {
      current_message: {
        parts: [{text: 'foo'}],
        role: Host.AidaClient.Role.USER,
      },
      client: 'CHROME_DEVTOOLS',
      options: {
        temperature: 0.5,
      },
      client_feature: 1,
      functionality_type: 2,
      metadata: {
        disable_user_content_logging: false,
        client_version: 'unit_test',
      },
    });
  });

  it('adds a model temperature of 0', () => {
    updateHostConfig({
      aidaAvailability: {
        disallowLogging: false,
      },
      devToolsConsoleInsights: {
        enabled: true,
        temperature: 0,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepEqual(request, {
      current_message: {
        parts: [{text: 'foo'}],
        role: Host.AidaClient.Role.USER,
      },
      client: 'CHROME_DEVTOOLS',
      options: {
        temperature: 0,
      },
      client_feature: 1,
      functionality_type: 2,
      metadata: {
        disable_user_content_logging: false,
        client_version: 'unit_test',
      },
    });
  });

  it('ignores a negative model temperature', () => {
    updateHostConfig({
      aidaAvailability: {
        disallowLogging: false,
      },
      devToolsConsoleInsights: {
        enabled: true,
        temperature: -1,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepEqual(request, {
      current_message: {
        parts: [{text: 'foo'}],
        role: Host.AidaClient.Role.USER,
      },
      client: 'CHROME_DEVTOOLS',
      client_feature: 1,
      functionality_type: 2,
      metadata: {
        disable_user_content_logging: false,
        client_version: 'unit_test',
      },
    });
  });

  it('adds a model id and temperature', () => {
    updateHostConfig({
      aidaAvailability: {
        disallowLogging: false,
      },
      devToolsConsoleInsights: {
        enabled: true,
        modelId: TEST_MODEL_ID,
        temperature: 0.5,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepEqual(request, {
      current_message: {
        parts: [{text: 'foo'}],
        role: Host.AidaClient.Role.USER,
      },
      client: 'CHROME_DEVTOOLS',
      options: {
        model_id: TEST_MODEL_ID,
        temperature: 0.5,
      },
      client_feature: 1,
      functionality_type: 2,
      metadata: {
        disable_user_content_logging: false,
        client_version: 'unit_test',
      },
    });
  });

  it('adds no model id if configured as empty string', () => {
    updateHostConfig({
      aidaAvailability: {
        disallowLogging: false,
      },
      devToolsConsoleInsights: {
        enabled: true,
        modelId: '',
        temperature: 0.5,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepEqual(request, {
      current_message: {
        parts: [{text: 'foo'}],
        role: Host.AidaClient.Role.USER,
      },
      client: 'CHROME_DEVTOOLS',
      options: {
        temperature: 0.5,
      },
      client_feature: 1,
      functionality_type: 2,
      metadata: {
        disable_user_content_logging: false,
        client_version: 'unit_test',
      },
    });
  });

  it('adds metadata to disallow logging', () => {
    updateHostConfig({
      aidaAvailability: {
        disallowLogging: true,
      },
      devToolsConsoleInsights: {
        enabled: true,
        temperature: 0.5,
      },
    });
    const request = Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo');
    assert.deepEqual(request, {
      current_message: {
        parts: [{text: 'foo'}],
        role: Host.AidaClient.Role.USER,
      },
      client: 'CHROME_DEVTOOLS',
      metadata: {
        disable_user_content_logging: true,
        client_version: 'unit_test',
      },
      options: {
        temperature: 0.5,
      },
      client_feature: 1,
      functionality_type: 2,
    });
  });

  async function getAllResults(
      provider: Host.AidaClient.AidaClient,
      ): Promise<Host.AidaClient.DoConversationResponse[]> {
    const results = [];
    for await (const result of provider.doConversation(
        Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo'),
        )) {
      results.push(result);
    }
    return results;
  }

  it('handles chunked response', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(async (request, callback) => {
          assert.isDefined(request.streamId);
          const streamId = request.streamId;
          const response = JSON.stringify([
            {textChunk: {text: 'hello '}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'brave '}, metadata: {rpcGlobalId: 123}},
            {textChunk: {text: 'new world!'}},
          ]);
          let first = true;
          for (const chunk of response.split(',{')) {
            await new Promise(resolve => setTimeout(resolve, 0));
            Host.ResourceLoader.streamWrite(
                streamId,
                first ? chunk : ',{' + chunk,
            );
            first = false;
          }
          callback({statusCode: 200, response: ''});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = await getAllResults(provider);
    assert.deepEqual(results, [
      {
        explanation: 'hello ',
        metadata: {rpcGlobalId: 123},
        completed: false,
      },
      {
        explanation: 'hello brave ',
        metadata: {rpcGlobalId: 123},
        completed: false,
      },
      {
        explanation: 'hello brave new world!',
        metadata: {rpcGlobalId: 123},
        completed: false,
      },
      {
        explanation: 'hello brave new world!',
        metadata: {rpcGlobalId: 123},
        functionCalls: undefined,
        completed: true,
      },
    ]);
  });

  it('handles single square bracket as a chunk', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(async (request, callback) => {
          assert.isDefined(request.streamId);
          const streamId = request.streamId;
          const response = [
            '[',
            JSON.stringify({
              textChunk: {text: 'hello world'},
              metadata: {rpcGlobalId: 123},
            }),
            ']',
          ];
          for (const chunk of response) {
            await new Promise(resolve => setTimeout(resolve, 0));
            Host.ResourceLoader.streamWrite(streamId, chunk);
          }
          callback({statusCode: 200, response: ''});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = await getAllResults(provider);
    assert.deepEqual(results, [
      {
        explanation: 'hello world',
        metadata: {rpcGlobalId: 123},
        completed: false,
      },
      {
        explanation: 'hello world',
        metadata: {rpcGlobalId: 123},
        functionCalls: undefined,
        completed: true,
      },
    ]);
  });

  it('handles chunked response with multiple objects per chunk', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(async (request, callback) => {
          assert.isDefined(request.streamId);
          const streamId = request.streamId;
          const response = JSON.stringify([
            {
              textChunk: {
                text: 'Friends, Romans, countrymen, lend me your ears;\n',
              },
              metadata: {rpcGlobalId: 123},
            },
            {
              textChunk: {text: 'I come to bury Caesar, not to praise him.\n'},
              metadata: {rpcGlobalId: 123},
            },
            {
              textChunk: {text: 'The evil that men do lives after them;\n'},
              metadata: {rpcGlobalId: 123},
            },
            {
              textChunk: {text: 'The good is oft interred with their bones;\n'},
              metadata: {rpcGlobalId: 123},
            },
            {
              textChunk: {text: 'So let it be with Caesar. The noble Brutus\n'},
              metadata: {rpcGlobalId: 123},
            },
            {
              textChunk: {text: 'Hath told you Caesar was ambitious:\n'},
              metadata: {rpcGlobalId: 123},
            },
            {
              textChunk: {text: 'If it were so, it was a grievous fault,\n'},
              metadata: {rpcGlobalId: 123},
            },
            {
              textChunk: {text: 'And grievously hath Caesar answer’d it.\n'},
              metadata: {rpcGlobalId: 123},
            },
          ]);
          const chunks = response.split(',{');
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(streamId, chunks[0] + ',{' + chunks[1]);
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(
              streamId,
              ',{' + chunks[2] + ',{' + chunks[3] + ',{' + chunks[4],
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(streamId, ',{' + chunks[5]);
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(
              streamId,
              ',{' + chunks[6] + ',{' + chunks[7],
          );
          callback({statusCode: 200, response: ''});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = await getAllResults(provider);
    assert.deepEqual(results, [
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
        functionCalls: undefined,
        completed: true,
      },
    ]);
  });

  it('handles attributionMetadata', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(async (request, callback) => {
          assert.isDefined(request.streamId);
          const streamId = request.streamId;
          const response = JSON.stringify([
            {
              textChunk: {text: 'Chunk1\n'},
              metadata: {rpcGlobalId: 123},
            },
            {
              textChunk: {text: 'Chunk2\n'},
              metadata: {
                rpcGlobalId: 123,
                attributionMetadata: {
                  attributionAction: 'CITE',
                  citations: [
                    {startIndex: 0, endIndex: 1, uri: 'https://example.com'},
                  ],
                },
              },
            },
          ]);
          const chunks = response.split(',{');
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(streamId, chunks[0] + ',{' + chunks[1]);
          await new Promise(resolve => setTimeout(resolve, 0));
          callback({statusCode: 200, response: ''});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = await getAllResults(provider);
    assert.deepEqual(results, [
      {
        explanation: 'Chunk1\n' +
            'Chunk2\n',
        metadata: {
          rpcGlobalId: 123,
          attributionMetadata: {
            attributionAction: Host.AidaClient.RecitationAction.CITE,
            citations: [
              {startIndex: 0, endIndex: 1, uri: 'https://example.com'},
            ],
          },
        },
        completed: false,
      },
      {
        explanation: 'Chunk1\n' +
            'Chunk2\n',
        metadata: {
          rpcGlobalId: 123,
          attributionMetadata: {
            attributionAction: Host.AidaClient.RecitationAction.CITE,
            citations: [
              {startIndex: 0, endIndex: 1, uri: 'https://example.com'},
            ],
          },
        },
        functionCalls: undefined,
        completed: true,
      },
    ]);
  });

  it('throws on attributionAction of "block"', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(async (request, callback) => {
          assert.isDefined(request.streamId);
          const streamId = request.streamId;
          const response = JSON.stringify([
            {
              textChunk: {text: 'Chunk1\n'},
              metadata: {
                rpcGlobalId: 123,
                attributionMetadata: {
                  attributionAction: 'NO_ACTION',
                  citations: [],
                },
              },
            },
            {
              textChunk: {text: 'Chunk2\n'},
              metadata: {
                rpcGlobalId: 123,
                attributionMetadata: {
                  attributionAction: 'BLOCK',
                  citations: [],
                },
              },
            },
          ]);
          const chunks = response.split(',{');
          await new Promise(resolve => setTimeout(resolve, 0));
          Host.ResourceLoader.streamWrite(streamId, chunks[0] + ',{' + chunks[1]);
          await new Promise(resolve => setTimeout(resolve, 0));
          callback({statusCode: 200, response: ''});
        });

    const provider = new Host.AidaClient.AidaClient();
    try {
      await getAllResults(provider);
      assert.fail('provider.fetch did not throw');
    } catch (err) {
      assert.instanceOf(err, Host.AidaClient.AidaBlockError);
    }
  });

  it('handles subsequent code chunks', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(async (request, callback) => {
          assert.isDefined(request.streamId);
          const streamId = request.streamId;
          const response = JSON.stringify([
            {textChunk: {text: 'hello '}},
            {codeChunk: {code: 'brave '}},
            {codeChunk: {code: 'new World()'}},
          ]);
          for (const chunk of response.split(',')) {
            await new Promise(resolve => setTimeout(resolve, 0));
            Host.ResourceLoader.streamWrite(streamId, chunk);
          }
          callback({statusCode: 200, response: ''});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = (await getAllResults(provider)).map(r => r.explanation);
    assert.deepEqual(results, [
      'hello ',
      'hello \n`````\nbrave \n`````\n',
      'hello \n`````\nbrave new World()\n`````\n',
      'hello \n`````\nbrave new World()\n`````\n',
    ]);
  });

  it('handles subsequent code chunks with attached language', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(async (request, callback) => {
          assert.isDefined(request.streamId);
          const streamId = request.streamId;
          const response = [
            {textChunk: {text: 'hello '}},
            {codeChunk: {code: 'brave ', inferenceLanguage: 'JAVASCRIPT'}},
            {codeChunk: {code: 'new World()'}},
          ];
          for (const chunk of response) {
            await new Promise(resolve => setTimeout(resolve, 0));
            Host.ResourceLoader.streamWrite(streamId, JSON.stringify(chunk));
          }
          callback({statusCode: 200, response: ''});
        });

    const provider = new Host.AidaClient.AidaClient();
    const results = (await getAllResults(provider)).map(r => r.explanation);
    assert.deepEqual(results, [
      'hello ',
      'hello \n`````js\nbrave \n`````\n',
      'hello \n`````js\nbrave new World()\n`````\n',
      'hello \n`````js\nbrave new World()\n`````\n',
    ]);
  });

  it('throws a readable error on 403', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsArgWith(1, {
          statusCode: 403,
        });
    const provider = new Host.AidaClient.AidaClient();
    try {
      await getAllResults(provider);
      assert.fail('provider.fetch did not throw');
    } catch (err) {
      assert.instanceOf(err, Host.AidaClient.AidaPermissionDeniedError);
    }
  });

  it('throws a timeout error on timeout', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsArgWith(1, {
          netErrorName: 'net::ERR_TIMED_OUT',
        });
    const provider = new Host.AidaClient.AidaClient();
    try {
      await getAllResults(provider);
      assert.fail('provider.fetch did not throw');
    } catch (err) {
      assert.instanceOf(err, Host.AidaClient.AidaTimeoutError);
    }
  });

  it('throws an AidaQuotaError on 429', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsArgWith(1, {
          statusCode: 429,
        });
    const provider = new Host.AidaClient.AidaClient();
    try {
      await getAllResults(provider);
      assert.fail('provider.fetch did not throw');
    } catch (err) {
      assert.instanceOf(err, Host.AidaClient.AidaQuotaError);
    }
  });

  it('throws an AidaQuotaError when response error payload contains quota', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsArgWith(1, {
          statusCode: 400,
          error: 'RESOURCE_EXHAUSTED',
          detail: 'Quota exceeded for project',
        });
    const provider = new Host.AidaClient.AidaClient();
    try {
      await getAllResults(provider);
      assert.fail('provider.fetch did not throw');
    } catch (err) {
      assert.instanceOf(err, Host.AidaClient.AidaQuotaError);
    }
  });

  it('throws an error for other codes', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsArgWith(1, {
          statusCode: 418,
        });
    const provider = new Host.AidaClient.AidaClient();
    try {
      await getAllResults(provider);
      assert.fail('provider.fetch did not throw');
    } catch (err) {
      assert.strictEqual(
          (err as Error).message,
          'Request failed: {"statusCode":418}',
      );
    }
  });

  it('throws an error with all details for other failures', async () => {
    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsArgWith(1, {
          error: 'Cannot get OAuth credentials',
          detail: '{\'@type\': \'type.googleapis.com/google.rpc.DebugInfo\', \'detail\': \'DETAILS\'}',
        });
    const provider = new Host.AidaClient.AidaClient();
    try {
      await getAllResults(provider);
      assert.fail('provider.fetch did not throw');
    } catch (err) {
      assert.strictEqual(
          (err as Error).message,
          'Cannot send request: Cannot get OAuth credentials {\'@type\': \'type.googleapis.com/google.rpc.DebugInfo\', \'detail\': \'DETAILS\'}',
      );
    }
  });

  it('removes the abort event listener when the stream finishes', async () => {
    const controller = new AbortController();
    const signal = controller.signal;
    const addSpy = sinon.spy(signal, 'addEventListener');
    const removeSpy = sinon.spy(signal, 'removeEventListener');

    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(async (request, callback) => {
          assert.isDefined(request.streamId);
          const streamId = request.streamId;
          Host.ResourceLoader.streamWrite(streamId, JSON.stringify({textChunk: {text: 'hello'}}));
          callback({statusCode: 200, response: ''});
        });

    const provider = new Host.AidaClient.AidaClient();
    for await (const result of provider.doConversation(
        Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo'),
        {signal},
        )) {
      void result;
    }

    // addEventListener and removeEventListener are called twice:
    // 1. Once in AidaClient.doConversation to abort the generator stream.
    // 2. Once in DispatchHttpRequestClient.makeHttpRequest to abort the network request.
    sinon.assert.calledTwice(addSpy);
    sinon.assert.calledTwice(removeSpy);
    assert.isTrue(removeSpy.calledAfter(addSpy));
  });

  it('throws AidaAbortError and cleans up when aborted', async () => {
    const controller = new AbortController();
    const signal = controller.signal;
    const addSpy = sinon.spy(signal, 'addEventListener');
    const removeSpy = sinon.spy(signal, 'removeEventListener');

    sinon
        .stub(
            Host.InspectorFrontendHost.InspectorFrontendHostInstance,
            'dispatchHttpRequest',
            )
        .callsFake(async (_request, _callback) => {
                       // Simulate request hanging
                   });

    const provider = new Host.AidaClient.AidaClient();
    const call = provider.doConversation(
        Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo'),
        {signal},
    );

    const nextPromise = call.next();
    controller.abort();

    let error;
    try {
      await nextPromise;
    } catch (err) {
      error = err;
    }

    assert.instanceOf(error, Host.AidaClient.AidaAbortError);
    // addEventListener is called twice (stream level and network level).
    // removeEventListener is only called once (in AidaClient finally block)
    // because the network request fails and the browser unregisters its
    // listener automatically when the event fires due to {once: true}.
    sinon.assert.calledTwice(addSpy);
    sinon.assert.calledOnce(removeSpy);
    assert.isTrue(removeSpy.calledAfter(addSpy));
  });

  it('throws AidaAbortError immediately if started with an already aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const signal = controller.signal;
    const addSpy = sinon.spy(signal, 'addEventListener');

    const provider = new Host.AidaClient.AidaClient();
    const call = provider.doConversation(
        Host.AidaClient.AidaClient.buildConsoleInsightsRequest('foo'),
        {signal},
    );

    let error;
    try {
      await call.next();
    } catch (err) {
      error = err;
    }

    assert.instanceOf(error, Host.AidaClient.AidaAbortError);
    sinon.assert.notCalled(addSpy);
  });

  describe('getAidaClientAvailability', () => {
    function mockGetSyncInformation(
        information: Host.InspectorFrontendHostAPI.SyncInformation,
        ): void {
      sinon
          .stub(
              Host.InspectorFrontendHost.InspectorFrontendHostInstance,
              'getSyncInformation',
              )
          .callsFake(cb => {
            cb(information);
          });
    }

    it('should return NO_INTERNET when navigator is not online', async () => {
      sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getOnLine').returns(false);

      const result = await Host.AidaClient.AidaClient.checkAccessPreconditions();
      assert.strictEqual(
          result,
          Host.AidaClient.AidaAccessPreconditions.NO_INTERNET,
      );
    });

    it('should return NO_ACCOUNT_EMAIL when the syncInfo doesn\'t contain accountEmail', async () => {
      mockGetSyncInformation({accountEmail: undefined, isSyncActive: true});

      const result = await Host.AidaClient.AidaClient.checkAccessPreconditions();

      assert.strictEqual(
          result,
          Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL,
      );
    });

    it('should return AVAILABLE when navigator is online, accountEmail exists and isSyncActive is true', async () => {
      mockGetSyncInformation({
        accountEmail: 'some-email',
        isSyncActive: true,
      });

      const result = await Host.AidaClient.AidaClient.checkAccessPreconditions();

      assert.strictEqual(
          result,
          Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      );
    });

    it('should return AVAILABLE when navigator is online, accountEmail exists and isSyncActive is false', async () => {
      mockGetSyncInformation({
        accountEmail: 'some-email',
        isSyncActive: false,
      });

      const result = await Host.AidaClient.AidaClient.checkAccessPreconditions();

      assert.strictEqual(
          result,
          Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      );
    });
  });

  describe('HostConfigTracker', () => {
    it('dispatches AIDA_AVAILABILITY_CHANGED with currentAidaAvailability', async () => {
      const universe = new TestUniverse();
      sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getOnLine').returns(true);
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'getSyncInformation').callsFake(cb => {
        cb({accountEmail: 'test@example.com', isSyncActive: true});
      });
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'getHostConfig').callsFake(cb => {
        cb({});
      });

      const tracker = universe.hostConfigTracker;
      let descriptor: Common.EventTarget.EventDescriptor<Host.AidaClient.EventTypes>|undefined;
      const availabilityPromise = new Promise<Host.AidaClient.AidaAccessPreconditions>(resolve => {
        descriptor = tracker.addEventListener(
            Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED,
            event => resolve(event.data),
        );
      });

      const availability = await availabilityPromise;
      assert.strictEqual(availability, Host.AidaClient.AidaAccessPreconditions.AVAILABLE);
      if (descriptor) {
        Common.EventTarget.removeEventListeners([descriptor]);
      }
    });
  });

  describe('registerClientEvent', () => {
    it('should populate the default value for Aida Client event', async () => {
      const stub = sinon.stub(
          Host.InspectorFrontendHost.InspectorFrontendHostInstance,
          'registerAidaClientEvent',
      );
      const RPC_ID = 0;

      const provider = new Host.AidaClient.AidaClient();
      void provider.registerClientEvent({
        corresponding_aida_rpc_global_id: RPC_ID,
        disable_user_content_logging: false,
        do_conversation_client_event: {
          user_feedback: {sentiment: Host.AidaClient.Rating.POSITIVE},
        },
      });
      const arg = JSON.parse(stub.getCalls()[0].args[0]);

      sinon.assert.match(
          arg,
          sinon.match({
            client: Host.AidaClient.CLIENT_NAME,
            event_time: sinon.match.string,
            corresponding_aida_rpc_global_id: RPC_ID,
            do_conversation_client_event: {
              user_feedback: {
                sentiment: 'POSITIVE',
              },
            },
          }),
      );
    });
  });

  describe('completeCode', () => {
    it('handles successful response', async () => {
      const mockResult: AidaCodeCompleteResult = {
        response: JSON.stringify({
          generatedSamples: [
            {
              generationString: 'console.log("hello");',
              score: 0.9,
              sampleId: 1,
              metadata: {
                attributionMetadata: {
                  attributionAction: 'CITE',
                  citations: [
                    {startIndex: 0, endIndex: 1, uri: 'https://example.com'},
                  ],
                },
              },
            },
          ],
          metadata: {
            rpcGlobalId: 456,
          },
        }),
      };
      sinon
          .stub(
              Host.InspectorFrontendHost.InspectorFrontendHostInstance,
              'aidaCodeComplete',
              )
          .callsArgWith(1, mockResult);

      const provider = new Host.AidaClient.AidaClient();
      const request: Host.AidaClient.CompletionRequest = {
        client: 'CHROME_DEVTOOLS',
        prefix: 'console.log("',
        metadata: {
          disable_user_content_logging: false,
          client_version: 'unit_test',
        },
      };
      const result = await provider.completeCode(request);

      assert.deepEqual(result, {
        generatedSamples: [
          {
            generationString: 'console.log("hello");',
            score: 0.9,
            sampleId: 1,
            attributionMetadata: {
              attributionAction: Host.AidaClient.RecitationAction.CITE,
              citations: [
                {startIndex: 0, endIndex: 1, uri: 'https://example.com'},
              ],
            },
          },
        ],
        metadata: {
          rpcGlobalId: 456,
        },
      });
    });

    it('throws on error from the host', async () => {
      sinon
          .stub(
              Host.InspectorFrontendHost.InspectorFrontendHostInstance,
              'aidaCodeComplete',
              )
          .callsArgWith(1, {
            error: 'Cannot get OAuth credentials',
            detail: '{\'@type\': \'type.googleapis.com/google.rpc.DebugInfo\', \'detail\': \'DETAILS\'}',
          });
      const provider = new Host.AidaClient.AidaClient();
      try {
        const request: Host.AidaClient.CompletionRequest = {
          client: 'CHROME_DEVTOOLS',
          prefix: 'console.log("',
          metadata: {
            disable_user_content_logging: false,
            client_version: 'unit_test',
          },
        };
        await provider.completeCode(request);
        assert.fail('should have thrown');
      } catch (err) {
        assert.strictEqual(
            (err as Error).message,
            'Cannot send request: Cannot get OAuth credentials {\'@type\': \'type.googleapis.com/google.rpc.DebugInfo\', \'detail\': \'DETAILS\'}',
        );
      }
    });

    it('throws on empty response from the host', async () => {
      sinon
          .stub(
              Host.InspectorFrontendHost.InspectorFrontendHostInstance,
              'aidaCodeComplete',
              )
          .callsArgWith(1, {
            response: '',
          });

      const provider = new Host.AidaClient.AidaClient();
      const request: Host.AidaClient.CompletionRequest = {
        client: 'CHROME_DEVTOOLS',
        prefix: 'console.log("',
        metadata: {
          disable_user_content_logging: false,
          client_version: 'unit_test',
        },
      };
      try {
        await provider.completeCode(request);
        assert.fail('should have thrown');
      } catch (err) {
        assert.strictEqual((err as Error).message, 'Empty response');
      }
    });
  });

  describe('getClientFeatureName', () => {
    it('returns the name for a valid ClientFeature', () => {
      assert.strictEqual(
          Host.AidaClient.getClientFeatureName(
              Host.AidaClient.ClientFeature.CHROME_CONSOLE_INSIGHTS,
              ),
          'CHROME_CONSOLE_INSIGHTS',
      );
      assert.strictEqual(
          Host.AidaClient.getClientFeatureName(
              Host.AidaClient.ClientFeature.CLIENT_FEATURE_UNSPECIFIED,
              ),
          'CLIENT_FEATURE_UNSPECIFIED',
      );
    });

    it('throws for an invalid ClientFeature', () => {
      assert.throws(
          () => Host.AidaClient.getClientFeatureName(
              1234 as Host.AidaClient.ClientFeature,
              ),
      );
    });
  });

  describe('mapError', () => {
    it('returns the same error if it is already an instance of AidaClientError', () => {
      const err = new Host.AidaClient.AidaQuotaError('quota exceeded');
      const mapped = Host.AidaClient.mapError(err);
      assert.strictEqual(mapped, err);
    });

    it('maps DispatchHttpRequestError status 429 to AidaQuotaError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE, {statusCode: 429, error: 'Error'});
      const mapped = Host.AidaClient.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaClient.AidaQuotaError);
    });

    it('maps DispatchHttpRequestError status 403 to AidaPermissionDeniedError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE, {statusCode: 403, error: 'Error'});
      const mapped = Host.AidaClient.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaClient.AidaPermissionDeniedError);
    });

    it('maps DispatchHttpRequestError timed out to AidaTimeoutError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE,
          {statusCode: 504, netErrorName: 'net::ERR_TIMED_OUT', error: 'Error'});
      const mapped = Host.AidaClient.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaClient.AidaTimeoutError);
    });

    it('maps DispatchHttpRequestError abort to AidaAbortError', () => {
      const httpError =
          new Host.DispatchHttpRequestClient.DispatchHttpRequestError(Host.DispatchHttpRequestClient.ErrorType.ABORT);
      const mapped = Host.AidaClient.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaClient.AidaAbortError);
    });

    it('maps general JSON errors containing quota to AidaQuotaError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE,
          {statusCode: 400, error: 'quota exceeded'});
      const mapped = Host.AidaClient.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaClient.AidaQuotaError);
    });

    it('maps general JSON errors containing payload size to AidaPayloadTooLargeError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE,
          {statusCode: 400, error: 'payload size exceeds the limit'});
      const mapped = Host.AidaClient.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaClient.AidaPayloadTooLargeError);
    });

    it('maps other DispatchHttpRequestError status codes to AidaUnknownError', () => {
      const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
          Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE, {statusCode: 500, error: 'Error'});
      const mapped = Host.AidaClient.mapError(httpError);
      assert.instanceOf(mapped, Host.AidaClient.AidaUnknownError);
    });

    it('maps string containing quota to AidaQuotaError', () => {
      const mapped = Host.AidaClient.mapError('RESOURCE_EXHAUSTED', 'quota exceeded');
      assert.instanceOf(mapped, Host.AidaClient.AidaQuotaError);
    });

    it('maps string containing payload size to AidaPayloadTooLargeError', () => {
      const mapped = Host.AidaClient.mapError('payload size exceeds the limit');
      assert.instanceOf(mapped, Host.AidaClient.AidaPayloadTooLargeError);
    });

    it('maps generic Error to AidaUnknownError', () => {
      const genericError = new Error('some other error');
      const mapped = Host.AidaClient.mapError(genericError);
      assert.instanceOf(mapped, Host.AidaClient.AidaUnknownError);
      assert.strictEqual(mapped.message, 'some other error');
    });

    it('maps DispatchHttpRequestError with status 200 and HTTP_RESPONSE_UNAVAILABLE to AidaInvalidJsonResponseError',
       () => {
         const httpError = new Host.DispatchHttpRequestClient.DispatchHttpRequestError(
             Host.DispatchHttpRequestClient.ErrorType.HTTP_RESPONSE_UNAVAILABLE,
             {statusCode: 200, response: 'invalid json'});
         const mapped = Host.AidaClient.mapError(httpError);
         assert.instanceOf(mapped, Host.AidaClient.AidaInvalidJsonResponseError);
         assert.strictEqual(mapped.message, 'Server responded with invalid JSON');
         assert.strictEqual(mapped.cause, httpError);
       });
  });

  describe('with GCA client enabled', () => {
    let provider: Host.AidaClient.AidaClient;

    beforeEach(() => {
      updateHostConfig({
        devToolsUseGcaApi: {
          enabled: true,
        },
      });
      provider = new Host.AidaClient.AidaClient();
    });

    it('completeCode throws AidaPermissionDeniedError on 403', async () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest').callsArgWith(1, {
        statusCode: 403,
      });
      let threw = false;
      try {
        await provider.completeCode(
            {client: 'test', prefix: 'test', metadata: {disable_user_content_logging: true, client_version: '1.2.3'}});
      } catch (err) {
        threw = true;
        assert.instanceOf(err, Host.AidaClient.AidaPermissionDeniedError);
      }
      assert.isTrue(threw, 'completeCode did not throw');
    });

    it('generateCode throws AidaQuotaError on 429', async () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest').callsArgWith(1, {
        statusCode: 429,
      });
      let threw = false;
      try {
        await provider.generateCode({
          client: 'test',
          preamble: 'test',
          current_message: {parts: [{text: 'test'}], role: Host.AidaClient.Role.USER},
          use_case: Host.AidaClient.UseCase.CODE_GENERATION,
          metadata: {disable_user_content_logging: true, client_version: '1.2.3'},
        });
      } catch (err) {
        threw = true;
        assert.instanceOf(err, Host.AidaClient.AidaQuotaError);
      }
      assert.isTrue(threw, 'generateCode did not throw');
    });
  });

});
