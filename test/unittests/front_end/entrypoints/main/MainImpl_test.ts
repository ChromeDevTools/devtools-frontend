// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import * as Main from '../../../../../front_end/entrypoints/main/main.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';

import {
  describeWithMockConnection,
} from '../../helpers/MockConnection.js';

describeWithMockConnection('MainMenuItem', () => {
  const focusDebuggee = (targetFactory: () => SDK.Target.Target) => {
    beforeEach(async () => {
      stubNoopSettings();
      sinon.stub(UI.ShortcutRegistry.ShortcutRegistry, 'instance').returns({
        shortcutTitleForAction: () => {},
        shortcutsForAction: () => [],
      } as unknown as UI.ShortcutRegistry.ShortcutRegistry);
      targetFactory();
    });

    it('includes focus debuggee item when undocked', async () => {
      UI.DockController.DockController.instance().setDockSide(UI.DockController.DockState.UNDOCKED);

      const item = Main.MainImpl.MainMenuItem.instance({forceNew: true}).item() as UI.Toolbar.ToolbarMenuButton;
      assertNotNullOrUndefined(item);

      const contextMenuShow = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'action')
          .withArgs(sinon.match(/inspector_main.focus-debuggee|main.toggle-drawer/))
          .returns({execute: () => {}} as UI.ActionRegistration.Action);
      item.clicked(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));

      assert.isTrue(contextMenuShow.calledOnce);
      assert.exists(contextMenuShow.thisValues[0].defaultSection().items.find(
          (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Focus page'));
    });

    it('does not include focus debuggee item when docked', async () => {
      UI.DockController.DockController.instance().setDockSide(UI.DockController.DockState.BOTTOM);

      const item = Main.MainImpl.MainMenuItem.instance({forceNew: true}).item() as UI.Toolbar.ToolbarMenuButton;
      assertNotNullOrUndefined(item);

      const contextMenuShow = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'action').withArgs('main.toggle-drawer').returns({
        execute: () => {},
      } as UI.ActionRegistration.Action);
      item.clicked(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));

      assert.isTrue(contextMenuShow.calledOnce);
      assert.notExists(contextMenuShow.thisValues[0].defaultSection().items.find(
          (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Focus page'));
    });
  };
  describe('without tab target', () => focusDebuggee(() => createTarget()));
  describe('with tab target', () => focusDebuggee(() => {
                                const tabTaget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTaget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTaget});
                              }));
});
