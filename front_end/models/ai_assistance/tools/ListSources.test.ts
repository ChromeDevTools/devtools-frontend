// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import {
  assertIsError,
  assertIsResult,
} from '../../../testing/AiAssistanceHelpers.js';
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
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);
    assert.lengthOf(response.result.files, 1);
    assert.strictEqual(response.result.files[0].name, 'example.com/script1.js');
    assert.strictEqual(response.result.files[0].id, 1);
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
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);
    assert.lengthOf(response.result.files, 1);
    assert.strictEqual(response.result.files[0].name, 'example.com/script1.js');
  });

  it('filters out files with opaque origins', async () => {
    createContentProviderUISourceCodes({
      items: [
        {
          url: urlString`https://example.com/script1.js`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.Script,
        },
        {
          url: urlString`data:text/javascript,console.log(1)`,
          mimeType: 'application/javascript',
          resourceType: Common.ResourceType.resourceTypes.Script,
        },
      ],
      projectType: Workspace.Workspace.projectTypes.Network,
      universe,
    });

    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);
    assert.lengthOf(response.result.files, 1);
    assert.strictEqual(response.result.files[0].name, 'example.com/script1.js');
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
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      }),
    };

    const response = await tool.handler({}, context);
    assertIsResult(response);
    assert.lengthOf(response.result.files, 1);
    assert.strictEqual(response.result.files[0].name, 'example.com/script.js');

    const sourceCodes = AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(
        {status: 'ESTABLISHED_ORIGIN', origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com')},
        universe.workspace);
    assert.lengthOf(sourceCodes, 1);
    assert.isTrue(sourceCodes[0].contentType().isFromSourceMap());
  });

  it('returns error for opaque origins', async () => {
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState =>
          ({status: 'ESTABLISHED_ORIGIN', origin: SDK.SecurityOrigin.SecurityOrigin.create('about:blank')}),
    };

    const response = await tool.handler({}, context);
    assertIsError(response, 'No origin available or not allowed.');
  });

  it('returns error when origin lock is not established', async () => {
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({status: 'UNINITIALIZED'}),
    };

    const response = await tool.handler({}, context);
    assertIsError(response, 'No origin established for this conversation.');
  });

  it('returns error when cross-origin navigation occurred during run', async () => {
    const context = {
      getOriginLock: (): AiAssistance.Tool.OriginLockState => ({status: 'BLOCKED_BY_NAVIGATION'}),
    };

    const response = await tool.handler({}, context);
    assertIsError(response, 'Cross-origin access blocked due to navigation.');
  });

  describe('getUISourceCodes and getSourceById', () => {
    it('filters sources by established origin in getUISourceCodes', () => {
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

      const originLock: AiAssistance.Tool.OriginLockState = {
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      };
      const filtered = AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(originLock, universe.workspace);
      assert.lengthOf(filtered, 1);
      assert.strictEqual(filtered[0].url(), 'https://example.com/script1.js');
    });

    it('returns empty array from getUISourceCodes when origin is opaque or not established', () => {
      createContentProviderUISourceCodes({
        items: [
          {
            url: urlString`https://example.com/script1.js`,
            mimeType: 'application/javascript',
            resourceType: Common.ResourceType.resourceTypes.Script,
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        universe,
      });

      const opaqueLock: AiAssistance.Tool.OriginLockState = {
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('about:blank'),
      };
      assert.lengthOf(AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(opaqueLock, universe.workspace), 0);

      const uninitializedLock: AiAssistance.Tool.OriginLockState = {status: 'UNINITIALIZED'};
      assert.lengthOf(AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(uninitializedLock, universe.workspace),
                      0);

      const blockedLock: AiAssistance.Tool.OriginLockState = {status: 'BLOCKED_BY_NAVIGATION'};
      assert.lengthOf(AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(blockedLock, universe.workspace), 0);
    });

    it('retrieves source by ID when matching established origin in getSourceById', () => {
      const {uiSourceCodes} = createContentProviderUISourceCodes({
        items: [
          {
            url: urlString`https://example.com/script1.js`,
            mimeType: 'application/javascript',
            resourceType: Common.ResourceType.resourceTypes.Script,
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        universe,
      });

      const originLock: AiAssistance.Tool.OriginLockState = {
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      };
      AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(originLock, universe.workspace);
      const id = AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.get(uiSourceCodes[0])!;

      const found = AiAssistance.ListSources.ListSourcesTool.getSourceById(id, originLock, universe.workspace);
      assert.strictEqual(found, uiSourceCodes[0]);
    });

    it('returns undefined from getSourceById when origin does not match or is not established', () => {
      const {uiSourceCodes} = createContentProviderUISourceCodes({
        items: [
          {
            url: urlString`https://example.com/script1.js`,
            mimeType: 'application/javascript',
            resourceType: Common.ResourceType.resourceTypes.Script,
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        universe,
      });

      const originLock: AiAssistance.Tool.OriginLockState = {
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      };
      AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(originLock, universe.workspace);
      const id = AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.get(uiSourceCodes[0])!;

      const crossOriginLock: AiAssistance.Tool.OriginLockState = {
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://attacker.com'),
      };
      assert.isUndefined(
          AiAssistance.ListSources.ListSourcesTool.getSourceById(id, crossOriginLock, universe.workspace));

      const opaqueLock: AiAssistance.Tool.OriginLockState = {
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('about:blank'),
      };
      assert.isUndefined(AiAssistance.ListSources.ListSourcesTool.getSourceById(id, opaqueLock, universe.workspace));

      const uninitializedLock: AiAssistance.Tool.OriginLockState = {status: 'UNINITIALIZED'};
      assert.isUndefined(
          AiAssistance.ListSources.ListSourcesTool.getSourceById(id, uninitializedLock, universe.workspace));

      const blockedLock: AiAssistance.Tool.OriginLockState = {status: 'BLOCKED_BY_NAVIGATION'};
      assert.isUndefined(AiAssistance.ListSources.ListSourcesTool.getSourceById(id, blockedLock, universe.workspace));
    });

    it('returns undefined from getSourceById when id is not a positive integer', () => {
      const originLock: AiAssistance.Tool.OriginLockState = {
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      };
      assert.isUndefined(AiAssistance.ListSources.ListSourcesTool.getSourceById(0, originLock, universe.workspace));
      assert.isUndefined(AiAssistance.ListSources.ListSourcesTool.getSourceById(-1, originLock, universe.workspace));
      assert.isUndefined(AiAssistance.ListSources.ListSourcesTool.getSourceById(1.5, originLock, universe.workspace));
      assert.isUndefined(AiAssistance.ListSources.ListSourcesTool.getSourceById(NaN, originLock, universe.workspace));
    });

    it('does not assign numeric IDs to cross-origin files', () => {
      const {uiSourceCodes} = createContentProviderUISourceCodes({
        items: [
          {
            url: urlString`https://example.com/script1.js`,
            mimeType: 'application/javascript',
            resourceType: Common.ResourceType.resourceTypes.Script,
          },
          {
            url: urlString`https://cross-origin.com/script2.js`,
            mimeType: 'application/javascript',
            resourceType: Common.ResourceType.resourceTypes.Script,
          },
        ],
        projectType: Workspace.Workspace.projectTypes.Network,
        universe,
      });

      const originLock: AiAssistance.Tool.OriginLockState = {
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      };
      AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(originLock, universe.workspace);

      assert.isTrue(AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.has(uiSourceCodes[0]));
      assert.isFalse(AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.has(uiSourceCodes[1]));
    });

    it('skips projects whose security origin does not match the lock', () => {
      const {project, uiSourceCodes} = createContentProviderUISourceCodes({
        items: [
          {
            url: urlString`https://example.com/script1.js`,
            mimeType: 'application/javascript',
            resourceType: Common.ResourceType.resourceTypes.Script,
          },
        ],
        projectId: 'cross-origin-project',
        projectType: Workspace.Workspace.projectTypes.Network,
        universe,
      });

      sinon.stub(project, 'securityOrigin').returns(SDK.SecurityOrigin.SecurityOrigin.create('https://other.com'));

      const originLock: AiAssistance.Tool.OriginLockState = {
        status: 'ESTABLISHED_ORIGIN',
        origin: SDK.SecurityOrigin.SecurityOrigin.create('https://example.com'),
      };
      const filtered = AiAssistance.ListSources.ListSourcesTool.getUISourceCodes(originLock, universe.workspace);

      assert.notInclude(filtered, uiSourceCodes[0]);
      assert.isFalse(AiAssistance.ListSources.ListSourcesTool.uiSourceCodeId.has(uiSourceCodes[0]));
    });
  });
});
