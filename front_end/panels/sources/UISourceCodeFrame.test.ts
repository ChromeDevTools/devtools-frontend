// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Breakpoints from '../../models/breakpoints/breakpoints.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockDebuggerBackend} from '../../testing/MockScopeChain.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {createFileSystemUISourceCode} from '../../testing/UISourceCodeHelpers.js';

import * as Sources from './sources.js';

const {UISourceCodeFrame} = Sources.UISourceCodeFrame;
const {urlString} = Platform.DevToolsPath;

describe('UISourceCodeFrame', () => {
  setupRuntimeHooks();
  setupSettingsHooks();
  setupLocaleHooks();

  afterEach(() => {
    sinon.restore();
  });

  function setup() {
    const backend = new MockDebuggerBackend();
    const target = backend.createTarget();
    const debuggerWorkspaceBinding = backend.universe.debuggerWorkspaceBinding;

    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(backend.universe.debuggerWorkspaceBinding);
    sinon.stub(Workspace.IgnoreListManager.IgnoreListManager, 'instance').returns(backend.universe.ignoreListManager);
    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(backend.universe.workspace);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(backend.universe.targetManager);
    sinon.stub(SDK.PageResourceLoader.PageResourceLoader, 'instance').returns(backend.universe.pageResourceLoader);

    const breakpointManager = Breakpoints.BreakpointManager.BreakpointManager.instance({
      forceNew: true,
      targetManager: backend.universe.targetManager,
      workspace: backend.universe.workspace,
      debuggerWorkspaceBinding: backend.universe.debuggerWorkspaceBinding,
      settings: backend.universe.settings,
    });
    const persistence = Persistence.Persistence.PersistenceImpl.instance({
      forceNew: true,
      workspace: backend.universe.workspace,
      breakpointManager,
    });
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance({
      forceNew: true,
      workspace: backend.universe.workspace,
    });

    return {persistence, backend, debuggerWorkspaceBinding, target};
  }

  describe('canEditSource', () => {
    it('returns false for source mapped files when they are not mapped in a workspace', async () => {
      const {backend, debuggerWorkspaceBinding, target} = setup();

      const sourceRoot = 'http://example.com';
      const sources = ['foo.ts'];
      const scriptInfo = {url: `${sourceRoot}/bundle.js`, content: '1;\n'};
      const sourceMapInfo = {
        url: `${scriptInfo.url}.map`,
        content: {version: 3, mappings: '', sourceRoot, sources, sourcesContent: ['1;']},
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
      const {persistence, backend, debuggerWorkspaceBinding, target} = setup();

      const sourceRoot = 'http://example.com';
      const sources = ['foo.ts'];
      const scriptInfo = {url: `${sourceRoot}/bundle.js`, content: '1;\n'};
      const sourceMapInfo = {
        url: `${scriptInfo.url}.map`,
        content: {version: 3, mappings: '', sourceRoot, sources, sourcesContent: ['1;']},
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

  describe('data-file-path', () => {
    it('sets data-file-path on textEditor, updates on title change, and removes on dispose', () => {
      setup();
      const {uiSourceCode} = createFileSystemUISourceCode({
        url: Platform.DevToolsPath.urlString`file:///path/to/file.ts`,
        mimeType: 'text/typescript',
        content: 'const a = 1;',
      });

      const frame = new UISourceCodeFrame(uiSourceCode);
      assert.strictEqual(frame.textEditor.getAttribute('data-file-path'), 'file:///path/to/file.ts');

      sinon.stub(uiSourceCode, 'url').returns(Platform.DevToolsPath.urlString`file:///path/to/renamed.ts`);
      uiSourceCode.dispatchEventToListeners(Workspace.UISourceCode.Events.TitleChanged, uiSourceCode);
      assert.strictEqual(frame.textEditor.getAttribute('data-file-path'), 'file:///path/to/renamed.ts');

      frame.dispose();
      assert.isNull(frame.textEditor.getAttribute('data-file-path'));
    });
  });
});
