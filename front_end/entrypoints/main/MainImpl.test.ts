// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import {getMenuForToolbarButton} from '../../testing/ContextMenuHelpers.js';
import {createTarget, stubNoopSettings} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Main from './main.js';

describeWithMockConnection('MainMenuItem', () => {
  beforeEach(async () => {
    stubNoopSettings();
    sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
      keyAndModifiersForAction: () => {},
      shortcutTitleForAction: () => {},
      shortcutsForAction: () => [],
    } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
    const tabTaget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTaget, subtype: 'prerender'});
    createTarget({parentTarget: tabTaget});

    sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
        .withArgs(sinon.match(/inspector-main.focus-debuggee|main.toggle-drawer/))
        .returns(true);
    sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'getAction')
        .withArgs(sinon.match(/inspector-main.focus-debuggee|main.toggle-drawer/))
        .returns(sinon.createStubInstance(UI.ActionRegistration.Action));
  });

  it('includes focus debuggee item when undocked', async () => {
    UI.DockController.DockController.instance().setDockSide(UI.DockController.DockState.UNDOCKED);

    const item = Main.MainImpl.MainMenuItem.instance({forceNew: true}).item() as UI.Toolbar.ToolbarMenuButton;
    const menu = getMenuForToolbarButton(item);
    assert.exists(
        menu.defaultSection().items.find((item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Focus page'));
  });

  it('does not include focus debuggee item when docked', async () => {
    UI.DockController.DockController.instance().setDockSide(UI.DockController.DockState.BOTTOM);

    const item = Main.MainImpl.MainMenuItem.instance({forceNew: true}).item() as UI.Toolbar.ToolbarMenuButton;
    assert.exists(item);

    const contextMenuShow = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    item.clicked(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }));

    sinon.assert.calledOnce(contextMenuShow);
    assert.notExists(contextMenuShow.thisValues[0].defaultSection().items.find(
        (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Focus page'));
  });

  describe('handleExternalRequest', () => {
    const {handleExternalRequestGenerator} = Main.MainImpl;

    it('calls into the AiAssistanceModel ConversationHandler for LIVE_STYLE_DEBUGGER', async () => {
      const handler = AiAssistanceModel.ConversationHandler.instance({
        aidaClient: new Host.AidaClient.AidaClient(),
        aidaAvailability: Host.AidaClient.AidaAccessPreconditions.AVAILABLE,
      });
      const spy = sinon.spy(handler, 'handleExternalRequest');

      await handleExternalRequestGenerator({kind: 'LIVE_STYLE_DEBUGGER', args: {prompt: 'test', selector: '#test'}});
      sinon.assert.calledOnceWithExactly(
          spy, {prompt: 'test', conversationType: AiAssistanceModel.ConversationType.STYLING, selector: '#test'});
    });

    it('returns an error for file assistance requests', async () => {
      // @ts-expect-error
      const generator = await handleExternalRequestGenerator({kind: 'FILE_DEBUGGER', args: {prompt: 'test'}});
      const iteratorResponse = await generator.next();
      assert.strictEqual(iteratorResponse.value.type, 'error');
      assert.strictEqual(
          iteratorResponse.value.message, 'Debugging with an agent of type \'FILE_DEBUGGER\' is not implemented yet.');
    });
  });
});
