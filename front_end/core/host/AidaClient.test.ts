// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
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

type AidaCodeCompleteResult = Host.InspectorFrontendHostAPI.AidaCodeCompleteResult;
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
                usageMetadata: {
                  promptTokenCount: 150,
                  candidatesTokenCount: 25,
                  totalTokenCount: 175,
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
          usageMetadata: {
            promptTokenCount: 150,
            candidatesTokenCount: 25,
            totalTokenCount: 175,
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
          usageMetadata: {
            promptTokenCount: 150,
            candidatesTokenCount: 25,
            totalTokenCount: 175,
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

    it('doConversation rejects with AidaQuotaError when receiving streamed GCA error chunk', async () => {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
          .callsFake(async (request, callback) => {
            assert.isDefined(request.streamId);
            const streamId = request.streamId;
            await new Promise(resolve => setTimeout(resolve, 0));
            Host.ResourceLoader.streamWrite(
                streamId,
                JSON.stringify([{
                  error: {
                    code: 429,
                    message: 'You have exhausted your capacity on this model.',
                    status: 'RESOURCE_EXHAUSTED',
                  },
                }]),
            );
            callback({statusCode: 200, response: ''});
          });

      try {
        await getAllResults(provider);
        assert.fail('doConversation did not throw');
      } catch (err) {
        assert.instanceOf(err, Host.AidaClient.AidaQuotaError);
      }
    });
  });

  describe('debugLog', () => {
    it('logs to console only when devToolsAiDebug has gca enabled', () => {
      const store = new Map<string, string>();
      sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getLocalStorage').returns({
        getItem: (key: string) => store.get(key) ?? null,
      } as Storage);
      const consoleLogStub = sinon.stub(console, 'log');

      Host.AidaClient.debugLog('hidden message');
      sinon.assert.notCalled(consoleLogStub);

      store.set('devToolsAiDebug', JSON.stringify({assistance: false, gca: true, codeGenComplete: false}));
      Host.AidaClient.debugLog('visible message');
      sinon.assert.calledOnceWithExactly(consoleLogStub, 'visible message');
    });
  });

  describe('RequestResult UMA histograms', () => {
    const {EnumeratedHistogram} = Host.InspectorFrontendHostAPI;
    const {AiClientRequestResult} = Host.UserMetrics;

    function buildConversationRequest(clientFeature: Host.AidaClient.ClientFeature):
        Host.AidaClient.DoConversationRequest {
      return {
        current_message: {parts: [{text: 'hello'}], role: Host.AidaClient.Role.USER},
        client: Host.AidaClient.CLIENT_NAME,
        functionality_type: Host.AidaClient.FunctionalityType.CHAT,
        client_feature: clientFeature,
        metadata: {
          disable_user_content_logging: true,
          client_version: 'unit_test',
        },
      };
    }

    function buildCompletionRequest(): Host.AidaClient.CompletionRequest {
      return {
        client: Host.AidaClient.CLIENT_NAME,
        prefix: 'const x = ',
        metadata: {disable_user_content_logging: true, client_version: 'unit_test'},
      };
    }

    function buildGenerateCodeRequest(): Host.AidaClient.GenerateCodeRequest {
      return {
        client: Host.AidaClient.CLIENT_NAME,
        preamble: 'preamble',
        current_message: {parts: [{text: 'generate'}], role: Host.AidaClient.Role.USER},
        use_case: Host.AidaClient.UseCase.CODE_GENERATION,
        metadata: {disable_user_content_logging: true, client_version: 'unit_test'},
      };
    }

    function stubSingleChunkConversation(chunkPayload: string): void {
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
          .callsFake((request, callback) => {
            const streamId = request.streamId;
            assert.isDefined(streamId);
            queueMicrotask(() => {
              Host.ResourceLoader.streamWrite(streamId, chunkPayload);
              callback({statusCode: 200, response: ''});
            });
          });
    }

    function recordedCalls(
        spy: sinon.SinonSpy<[Host.InspectorFrontendHostAPI.EnumeratedHistogram, number, number], void>):
        Array<[Host.InspectorFrontendHostAPI.EnumeratedHistogram, number, number]> {
      return spy.getCalls().map(call => call.args);
    }

    it('records aggregate and AiAssistance histograms once on multi-chunk doConversation success', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      let capturedStreamId: number|undefined;
      let capturedCallback: ((result: Host.InspectorFrontendHostAPI.DispatchHttpRequestResult) => void)|undefined;
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
          .callsFake((request, callback) => {
            capturedStreamId = request.streamId;
            capturedCallback = callback;
          });

      const provider = new Host.AidaClient.AidaClient();
      const conversation =
          provider.doConversation(buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT));

      const firstNext = conversation.next();
      assert.isDefined(capturedStreamId);
      assert.isDefined(capturedCallback);
      Host.ResourceLoader.streamWrite(capturedStreamId, JSON.stringify([{textChunk: {text: 'part 1 '}}]));
      const firstResult = await firstNext;

      const secondNext = conversation.next();
      Host.ResourceLoader.streamWrite(capturedStreamId, JSON.stringify([{textChunk: {text: 'part 2'}}]));
      const secondResult = await secondNext;

      const finalNext = conversation.next();
      capturedCallback({statusCode: 200, response: ''});
      const finalResult = await finalNext;

      const doneResult = await conversation.next();

      assert.strictEqual(firstResult.value?.explanation, 'part 1 ');
      assert.strictEqual(secondResult.value?.explanation, 'part 1 part 2');
      assert.strictEqual(finalResult.value?.explanation, 'part 1 part 2');
      assert.isTrue(finalResult.value?.completed);
      assert.isTrue(doneResult.done);

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.SUCCESS, AiClientRequestResult.MAX_VALUE],
        [
          EnumeratedHistogram.AiClientRequestResultAiAssistance,
          AiClientRequestResult.SUCCESS,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('routes ConsoleInsights conversations to the ConsoleInsights surface slice', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      stubSingleChunkConversation(JSON.stringify([{textChunk: {text: 'ok'}}]));

      const provider = new Host.AidaClient.AidaClient();
      for await (const chunk of provider.doConversation(
          buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_CONSOLE_INSIGHTS))) {
        void chunk;
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.SUCCESS, AiClientRequestResult.MAX_VALUE],
        [
          EnumeratedHistogram.AiClientRequestResultConsoleInsights,
          AiClientRequestResult.SUCCESS,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('routes ConversationSummary conversations to the ConversationSummary surface slice', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      stubSingleChunkConversation(JSON.stringify([{textChunk: {text: 'ok'}}]));

      const provider = new Host.AidaClient.AidaClient();
      for await (const chunk of provider.doConversation(
          buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_CONVERSATION_SUMMARY_AGENT))) {
        void chunk;
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.SUCCESS, AiClientRequestResult.MAX_VALUE],
        [
          EnumeratedHistogram.AiClientRequestResultConversationSummary,
          AiClientRequestResult.SUCCESS,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('routes PerformanceAnnotations conversations to the PerformanceAnnotations surface slice', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      stubSingleChunkConversation(JSON.stringify([{textChunk: {text: 'ok'}}]));

      const provider = new Host.AidaClient.AidaClient();
      for await (const chunk of provider.doConversation(
          buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_PERFORMANCE_ANNOTATIONS_AGENT))) {
        void chunk;
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.SUCCESS, AiClientRequestResult.MAX_VALUE],
        [
          EnumeratedHistogram.AiClientRequestResultPerformanceAnnotations,
          AiClientRequestResult.SUCCESS,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records only the aggregate histogram for legacy V1 conversation features', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      stubSingleChunkConversation(JSON.stringify([{textChunk: {text: 'ok'}}]));

      const provider = new Host.AidaClient.AidaClient();
      for await (const chunk of provider.doConversation(
          buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_STYLING_AGENT))) {
        void chunk;
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.SUCCESS, AiClientRequestResult.MAX_VALUE],
      ]);
    });

    it('records ABORTED once when doConversation receives an already-aborted signal', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      const provider = new Host.AidaClient.AidaClient();
      const preAborted = new AbortController();
      preAborted.abort();

      try {
        await provider
            .doConversation(buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT),
                            {signal: preAborted.signal})
            .next();
        assert.fail('expected AidaAbortError');
      } catch (err) {
        assert.instanceOf(err, Host.AidaClient.AidaAbortError);
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.ABORTED, AiClientRequestResult.MAX_VALUE],
        [
          EnumeratedHistogram.AiClientRequestResultAiAssistance,
          AiClientRequestResult.ABORTED,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records ABORTED once when doConversation is aborted mid-stream', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest').callsFake(() => {});
      const provider = new Host.AidaClient.AidaClient();
      const midStreamAbort = new AbortController();

      const pendingStream =
          provider.doConversation(buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT),
                                  {signal: midStreamAbort.signal});
      const nextChunk = pendingStream.next();
      midStreamAbort.abort();
      try {
        await nextChunk;
        assert.fail('expected AidaAbortError');
      } catch (err) {
        assert.instanceOf(err, Host.AidaClient.AidaAbortError);
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.ABORTED, AiClientRequestResult.MAX_VALUE],
        [
          EnumeratedHistogram.AiClientRequestResultAiAssistance,
          AiClientRequestResult.ABORTED,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records ABORTED once when a caller exits the doConversation generator early', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest').callsFake(httpReq => {
        const streamId = httpReq.streamId;
        assert.isDefined(streamId);
        queueMicrotask(() => {
          Host.ResourceLoader.streamWrite(streamId, JSON.stringify([{textChunk: {text: 'chunk 1'}}]));
        });
      });

      const provider = new Host.AidaClient.AidaClient();
      const earlyStream =
          provider.doConversation(buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT));
      const {value: firstChunk, done} = await earlyStream.next();
      assert.isFalse(done);
      assert.exists(firstChunk);
      assert.isFalse(firstChunk.completed);
      await earlyStream.return();

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.ABORTED, AiClientRequestResult.MAX_VALUE],
        [
          EnumeratedHistogram.AiClientRequestResultAiAssistance,
          AiClientRequestResult.ABORTED,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records STREAM_CHUNK_PARSE_ERROR when doConversation receives malformed chunk JSON', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      stubSingleChunkConversation('{not valid json');

      const provider = new Host.AidaClient.AidaClient();
      try {
        for await (const chunk of provider.doConversation(
            buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT))) {
          void chunk;
        }
        assert.fail('expected chunk parse error');
      } catch (err) {
        assert.instanceOf(err, Host.AidaErrors.StreamChunkParseError);
        assert.match(err.message, /^Cannot parse chunk:/);
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [
          EnumeratedHistogram.AiClientRequestResult,
          AiClientRequestResult.STREAM_CHUNK_PARSE_ERROR,
          AiClientRequestResult.MAX_VALUE,
        ],
        [
          EnumeratedHistogram.AiClientRequestResultAiAssistance,
          AiClientRequestResult.STREAM_CHUNK_PARSE_ERROR,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records BLOCKED_BY_SAFETY_OR_RECITATION when doConversation receives a recitation block', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      stubSingleChunkConversation(JSON.stringify([{
        textChunk: {text: 'blocked'},
        metadata: {rpcGlobalId: 1, attributionMetadata: {attributionAction: 'BLOCK', citations: []}},
      }]));

      const provider = new Host.AidaClient.AidaClient();
      try {
        for await (const chunk of provider.doConversation(
            buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT))) {
          void chunk;
        }
        assert.fail('expected AidaBlockError');
      } catch (err) {
        assert.instanceOf(err, Host.AidaClient.AidaBlockError);
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [
          EnumeratedHistogram.AiClientRequestResult,
          AiClientRequestResult.BLOCKED_BY_SAFETY_OR_RECITATION,
          AiClientRequestResult.MAX_VALUE,
        ],
        [
          EnumeratedHistogram.AiClientRequestResultAiAssistance,
          AiClientRequestResult.BLOCKED_BY_SAFETY_OR_RECITATION,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records HTTP_5XX_SERVER_ERROR when doConversation fails with HTTP 500', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
          .callsArgWith(1, {statusCode: 500, error: 'Request failed'});

      const provider = new Host.AidaClient.AidaClient();
      try {
        for await (const chunk of provider.doConversation(
            buildConversationRequest(Host.AidaClient.ClientFeature.CHROME_DEVTOOLS_V2_AGENT))) {
          void chunk;
        }
        assert.fail('expected HTTP 500 error');
      } catch (err) {
        assert.instanceOf(err, Host.AidaClient.AidaUnknownError);
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [
          EnumeratedHistogram.AiClientRequestResult,
          AiClientRequestResult.HTTP_5XX_SERVER_ERROR,
          AiClientRequestResult.MAX_VALUE,
        ],
        [
          EnumeratedHistogram.AiClientRequestResultAiAssistance,
          AiClientRequestResult.HTTP_5XX_SERVER_ERROR,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records CodeComplete SUCCESS when completeCode returns generated samples', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'aidaCodeComplete').callsArgWith(1, {
        response: JSON.stringify({generatedSamples: [{generationString: '1;', score: 1, sampleId: 0}]}),
      });

      const provider = new Host.AidaClient.AidaClient();
      await provider.completeCode(buildCompletionRequest());

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.SUCCESS, AiClientRequestResult.MAX_VALUE],
        [
          EnumeratedHistogram.AiClientRequestResultCodeComplete,
          AiClientRequestResult.SUCCESS,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records CodeComplete SUCCESS when completeCode omits generatedSamples', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'aidaCodeComplete').callsArgWith(1, {
        response: JSON.stringify({metadata: {rpcGlobalId: 9}}),
      });

      const provider = new Host.AidaClient.AidaClient();
      assert.isNull(await provider.completeCode(buildCompletionRequest()));

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.SUCCESS, AiClientRequestResult.MAX_VALUE],
        [
          EnumeratedHistogram.AiClientRequestResultCodeComplete,
          AiClientRequestResult.SUCCESS,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records CodeComplete OAUTH_TOKEN_ERROR when completeCode fails credential lookup', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'aidaCodeComplete').callsArgWith(1, {
        error: 'Cannot get OAuth credentials',
      });

      const provider = new Host.AidaClient.AidaClient();
      try {
        await provider.completeCode(buildCompletionRequest());
        assert.fail('expected OAuth error');
      } catch (err) {
        assert.instanceOf(err, Host.AidaClient.AidaUnknownError);
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [
          EnumeratedHistogram.AiClientRequestResult,
          AiClientRequestResult.OAUTH_TOKEN_ERROR,
          AiClientRequestResult.MAX_VALUE,
        ],
        [
          EnumeratedHistogram.AiClientRequestResultCodeComplete,
          AiClientRequestResult.OAUTH_TOKEN_ERROR,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records CodeComplete INVALID_JSON_RESPONSE when completeCode returns malformed JSON', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'aidaCodeComplete').callsArgWith(1, {
        response: '{bad json',
      });

      const provider = new Host.AidaClient.AidaClient();
      try {
        await provider.completeCode(buildCompletionRequest());
        assert.fail('expected invalid JSON error');
      } catch (err) {
        assert.instanceOf(err, Error);
        assert.match(err.message, /^Cannot parse response:/);
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [
          EnumeratedHistogram.AiClientRequestResult,
          AiClientRequestResult.INVALID_JSON_RESPONSE,
          AiClientRequestResult.MAX_VALUE,
        ],
        [
          EnumeratedHistogram.AiClientRequestResultCodeComplete,
          AiClientRequestResult.INVALID_JSON_RESPONSE,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records CodeGenerate SUCCESS when generateCode succeeds', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
          .callsArgWith(1, {statusCode: 200, response: JSON.stringify({samples: [], metadata: {}})});

      const provider = new Host.AidaClient.AidaClient();
      await provider.generateCode(buildGenerateCodeRequest());

      assert.deepEqual(recordedCalls(histogramSpy), [
        [EnumeratedHistogram.AiClientRequestResult, AiClientRequestResult.SUCCESS, AiClientRequestResult.MAX_VALUE],
        [
          EnumeratedHistogram.AiClientRequestResultCodeGenerate,
          AiClientRequestResult.SUCCESS,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });

    it('records CodeGenerate HTTP_401_UNAUTHORIZED when generateCode fails with HTTP 401', async () => {
      const histogramSpy =
          sinon.spy(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'recordEnumeratedHistogram');
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'dispatchHttpRequest')
          .callsArgWith(1, {statusCode: 401, error: 'Request failed'});

      const provider = new Host.AidaClient.AidaClient();
      try {
        await provider.generateCode(buildGenerateCodeRequest());
        assert.fail('expected HTTP 401 error');
      } catch (err) {
        assert.instanceOf(err, Host.AidaClient.AidaUnknownError);
      }

      assert.deepEqual(recordedCalls(histogramSpy), [
        [
          EnumeratedHistogram.AiClientRequestResult,
          AiClientRequestResult.HTTP_401_UNAUTHORIZED,
          AiClientRequestResult.MAX_VALUE,
        ],
        [
          EnumeratedHistogram.AiClientRequestResultCodeGenerate,
          AiClientRequestResult.HTTP_401_UNAUTHORIZED,
          AiClientRequestResult.MAX_VALUE,
        ],
      ]);
    });
  });

});
