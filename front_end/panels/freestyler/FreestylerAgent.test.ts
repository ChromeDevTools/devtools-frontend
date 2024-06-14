// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Root from '../../core/root/root.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Freestyler from './FreestylerAgent.js';

const {FreestylerAgent} = Freestyler;

describeWithEnvironment('FreestylerAgent', () => {
  function mockHostConfig(modelId?: string) {
    sinon.stub(Common.Settings.Settings.instance(), 'getHostConfig').returns({
      devToolsConsoleInsights: {
        enabled: false,
        aidaTemperature: 0.2,
        aidaModelId: modelId,
      } as Root.Runtime.HostConfigConsoleInsights,
      devToolsConsoleInsightsDogfood: {
        enabled: false,
        aidaTemperature: 0.3,
        aidaModelId: modelId,
      } as Root.Runtime.HostConfigConsoleInsightsDogfood,
    });
  }
  describe('parseResponse', () => {
    it('parses a thought', async () => {
      const payload = 'some response';
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`THOUGHT: ${payload}`), {
        action: undefined,
        thought: payload,
        answer: undefined,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`   THOUGHT: ${payload}`), {
        action: undefined,
        thought: payload,
        answer: undefined,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`Something\n   THOUGHT: ${payload}`), {
        action: undefined,
        thought: payload,
        answer: undefined,
      });
    });
    it('parses a answer', async () => {
      const payload = 'some response';
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`ANSWER: ${payload}`), {
        action: undefined,
        thought: undefined,
        answer: payload,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`   ANSWER: ${payload}`), {
        action: undefined,
        thought: undefined,
        answer: payload,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`Something\n   ANSWER: ${payload}`), {
        action: undefined,
        thought: undefined,
        answer: payload,
      });
    });
    it('parses a multiline answer', async () => {
      const payload = `a
b
c`;
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`ANSWER: ${payload}`), {
        action: undefined,
        thought: undefined,
        answer: payload,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`   ANSWER: ${payload}`), {
        action: undefined,
        thought: undefined,
        answer: payload,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`Something\n   ANSWER: ${payload}`), {
        action: undefined,
        thought: undefined,
        answer: payload,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`ANSWER: ${payload}\nTHOUGHT: thought`), {
        action: undefined,
        thought: 'thought',
        answer: payload,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`ANSWER: ${payload}\nOBSERVATION: observation`), {
        action: undefined,
        thought: undefined,
        answer: payload,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`ANSWER: ${payload}\nACTION\naction\nSTOP`), {
        action: 'action',
        thought: undefined,
        answer: payload,
      });
    });
    it('parses an action', async () => {
      const payload = `const data = {
  someKey: "value",
}`;
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`ACTION\n${payload}\nSTOP`), {
        action: payload,
        thought: undefined,
        answer: undefined,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`ACTION\n${payload}`), {
        action: payload,
        thought: undefined,
        answer: undefined,
      });
      assert.deepStrictEqual(FreestylerAgent.parseResponse(`ACTION\n\n${payload}\n\nSTOP`), {
        action: payload,
        thought: undefined,
        answer: undefined,
      });
    });

    it('parses a thought and an action', async () => {
      const actionPayload = `const data = {
  someKey: "value",
}`;
      const thoughtPayload = 'thought';
      assert.deepStrictEqual(
          FreestylerAgent.parseResponse(`THOUGHT:${thoughtPayload}\nACTION\n${actionPayload}\nSTOP`), {
            action: actionPayload,
            thought: thoughtPayload,
            answer: undefined,
          });
    });
  });

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.restore();
    });

    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      assert.strictEqual(FreestylerAgent.buildRequest('test input').options?.model_id, 'test model');
    });

    it('builds a request with input', async () => {
      mockHostConfig();
      const request = FreestylerAgent.buildRequest('test input');
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, undefined);
      assert.strictEqual(request.chat_history, undefined);
    });

    it('builds a request with preamble', async () => {
      mockHostConfig();
      const request = FreestylerAgent.buildRequest('test input', 'preamble');
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, 'preamble');
      assert.strictEqual(request.chat_history, undefined);
    });

    it('builds a request with chat history', async () => {
      mockHostConfig();
      const request = FreestylerAgent.buildRequest('test input', undefined, [
        {
          text: 'test',
          entity: Host.AidaClient.Entity.USER,
        },
      ]);
      assert.strictEqual(request.input, 'test input');
      assert.strictEqual(request.preamble, undefined);
      assert.deepStrictEqual(request.chat_history, [
        {
          'text': 'test',
          'entity': 1,
        },
      ]);
    });

    it('structure matches the snapshot', () => {
      mockHostConfig('test model');
      assert.deepStrictEqual(
          FreestylerAgent.buildRequest(
              'test input', 'preamble',
              [
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
              ]),
          {
            input: 'test input',
            client: 'CHROME_DEVTOOLS',
            preamble: 'preamble',
            chat_history: [
              {
                'entity': 0,
                'text': 'first',
              },
              {
                'entity': 2,
                'text': 'second',
              },
              {
                'entity': 1,
                'text': 'third',
              },
            ],
            metadata: {
              disable_user_content_logging: true,
            },
            options: {
              model_id: 'test model',
              temperature: 0,
            },
          });
    });
  });
});
