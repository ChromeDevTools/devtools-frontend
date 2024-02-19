// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../../../front_end/core/host/host.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as Explain from '../../../../../front_end/panels/explain/explain.js';

const {assert} = chai;

const TEST_MODEL_ID = 'testModelId';

describe('InsightProvider', () => {
  it('adds no model temperature if there is no aidaTemperature query param', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaTemperature').returns(null);
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
    });
    stub.restore();
  });

  it('adds a model temperature', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaTemperature').returns('0.5');
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      options: {
        temperature: 0.5,
      },
    });
    stub.restore();
  });

  it('adds a model temperature of 0', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaTemperature').returns('0');
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      options: {
        temperature: 0,
      },
    });
    stub.restore();
  });

  it('adds no model temperature if the aidaTemperature query param cannot be parsed into a float', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaTemperature').returns('not a number');
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
    });
    stub.restore();
  });

  it('adds no model id if there is no aidaModelId query param', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaModelId').returns(null);
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
    });
    stub.restore();
  });

  it('adds a model id', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaModelId').returns(TEST_MODEL_ID);
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      options: {
        model_id: TEST_MODEL_ID,
      },
    });
    stub.restore();
  });

  it('adds a model id and temperature', () => {
    const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
    stub.withArgs('aidaModelId').returns(TEST_MODEL_ID);
    stub.withArgs('aidaTemperature').returns('0.5');
    const request = Explain.InsightProvider.buildApiRequest('foo');
    assert.deepStrictEqual(request, {
      input: 'foo',
      client: 'CHROME_DEVTOOLS',
      options: {
        model_id: TEST_MODEL_ID,
        temperature: 0.5,
      },
    });
    stub.restore();
  });

  async function getAllResults(provider: Explain.InsightProvider): Promise<string[]> {
    const results = [];
    for await (const result of provider.getInsights('foo')) {
      results.push(result);
    }
    return results;
  }

  it('handles chunked response', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation')
        .callsFake(async (_, streamId, callback) => {
          const response = JSON.stringify([
            {textChunk: {text: 'hello '}},
            {textChunk: {text: 'brave '}},
            {textChunk: {text: 'new world!'}},
          ]);
          for (const chunk of response.split(',')) {
            await new Promise(resolve => setTimeout(resolve, 0));
            Host.ResourceLoader.streamWrite(streamId, chunk);
          }
          callback({statusCode: 200});
        });

    const provider = new Explain.InsightProvider();
    const results = await getAllResults(provider);
    assert.deepStrictEqual(results, ['hello ', 'hello brave ', 'hello brave new world!']);
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

    const provider = new Explain.InsightProvider();
    const results = await getAllResults(provider);
    assert.deepStrictEqual(
        results, ['hello ', 'hello \n`````\nbrave \n`````\n', 'hello \n`````\nbrave new World()\n`````\n']);
  });

  it('throws a readable error on 403', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation').callsArgWith(2, {
      'statusCode': 403,
    });
    const provider = new Explain.InsightProvider();
    try {
      await getAllResults(provider);
      expect.fail('provider.getInsights did not throw');
    } catch (err) {
      expect(err.message).equals('Server responded: permission denied');
    }
  });

  it('throws an error for other codes', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation').callsArgWith(2, {
      'statusCode': 418,
    });
    const provider = new Explain.InsightProvider();
    try {
      await getAllResults(provider);
      expect.fail('provider.getInsights did not throw');
    } catch (err) {
      expect(err.message).equals('Request failed: {"statusCode":418}');
    }
  });

  it('throws an error with all details for other failures', async () => {
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'doAidaConversation').callsArgWith(2, {
      'error': 'Cannot get OAuth credentials',
      'detail': '{\'@type\': \'type.googleapis.com/google.rpc.DebugInfo\', \'detail\': \'DETAILS\'}',
    });
    const provider = new Explain.InsightProvider();
    try {
      await getAllResults(provider);
      expect.fail('provider.getInsights did not throw');
    } catch (err) {
      expect(err.message)
          .equals(
              'Cannot send request: Cannot get OAuth credentials {\'@type\': \'type.googleapis.com/google.rpc.DebugInfo\', \'detail\': \'DETAILS\'}');
    }
  });
});
