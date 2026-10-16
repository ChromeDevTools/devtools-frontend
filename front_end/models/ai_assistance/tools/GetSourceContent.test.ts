// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {assertIsError, assertIsResult} from '../../../testing/AiAssistanceHelpers.js';
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
    AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(
        {status: 'ESTABLISHED_ORIGIN', origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com')},
        universe.workspace);
    const sourceId = AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.get(uiSourceCodes[0])!;

    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({id: sourceId}, context);
    assertIsResult(response);
    assert.include(response.result.content, 'console.log("hello");');
  });

  it('returns error when file is not found', async () => {
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({id: 999}, context);
    assertIsError(response, 'Unable to find file.');
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

    AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(
        {status: 'ESTABLISHED_ORIGIN', origin: SDK.SecurityOrigin.SecurityOrigin.create('https://another.com')},
        universe.workspace);
    const sourceId = AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.get(uiSourceCodes[0])!;

    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({id: sourceId}, context);
    assertIsError(response, 'Unable to find file.');
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

    AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(
        {status: 'ESTABLISHED_ORIGIN', origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com')},
        universe.workspace);
    const sourceId = AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.get(uiSourceCodes[0])!;

    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({id: sourceId}, context);
    assertIsError(response, 'Failed to load file content: Failed to load');
  });

  it('returns error for opaque origins', async () => {
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState =>
          ({status: 'ESTABLISHED_ORIGIN', origin: SDK.SecurityOrigin.SecurityOrigin.create('about:blank')}),
    };

    const response = await tool.handler({id: 1}, context);
    assertIsError(response, 'No origin available or not allowed.');
  });

  it('returns error when origin lock is not established', async () => {
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({status: 'UNINITIALIZED'}),
    };

    const response = await tool.handler({id: 1}, context);
    assertIsError(response, 'No origin established for this conversation.');
  });

  it('returns error when cross-origin navigation occurred during run', async () => {
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({status: 'BLOCKED_BY_NAVIGATION'}),
    };
    const response = await tool.handler({id: 1}, context);
    assertIsError(response, 'Cross-origin access blocked due to navigation.');
  });

  describe('long files', () => {
    const exampleOrigin = SDK.SecurityOrigin.SecurityOrigin.create('https://example.com');
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({status: 'ESTABLISHED_ORIGIN', origin: exampleOrigin}),
    };

    function createSource(content: string): number {
      const {uiSourceCodes} = createContentProviderUISourceCodes({
        items: [
          {
            url: urlString`https://example.com/script.js`,
            mimeType: 'application/javascript',
            resourceType: Common.ResourceType.resourceTypes.Script,
            content,
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        universe,
      });
      AiAssistance.ListSources.ListSourcesTool.getUISourceCodes({status: 'ESTABLISHED_ORIGIN', origin: exampleOrigin},
                                                                universe.workspace);
      const sourceId = AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.get(uiSourceCodes[0]);
      assert.isDefined(sourceId);
      return sourceId;
    }

    it('reads the part of a long file that starts at the given offset', async () => {
      const sourceId = createSource('a'.repeat(10_000) + 'b'.repeat(20));

      const response = await tool.handler({id: sourceId, offset: 10_000}, context);
      assertIsResult(response);
      assert.include(response.result.content,
                     '```\n' +
                         'b'.repeat(20) + '\n```');
      assert.notInclude(response.result.content, 'aaaa');
      assert.notInclude(response.result.content, 'Content truncated');
    });

    it('returns a truncation notice with the next offset for the first part of a long file', async () => {
      const sourceId = createSource('a'.repeat(10_000) + 'b'.repeat(20));

      const response = await tool.handler({id: sourceId}, context);
      assertIsResult(response);
      assert.include(response.result.content,
                     'Content truncated: showing characters 0-10000 of 10020. The next part starts at offset 10000.');
    });

    it('returns error for an offset at or past the end of the file', async () => {
      const sourceId = createSource('console.log("hello");');

      const response = await tool.handler({id: sourceId, offset: 21}, context);
      assertIsError(response, 'Invalid offset 21. The file content has 21 characters.');
    });

    it('returns error for a negative offset', async () => {
      const sourceId = createSource('console.log("hello");');

      const response = await tool.handler({id: sourceId, offset: -1}, context);
      assertIsError(response, 'Invalid offset -1. The file content has 21 characters.');
    });

    describe('displayInfoFromArgs', () => {
      it('shows the offset in the action only when it is set', () => {
        assert.strictEqual(tool.displayInfoFromArgs({id: 1}).action, 'getSourceContent(1)');
        assert.strictEqual(tool.displayInfoFromArgs({id: 1, offset: 10_000}).action, 'getSourceContent(1, 10000)');
      });

      it('names a listed file in the title', () => {
        const sourceId = createSource('console.log("hello");');

        assert.strictEqual(tool.displayInfoFromArgs({id: sourceId}).title, 'Reading script.js');
      });

      it('names a listed file and the offset in the title when an offset is set', () => {
        const sourceId = createSource('console.log("hello");');

        assert.strictEqual(tool.displayInfoFromArgs({id: sourceId, offset: 30_000}).title,
                           'Reading script.js (offset 30,000)');
      });

      it('omits the offset from the title when the offset is 0', () => {
        const sourceId = createSource('console.log("hello");');

        assert.strictEqual(tool.displayInfoFromArgs({id: sourceId, offset: 0}).title, 'Reading script.js');
      });

      it('uses a generic title for an id that listSources has not returned', () => {
        assert.strictEqual(tool.displayInfoFromArgs({id: 999}).title, 'Reading source content');
      });
    });
  });
});
