// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {MockProtocolBackend} from '../../testing/MockScopeChain.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';

import * as Sources from './sources.js';

const {UISourceCodeFrame} = Sources.UISourceCodeFrame;
const {urlString} = Platform.DevToolsPath;

describeWithMockConnection('UISourceCodeFrame', () => {
  describe('canEditSource', () => {
    function setup() {
      const workspace = Workspace.Workspace.WorkspaceImpl.instance({forceNew: true});
      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        targetManager: SDK.TargetManager.TargetManager.instance(),
        resourceMapping:
            new Bindings.ResourceMapping.ResourceMapping(SDK.TargetManager.TargetManager.instance(), workspace),
        ignoreListManager,
      });
      const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
        forceNew: true,
        targetManager: SDK.TargetManager.TargetManager.instance(),
        workspace,
        debuggerWorkspaceBinding,
      });
      const persistence =
          Persistence.Persistence.PersistenceImpl.instance({forceNew: true, workspace, breakpointManager});
      Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({forceNew: true, workspace});
      const backend = new MockProtocolBackend();

      return {persistence, backend, debuggerWorkspaceBinding};
    }

    it('returns false for source mapped files when they are not mapped in a workspace', async () => {
      const target = createTarget();
      const {backend, debuggerWorkspaceBinding} = setup();

      const sourceRoot = 'http://example.com';
      const sources = ['foo.ts'];
      const scriptInfo = {url: `${sourceRoot}/bundle.js`, content: '1;\n'};
      const sourceMapInfo = {
        url: `${scriptInfo.url}.map`,
        content: {version: 3, mappings: '', sourceRoot, sources, sourcesContent: ['1;']}
      };

      const uiSourceCodePromise =
          debuggerWorkspaceBinding.waitForUISourceCodeAdded(urlString`http://example.com/foo.ts`, target);
      await backend.addScript(target, scriptInfo, sourceMapInfo);
      const uiSourceCode = await uiSourceCodePromise;

      const frame = new UISourceCodeFrame(uiSourceCode);

      renderElementIntoDOM(frame);

      assert.isFalse(frame.canEditSource());
    });

    it('returns true for source mapped files when they are mapped in a workspace', async () => {
      const target = createTarget();
      const {persistence, backend, debuggerWorkspaceBinding} = setup();

      const sourceRoot = 'http://example.com';
      const sources = ['foo.ts'];
      const scriptInfo = {url: `${sourceRoot}/bundle.js`, content: '1;\n'};
      const sourceMapInfo = {
        url: `${scriptInfo.url}.map`,
        content: {version: 3, mappings: '', sourceRoot, sources, sourcesContent: ['1;']}
      };

      const uiSourceCodePromise =
          debuggerWorkspaceBinding.waitForUISourceCodeAdded(urlString`http://example.com/foo.ts`, target);
      await backend.addScript(target, scriptInfo, sourceMapInfo);
      const uiSourceCode = await uiSourceCodePromise;

      const {uiSourceCode: fileSystemUISourceCode} = createFileSystemUISourceCode({
        url: Platform.DevToolsPath.urlString`file:///path/to/overrides/foo.ts`,
        fileSystemPath: Platform.DevToolsPath.urlString`file:///path/to/overrides`,
        mimeType: 'text/typescript',
        content: '1;',
      });
      await persistence.addBindingForTest({network: uiSourceCode, fileSystem: fileSystemUISourceCode});

      const frame = new UISourceCodeFrame(uiSourceCode);

      renderElementIntoDOM(frame);

      assert.isTrue(frame.canEditSource());
    });
  });
});
