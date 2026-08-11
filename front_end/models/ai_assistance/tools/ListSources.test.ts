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
import * as Workspace from '../../workspace/workspace.js';
import * as AiAssistance from '../ai_assistance.js';

const {urlString} = Platform.DevToolsPath;

describe('ListSourcesTool', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let tool: AiAssistance.ListSources.ListSourcesTool;
  let universe: TestUniverse;

  beforeEach(() => {
    tool = new AiAssistance.ListSources.ListSourcesTool();
    AiAssistance.ListSources.ListSourcesTool.reset();

    universe = new TestUniverse();
    const {workspace, ignoreListManager} = universe;

    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(workspace);
    sinon.stub(Workspace.IgnoreListManager.IgnoreListManager, 'instance').returns(ignoreListManager);
  });

  it('lists network files matching the origin lock and assigns unique IDs', async () => {
    createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`https://example.com/script1.js`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.Script,
        },
        {
          url: urlString`https://another.com/script2.js`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.Script,
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      universe,
    });

    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({}, context);
    assert.isUndefined((response as {error?: string}).error);
    const result = (response as {result: {files: Array<{id: number, name: string}>}}).result;
    assert.lengthOf(result.files, 1);
    assert.strictEqual(result.files[0].name, 'example.com/script1.js');
    assert.strictEqual(result.files[0].id, 1);
  });

  it('filters out ignore-listed files', async () => {
    const {uiSourceCodes} = createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`https://example.com/script1.js`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.Script,
        },
        {
          url: urlString`https://example.com/ignored.js`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.Script,
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      universe,
    });

    sinon.stub(uiSourceCodes[1], 'isIgnoreListed').returns(true);

    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({}, context);
    assert.isUndefined((response as {error?: string}).error);
    const result = (response as {result: {files: Array<{id: number, name: string}>}}).result;
    assert.lengthOf(result.files, 1);
    assert.strictEqual(result.files[0].name, 'example.com/script1.js');
  });

  it('prioritizes source-mapped files over non-source-mapped ones with identical URLs', async () => {
    createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`https://example.com/script.js`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.Script,
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'project1',
      universe,
    });
    createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`https://example.com/script.js`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.SourceMapScript,
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      projectId: 'project2',
      universe,
    });

    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'https://example.com',
    };

    const response = await tool.handler({}, context);
    assert.isUndefined((response as {error?: string}).error);
    const result = (response as {result: {files: Array<{id: number, name: string}>}}).result;
    assert.lengthOf(result.files, 1);
    assert.strictEqual(result.files[0].name, 'example.com/script.js');

    const sourceCodes = AiAssistance.ListSources.ListSourcesTool.getUISourceCodes();
    assert.lengthOf(sourceCodes, 1);
    assert.isTrue(sourceCodes[0].contentType().isFromSourceMap());
  });

  it('returns error for opaque origins', async () => {
    const context = {
      conversationContext: null,
      getEstablishedOrigin: () => 'about:blank',
    };

    const response = await tool.handler({}, context);
    assert.exists((response as {error?: string}).error);
    assert.strictEqual((response as {error: string}).error, 'Opaque origin not allowed');
  });
});
