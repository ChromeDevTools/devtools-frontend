// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import {createUISourceCode, mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {} from '../../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';
import {FileAgent, FileContext, ResponseType} from '../ai_assistance.js';

describeWithMockConnection('FileAgent', () => {
  function mockHostConfig(modelId?: string, temperature?: number) {
    Object.assign(Root.Runtime.hostConfig, {
      devToolsAiAssistanceFileAgent: {
        modelId,
        temperature,
      },
    });
  }

  beforeEach(() => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
    });
    Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew: true, debuggerWorkspaceBinding});
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.restore();
    });

    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      const agent = new FileAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.model_id,
          'test model',
      );
    });

    it('builds a request with a temperature', async () => {
      mockHostConfig('test model', 1);
      const agent = new FileAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER).options?.temperature,
          1,
      );
    });

    it('structure matches the snapshot', async () => {
      mockHostConfig('test model');
      sinon.stub(crypto, 'randomUUID').returns('sessionId' as `${string}-${string}-${string}-${string}-${string}`);
      const agent = new FileAgent({
        aidaClient: mockAidaClient([[{explanation: 'answer'}]]),
        serverSideLoggingEnabled: true,
      });
      sinon.stub(agent, 'preamble').value('preamble');
      await Array.fromAsync(agent.run('question', {selected: null}));

      assert.deepEqual(
          agent.buildRequest({text: 'test input'}, Host.AidaClient.Role.USER),
          {
            current_message: {parts: [{text: 'test input'}], role: Host.AidaClient.Role.USER},
            client: 'CHROME_DEVTOOLS',
            preamble: 'preamble',
            historical_contexts: [
              {
                role: 1,
                parts: [{text: 'question'}],
              },
              {
                role: 2,
                parts: [{text: 'answer'}],
              },
            ],
            metadata: {
              disable_user_content_logging: false,
              string_session_id: 'sessionId',
              user_tier: 2,
            },
            options: {
              model_id: 'test model',
              temperature: undefined,
            },
            client_feature: 9,
            functionality_type: 1,
          },
      );
    });
  });

  describe('run', () => {
    const testArguments = [
      {
        name: 'content loaded',
        requestContentData: true,
      },
      {
        name: 'content not loaded',
        requestContentData: false,
      },
    ];

    testArguments.forEach(args => {
      it('generates an answer ' + args.name, async () => {
        const agent = new FileAgent({
          aidaClient: mockAidaClient([[{
            explanation: 'This is the answer',
            metadata: {
              rpcGlobalId: 123,
            },
          }]]),
        });

        const uiSourceCode = await createUISourceCode({
          requestContentData: args.requestContentData,
          content: 'content',
        });
        const responses =
            await Array.fromAsync(agent.run('test', {selected: uiSourceCode ? new FileContext(uiSourceCode) : null}));

        assert.deepEqual(responses, [
          {
            type: ResponseType.USER_QUERY,
            query: 'test',
          },
          {
            type: ResponseType.CONTEXT,
            title: 'Analyzing file',
            details: [
              {
                title: 'Selected file',
                text: `File name: script.js
URL: http://example.test/script.js
File content:
\`\`\`
content
\`\`\``,
              },
            ],
          },
          {
            type: ResponseType.QUERYING,
            //             query: `# Selected file
            // File name: script.js
            // URL: http://example.test/script.js
            // File content:
            // \`\`\`
            // content
            // \`\`\`

            // # User request

            // test`,
          },
          {
            type: ResponseType.ANSWER,
            text: 'This is the answer',
            suggestions: undefined,
            rpcId: 123,
          },
        ]);

        assert.deepEqual(agent.buildRequest({text: ''}, Host.AidaClient.Role.USER).historical_contexts, [
          {
            role: 1,
            parts: [{
              text: `# Selected file
File name: script.js
URL: http://example.test/script.js
File content:
\`\`\`
content
\`\`\`

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
});
