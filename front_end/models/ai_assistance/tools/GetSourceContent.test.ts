// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../../testing/TestUniverse.js';
import {createContentProviderUISourceCodes} from '../../../testing/UISourceCodeHelpers.js';
import * as Bindings from '../../bindings/bindings.js';
import * as Logs from '../../logs/logs.js';
import * as Workspace from '../../workspace/workspace.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('GetSourceContentTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let tool: AiAssistance.GetSourceContent.GetSourceContentTool;
  let universe: TestUniverse;

  beforeEach(() => {
    tool = new AiAssistance.GetSourceContent.GetSourceContentTool();
    AiAssistance.ListSources.ListSourcesTool.reset();

    universe = new TestUniverse();
    const {workspace, ignoreListManager, debuggerWorkspaceBinding, networkLog} = universe;

    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(workspace);
    sinon.stub(Workspace.IgnoreListManager.IgnoreListManager, 'instance').returns(ignoreListManager);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(debuggerWorkspaceBinding);
    sinon.stub(Logs.NetworkLog.NetworkLog, 'instance').returns(networkLog);
  });

  it('retrieves and formats source content for matching origin and valid ID', async () => {
    const {uiSourceCodes} = createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`https://example.com/script.js`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.Script,
          content: 'console.log("hello");',
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      universe,
    });

    // Populate ID mapping by running ListSourcesTool scan.
    AiAssistance.ListSources.ListSourcesTool.getUISourceCodes();
    const sourceId = AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.get(uiSourceCodes[0])!;

    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({id: sourceId}, context);
    assert.isUndefined((response as {error?: string}).error);
    const result = (response as {result: {content: string}}).result;
    assert.include(result.content, 'console.log("hello");');
  });

  it('returns error when file is not found', async () => {
    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({id: 999}, context);
    assert.exists((response as {error?: string}).error);
    assert.strictEqual((response as {error: string}).error, 'Unable to find file.');
  });

  it('returns error when accessing cross-origin file', async () => {
    const {uiSourceCodes} = createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`https://another.com/script.js`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.Script,
          content: 'console.log("secret");',
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      universe,
    });

    AiAssistance.ListSources.ListSourcesTool.getUISourceCodes();
    const sourceId = AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.get(uiSourceCodes[0])!;

    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({id: sourceId}, context);
    assert.exists((response as {error?: string}).error);
    assert.strictEqual((response as {error: string}).error, 'Cross-origin access blocked.');
  });

  it('returns error when file content request fails', async () => {
    const {uiSourceCodes} = createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`https://example.com/script.js`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.Script,
          content: 'console.log("hello");',
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      universe,
    });

    // Stub requestContentData to return an error.
    sinon.stub(uiSourceCodes[0], 'requestContentData').resolves({error: 'Failed to load'});

    AiAssistance.ListSources.ListSourcesTool.getUISourceCodes();
    const sourceId = AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.get(uiSourceCodes[0])!;

    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({id: sourceId}, context);
    assert.exists((response as {error?: string}).error);
    assert.strictEqual((response as {error: string}).error, 'Failed to load file content: Failed to load');
  });
});
