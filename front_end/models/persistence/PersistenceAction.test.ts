// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Bindings from '../bindings/bindings.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import * as Persistence from './persistence.js';

const {urlString} = Platform.DevToolsPath;

describeWithLocale('ContextMenuProvider', () => {
  beforeEach(() => {
    // Rather then setting up a whole Workspace/BreakpointManager/TargetManager/... chain. Let's stub out the NetworkPersistenceManager.
    sinon.stub(Persistence.NetworkPersistenceManager.NetworkPersistenceManager, 'instance')
        .returns(sinon.createStubInstance(Persistence.NetworkPersistenceManager.NetworkPersistenceManager));
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showContextMenuAtPoint');
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'close');
  });

  it('passes along the "isEncoded" flag to the FileManager for "Save as"', async () => {
    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const menuProvider = new Persistence.PersistenceActions.ContextMenuProvider();
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
    const saveStub = sinon.stub(Workspace.FileManager.FileManager.instance(), 'save');

    contextMenu.invokeHandler(saveItem.id());

    assert.deepEqual(await expectCall(saveStub), [
      urlString`https://example.com/sample.webp`,
      contentData,
      /* forceSaveAs=*/ true,
    ]);
  });

  it('can "Save as" WASM modules', async () => {
    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const menuProvider = new Persistence.PersistenceActions.ContextMenuProvider();
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
    const saveStub = sinon.stub(Workspace.FileManager.FileManager.instance(), 'save');

    contextMenu.invokeHandler(saveItem.id());

    const args = await expectCall(saveStub);
    assert.lengthOf(args, 3);
    assert.strictEqual(args[0], urlString`https://example.com/sample.wasm`);
    assert.strictEqual(args[1].base64, 'AQIDBA==');
    assert.isTrue(args[2]);
  });
});
