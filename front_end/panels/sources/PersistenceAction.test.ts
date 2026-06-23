// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {stubFileManager} from '../../testing/FileManagerHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Sources from './sources.js';

const {urlString} = Platform.DevToolsPath;

describe('ContextMenuProvider', () => {
  setupLocaleHooks();

  beforeEach(() => {
    // Rather then setting up a whole Workspace/BreakpointManager/TargetManager/... chain. Let's stub out the NetworkPersistenceManager.
    sinon.stub(Persistence.NetworkPersistenceManager.NetworkPersistenceManager, 'instance')
        .returns(sinon.createStubInstance(Persistence.NetworkPersistenceManager.NetworkPersistenceManager));
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showContextMenuAtPoint');
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'close');
  });

  it('passes along the "isEncoded" flag to the FileManager for "Save as"', async () => {
    const fileManager = stubFileManager();
    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const menuProvider = new Sources.PersistenceActions.ContextMenuProvider();
    const contentData = new TextUtils.ContentData.ContentData('AGFzbQEAAAA=', true, 'image/webp');
    const contentProvider: TextUtils.ContentProvider.ContentProvider = {
      contentURL: () => urlString`https://example.com/sample.webp`,
      contentType: () => Common.ResourceType.resourceTypes
                             .Document,  // Navigating a tab to an image will result in a document type for images.
      requestContentData: () => Promise.resolve(contentData),
      searchInContent: () => assert.fail('Not implemented'),
    };

    menuProvider.appendApplicableItems(event, contextMenu, contentProvider);
    await contextMenu.show();
    const saveItem = contextMenu.saveSection().items[0];
    assert.exists(saveItem);

    contextMenu.invokeHandler(saveItem.id());

    assert.deepEqual(await expectCall(fileManager.save), [
      urlString`https://example.com/sample.webp`,
      contentData,
      /* forceSaveAs=*/ true,
    ]);
  });

  it('can "Save as" WASM modules', async () => {
    const fileManager = stubFileManager();
    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const menuProvider = new Sources.PersistenceActions.ContextMenuProvider();
    const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode, {
      contentURL: urlString`https://example.com/sample.wasm`,
      contentType: Common.ResourceType.resourceTypes.Script,
    });
    const stubProject = sinon.createStubInstance(
        Bindings.ContentProviderBasedProject.ContentProviderBasedProject,
        {type: Workspace.Workspace.projectTypes.Debugger});
    uiSourceCode.project.returns(stubProject);
    const stubWorkspaceBinding = sinon.createStubInstance(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding);
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance').returns(stubWorkspaceBinding);
    const stubWasmScript = sinon.createStubInstance(SDK.Script.Script, {
      getWasmBytecode: Promise.resolve(new Uint8Array([1, 2, 3, 4]).buffer),
      isWasm: true,
    });
    stubWorkspaceBinding.scriptsForUISourceCode.returns([stubWasmScript]);

    menuProvider.appendApplicableItems(event, contextMenu, uiSourceCode);
    await contextMenu.show();
    const saveItem = contextMenu.saveSection().items[0];

    contextMenu.invokeHandler(saveItem.id());

    assert.deepEqual(await expectCall(fileManager.save), [
      urlString`https://example.com/sample.wasm`,
      new TextUtils.ContentData.ContentData('AQIDBA==', true, 'application/wasm'),
      /* forceSaveAs=*/ true,
    ]);
  });

  describe('Open in containing folder', () => {
    function createMockUISourceCode(
        url: Platform.DevToolsPath.UrlString, projectType: Workspace.Workspace.projectTypes):
        sinon.SinonStubbedInstance<Workspace.UISourceCode.UISourceCode> {
      const uiSourceCode = sinon.createStubInstance(Workspace.UISourceCode.UISourceCode, {
        contentURL: url,
        contentType: Common.ResourceType.resourceTypes.Script,
      });
      const stubProject = sinon.createStubInstance(
          Bindings.ContentProviderBasedProject.ContentProviderBasedProject, {type: projectType});
      uiSourceCode.project.returns(stubProject);
      return uiSourceCode;
    }

    function setupSingletons(
        uiSourceCode: Workspace.UISourceCode.UISourceCode|null,
        binding: Persistence.Persistence.PersistenceBinding|null): void {
      const mockWorkspaceImpl = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
      sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(mockWorkspaceImpl);
      mockWorkspaceImpl.uiSourceCodeForURL.returns(uiSourceCode);

      const mockPersistenceImpl = sinon.createStubInstance(Persistence.Persistence.PersistenceImpl);
      sinon.stub(Persistence.Persistence.PersistenceImpl, 'instance').returns(mockPersistenceImpl);
      mockPersistenceImpl.binding.returns(binding);
    }

    async function getOpenInFolderMenuItem(targetUiSourceCode: Workspace.UISourceCode.UISourceCode):
        Promise<UI.ContextMenu.Item|undefined> {
      const event = new Event('contextmenu');
      sinon.stub(event, 'target').value(document);
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      const menuProvider = new Sources.PersistenceActions.ContextMenuProvider();

      menuProvider.appendApplicableItems(event, contextMenu, targetUiSourceCode);
      await contextMenu.show();

      return contextMenu.revealSection().items.find(
          item => item.buildDescriptor().label === 'Open in containing folder');
    }

    it('appends the item for direct workspace files (FileSystem project type)', async () => {
      const uiSourceCode = createMockUISourceCode(
          urlString`file:///path/to/project/file.js`, Workspace.Workspace.projectTypes.FileSystem);
      setupSingletons(uiSourceCode, null);

      const openFolderItem = await getOpenInFolderMenuItem(uiSourceCode);
      assert.exists(openFolderItem);
    });

    it('appends the item for network files mapped to workspace files (persistence binding exists)', async () => {
      const networkUiSourceCode =
          createMockUISourceCode(urlString`https://example.com/file.js`, Workspace.Workspace.projectTypes.Network);
      const fileSystemUiSourceCode = createMockUISourceCode(
          urlString`file:///path/to/project/file.js`, Workspace.Workspace.projectTypes.FileSystem);

      const binding = new Persistence.Persistence.PersistenceBinding(networkUiSourceCode, fileSystemUiSourceCode);
      setupSingletons(networkUiSourceCode, binding);

      const openFolderItem = await getOpenInFolderMenuItem(networkUiSourceCode);
      assert.exists(openFolderItem);
    });

    it('does not append the item for local file page resources that are not in a FileSystem project type', async () => {
      const uiSourceCode =
          createMockUISourceCode(urlString`file:///path/to/project/file.js`, Workspace.Workspace.projectTypes.Network);
      setupSingletons(uiSourceCode, null);

      const openFolderItem = await getOpenInFolderMenuItem(uiSourceCode);
      assert.isUndefined(openFolderItem);
    });

    it('appends the item if contentProvider is a FileSystem UISourceCode but uiSourceCodeForURL returns a Network UISourceCode (same URL, not bound)',
       async () => {
         const fileSystemUiSourceCode = createMockUISourceCode(
             urlString`file:///path/to/project/file.js`, Workspace.Workspace.projectTypes.FileSystem);
         const networkUiSourceCode = createMockUISourceCode(
             urlString`file:///path/to/project/file.js`, Workspace.Workspace.projectTypes.Network);

         // uiSourceCodeForURL returns the Network UISourceCode due to order.
         const mockWorkspaceImpl = sinon.createStubInstance(Workspace.Workspace.WorkspaceImpl);
         sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(mockWorkspaceImpl);
         mockWorkspaceImpl.uiSourceCodeForURL.returns(networkUiSourceCode);

         const mockPersistenceImpl = sinon.createStubInstance(Persistence.Persistence.PersistenceImpl);
         sinon.stub(Persistence.Persistence.PersistenceImpl, 'instance').returns(mockPersistenceImpl);
         mockPersistenceImpl.binding.returns(null);

         const openFolderItem = await getOpenInFolderMenuItem(fileSystemUiSourceCode);
         assert.exists(openFolderItem);
       });
  });
});
