// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  createTarget,
  getGetHostConfigStub,
} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {loadBasicSourceMapExample} from '../../testing/SourceMapHelpers.js';
import {createContentProviderUISourceCodes} from '../../testing/UISourceCodeHelpers.js';

import {DrJonesFileAgent, FileContext, formatSourceMapDetails, ResponseType} from './freestyler.js';

describeWithMockConnection('DrJonesFileAgent', () => {
  function mockHostConfig(modelId?: string, temperature?: number) {
    getGetHostConfigStub({
      devToolsAiAssistanceFileAgent: {
        modelId,
        temperature,
      },
    });
  }

  function mockAidaClient(
      fetch: () => AsyncGenerator<Host.AidaClient.AidaResponse, void, void>,
      ): Host.AidaClient.AidaClient {
    return {
      fetch,
      registerClientEvent: () => Promise.resolve({}),
    };
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

  describe('buildRequest', () => {
    beforeEach(() => {
      sinon.restore();
    });

    it('builds a request with a model id', async () => {
      mockHostConfig('test model');
      const agent = new DrJonesFileAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({input: 'test input'}).options?.model_id,
          'test model',
      );
    });

    it('builds a request with a temperature', async () => {
      mockHostConfig('test model', 1);
      const agent = new DrJonesFileAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
      });
      assert.strictEqual(
          agent.buildRequest({input: 'test input'}).options?.temperature,
          1,
      );
    });

    it('structure matches the snapshot', () => {
      mockHostConfig('test model');
      sinon.stub(crypto, 'randomUUID').returns('sessionId' as `${string}-${string}-${string}-${string}-${string}`);
      const agent = new DrJonesFileAgent({
        aidaClient: {} as Host.AidaClient.AidaClient,
        serverSideLoggingEnabled: true,
      });
      sinon.stub(agent, 'preamble').value('preamble');
      agent.chatNewHistoryForTesting = new Map([
        [
          0,
          [
            {
              type: ResponseType.QUERYING,
              query: 'question',
            },
            {
              type: ResponseType.ANSWER,
              text: 'answer',
            },
          ],
        ],
      ]);
      assert.deepStrictEqual(
          agent.buildRequest({
            input: 'test input',
          }),
          {
            input: 'test input',
            client: 'CHROME_DEVTOOLS',
            preamble: 'preamble',
            chat_history: [
              {
                entity: 1,
                text: 'question',
              },
              {
                entity: 2,
                text: 'answer',
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

      const agent = new DrJonesFileAgent({
        aidaClient: mockAidaClient(generateAnswer),
      });

      const url = 'http://example.com/script.js' as Platform.DevToolsPath.UrlString;
      const {project} = createContentProviderUISourceCodes({
        items: [
          {
            url,
            mimeType: 'application/javascript',
            resourceType: Common.ResourceType.resourceTypes.Script,
          },
        ],
        target: createTarget(),
      });

      const uiSourceCode = project.uiSourceCodeForURL(url);
      const responses =
          await Array.fromAsync(agent.run('test', {selected: uiSourceCode ? new FileContext(uiSourceCode) : null}));

      assert.deepStrictEqual(responses, [
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
              text: `File Name: script.js
URL: http://example.com/script.js\n
File Content:\n\`\`\`
\`\`\``,
            },
          ],
        },
        {
          type: ResponseType.QUERYING,
          query:
              '# Selected file\nFile Name: script.js\nURL: http://example.com/script.js\n\nFile Content:\n\`\`\`\n\`\`\`\n\n# User request\n\ntest',
        },
        {
          type: ResponseType.ANSWER,
          text: 'This is the answer',
          suggestions: undefined,
          rpcId: 123,
        },
      ]);

      assert.deepStrictEqual(agent.chatHistoryForTesting, [
        {
          entity: 1,
          text: `# Selected file\nFile Name: script.js
URL: http://example.com/script.js\n
File Content:\n\`\`\`\n\`\`\`\n\n# User request\n\ntest`,
        },
        {
          entity: 2,
          text: 'This is the answer',
        },
      ]);
    });
  });

  describe('formatSourceMapDetails', () => {
    it('returns source map', async () => {
      const target = createTarget();
      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);

      const script = (await loadBasicSourceMapExample(target)).script;
      const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const response = formatSourceMapDetails(uiSourceCode, debuggerWorkspaceBinding);
      assert.strictEqual(response, 'Source map: file://gen.js.map');
    });
  });
});
