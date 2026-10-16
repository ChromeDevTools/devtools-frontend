
// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {createUISourceCode} from '../../../testing/AiAssistanceHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {createNetworkRequest, stubInitiatorGraph} from '../../../testing/NetworkRequestHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {loadBasicSourceMapExample} from '../../../testing/SourceMapHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import * as Bindings from '../../bindings/bindings.js';
import * as Formatter from '../../formatter/formatter.js';
import * as Logs from '../../logs/logs.js';
import * as Workspace from '../../workspace/workspace.js';
import {FileFormatter} from '../ai_assistance.js';

describe('FileFormatter', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(universe.workspace);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);
    sinon.stub(Logs.NetworkLog.NetworkLog, 'instance').returns(universe.networkLog);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
  });

  afterEach(() => {
    // Loading a source map starts a formatter worker, which keeps the Node
    // test process alive unless the pool is disposed.
    Formatter.FormatterWorkerPool.FormatterWorkerPool.removeInstance();
  });

  describe('formatSourceMapDetails', () => {
    it('returns source map', async () => {
      // TODO: source map needs to be tested as part of the
      // formatFile.
      const target = universe.createTarget();
      const debuggerWorkspaceBinding = universe.debuggerWorkspaceBinding;
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);

      const script = (await loadBasicSourceMapExample(target)).script;
      const uiSourceCode = debuggerWorkspaceBinding.uiSourceCodeForScript(script);
      assert.exists(uiSourceCode);

      const response = FileFormatter.FileFormatter.formatSourceMapDetails(uiSourceCode, debuggerWorkspaceBinding);
      assert.strictEqual(response, 'Source map: file://gen.js.map');
    });
  });

  describe('formatFile', () => {
    it('formats file content', async () => {
      const uiSourceCode = await createUISourceCode({
        content: 'lorem ipsum',
        requestContentData: true,
      });
      assert.strictEqual(new FileFormatter.FileFormatter(uiSourceCode).formatFile(), `File name: script.js
URL: http://example.test/script.js
File content:
\`\`\`
lorem ipsum
\`\`\``);
    });

    it('formats file with associated request initiator chain', async () => {
      const networkRequest = createNetworkRequest({
        url: 'https://www.example.com/script.js',
      });
      stubInitiatorGraph(networkRequest);
      const uiSourceCode = await createUISourceCode({
        content: 'lorem ipsum',
        requestContentData: true,
        url: networkRequest.url(),
      });
      sinon.stub(SDK.ResourceTreeModel.ResourceTreeModel, 'resourceForURL')
          .withArgs(sinon.match.any, networkRequest.url())
          .returns({request: networkRequest} as SDK.Resource.Resource);
      assert.strictEqual(new FileFormatter.FileFormatter(uiSourceCode).formatFile(), `File name: script.js
URL: https://www.example.com/script.js
Request initiator chain:
- URL: <redacted cross-origin initiator URL>
\t- URL: https://www.example.com/script.js
\t\t- URL: https://www.example.com/1
\t\t- URL: https://www.example.com/2
File content:
\`\`\`
lorem ipsum
\`\`\``);
    });

    it('formats file content of a binary file', async () => {
      const uiSourceCode = await createUISourceCode({
        resourceType: Common.ResourceType.resourceTypes.Image,
        mimeType: 'application/png',
        url: Platform.DevToolsPath.urlString`http://example.test/test.png`,
        requestContentData: true,
      });
      assert.strictEqual(new FileFormatter.FileFormatter(uiSourceCode).formatFile(), `File name: test.png
URL: http://example.test/test.png
File content:
\`\`\`
<binary data>
\`\`\``);
    });

    describe('long file content', () => {
      // Three runs of distinct characters make each part easy to identify.
      const content = 'a'.repeat(10_000) + 'b'.repeat(10_000) + 'c'.repeat(500);

      it('truncates long file content and gives the offset of the next part', async () => {
        const uiSourceCode = await createUISourceCode({content, requestContentData: true});
        assert.strictEqual(new FileFormatter.FileFormatter(uiSourceCode).formatFile(), `File name: script.js
URL: http://example.test/script.js
File content:
\`\`\`
${'a'.repeat(10_000)}
\`\`\`
Content truncated: showing characters 0-10000 of 20500. The next part starts at offset 10000.`);
      });

      it('returns the part that starts at the given offset', async () => {
        const uiSourceCode = await createUISourceCode({content, requestContentData: true});
        assert.strictEqual(new FileFormatter.FileFormatter(uiSourceCode).formatFile({offset: 10_000}),
                           `File name: script.js
URL: http://example.test/script.js
File content:
\`\`\`
${'b'.repeat(10_000)}
\`\`\`
Content truncated: showing characters 10000-20000 of 20500. The next part starts at offset 20000.`);
      });

      it('omits the truncation notice for the final part', async () => {
        const uiSourceCode = await createUISourceCode({content, requestContentData: true});
        assert.strictEqual(new FileFormatter.FileFormatter(uiSourceCode).formatFile({offset: 20_000}),
                           `File name: script.js
URL: http://example.test/script.js
File content:
\`\`\`
${'c'.repeat(500)}
\`\`\``);
      });
    });
  });
});
