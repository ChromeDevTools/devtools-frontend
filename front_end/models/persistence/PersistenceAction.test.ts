// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as TextUtils from '../text_utils/text_utils.js';
import * as Workspace from '../workspace/workspace.js';

import * as Persistence from './persistence.js';

describeWithLocale('ContextMenuProvider', () => {
  beforeEach(() => {
    // Rather then setting up a whole Workspace/BreakpointManager/TargetManager/... chain. Let's stub out the NetworkPersistenceManager.
    sinon.stub(Persistence.NetworkPersistenceManager.NetworkPersistenceManager, 'instance')
        .returns(sinon.createStubInstance(Persistence.NetworkPersistenceManager.NetworkPersistenceManager));
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'isHostedMode').returns(false);
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'showContextMenuAtPoint');
  });

  it('passes along the "isEncoded" flag to the FileManager for "Save as"', async () => {
    const event = new Event('contextmenu');
    sinon.stub(event, 'target').value(document);
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const menuProvider = new Persistence.PersistenceActions.ContextMenuProvider();
    const contentProvider: TextUtils.ContentProvider.ContentProvider = {
      contentURL: () => 'https://example.com/sample.webp' as Platform.DevToolsPath.UrlString,
      contentType: () => Common.ResourceType.resourceTypes
                             .Document,  // Navigating a tab to an image will result in a document type for images.
      requestContent: () => Promise.resolve({isEncoded: true, content: 'AGFzbQEAAAA='}),
      searchInContent: () => assert.fail('Not implemented'),
    };

    menuProvider.appendApplicableItems(event, contextMenu, contentProvider);
    await contextMenu.show();
    const saveItem = contextMenu.saveSection().items[0];
    const saveStub = sinon.stub(Workspace.FileManager.FileManager.instance(), 'save');

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.ContextMenuItemSelected, saveItem.id());

    assert.deepEqual(await expectCall(saveStub), [
      'https://example.com/sample.webp' as Platform.DevToolsPath.UrlString, 'AGFzbQEAAAA=', true /* forceSaveAs */,
      true, /* isBase64 */
    ]);
  });
});
