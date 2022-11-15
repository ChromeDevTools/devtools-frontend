// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Console from '../../../../../front_end/panels/console/console.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

import type * as Platform from '../../../../../front_end/core/platform/platform.js';

const {assert} = chai;

describeWithMockConnection('ConsoleView', () => {
  beforeEach(() => {
    UI.ActionRegistration.maybeRemoveActionExtension('console.clear');
    UI.ActionRegistration.maybeRemoveActionExtension('console.clear.history');
    UI.ActionRegistration.maybeRemoveActionExtension('console.create-pin');
    UI.ActionRegistration.registerActionExtension({
      actionId: 'console.clear',
      category: UI.ActionRegistration.ActionCategory.CONSOLE,
      title: (): Platform.UIString.LocalizedString => 'mock' as Platform.UIString.LocalizedString,
    });
    UI.ActionRegistration.registerActionExtension({
      actionId: 'console.clear.history',
      category: UI.ActionRegistration.ActionCategory.CONSOLE,
      title: (): Platform.UIString.LocalizedString => 'mock' as Platform.UIString.LocalizedString,
    });
    UI.ActionRegistration.registerActionExtension({
      actionId: 'console.create-pin',
      category: UI.ActionRegistration.ActionCategory.CONSOLE,
      title: (): Platform.UIString.LocalizedString => 'mock' as Platform.UIString.LocalizedString,
    });
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
  });

  afterEach(() => {
    UI.ActionRegistration.maybeRemoveActionExtension('console.clear');
    UI.ActionRegistration.maybeRemoveActionExtension('console.clear.history');
    UI.ActionRegistration.maybeRemoveActionExtension('console.create-pin');
  });

  it('adds a title to every checkbox label in the settings view', async () => {
    const consoleView = Console.ConsoleView.ConsoleView.instance({forceNew: true});
    const consoleSettingsCheckboxes =
        consoleView.element.querySelector('.toolbar')?.shadowRoot?.querySelectorAll('.toolbar-item.checkbox');
    if (!consoleSettingsCheckboxes) {
      assert.fail('No checkbox found in console settings');
      return;
    }
    for (const checkbox of consoleSettingsCheckboxes) {
      assert.isTrue(checkbox.shadowRoot?.querySelector('.dt-checkbox-text')?.hasAttribute('title'));
    }
    // This test transitively schedules a task which may cause errors if the task
    // is run without the environments set in this test. Thus wait for its completion
    // before proceding to the next test.
    await consoleView.getScheduledRefreshPromiseForTest();
  });

  async function canSaveToFile(targetFactory: () => SDK.Target.Target) {
    const target = targetFactory();
    const consoleView = Console.ConsoleView.ConsoleView.instance({forceNew: true});
    SDK.ConsoleModel.ConsoleModel.instance().dispatchEventToListeners(
        SDK.ConsoleModel.Events.MessageAdded,
        new SDK.ConsoleModel.ConsoleMessage(
            target.model(SDK.RuntimeModel.RuntimeModel), Protocol.Log.LogEntrySource.Javascript, null, 'message 1'));
    SDK.ConsoleModel.ConsoleModel.instance().dispatchEventToListeners(
        SDK.ConsoleModel.Events.MessageAdded,
        new SDK.ConsoleModel.ConsoleMessage(
            target.model(SDK.RuntimeModel.RuntimeModel), Protocol.Log.LogEntrySource.Javascript, null, 'message 2'));
    const messagesElement = consoleView.element.querySelector('#console-messages');
    assertNotNullOrUndefined(messagesElement);

    const contextMenuShow = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    const contextMenuSetHandler = sinon.spy(UI.ContextMenu.ContextMenu.prototype, 'setHandler');
    messagesElement.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true}));
    assert.isTrue(contextMenuShow.calledOnce);
    const saveAsItem = contextMenuShow.thisValues[0].saveSection().items.find(
        (item: UI.ContextMenu.Item) => item.buildDescriptor().label === 'Save as...');
    assertNotNullOrUndefined(saveAsItem);
    const saveAsHandler = contextMenuSetHandler.getCalls().find(c => c.args[0] === saveAsItem.id());
    assertNotNullOrUndefined(saveAsHandler);

    const TIMESTAMP = 42;
    const URL_HOST = 'example.com';
    sinon.stub(Date, 'now').returns(TIMESTAMP);
    target.setInspectedURL(`http://${URL_HOST}/foo` as Platform.DevToolsPath.UrlString);
    const FILENAME = `${URL_HOST}-${TIMESTAMP}.log` as Platform.DevToolsPath.RawPathString;
    const fileManager = Workspace.FileManager.FileManager.instance();
    const fileManagerSave = sinon.stub(fileManager, 'save').resolves({fileSystemPath: FILENAME});
    const fileManagerAppendCall = new Promise<void>(
        resolve => sinon.stub(fileManager, 'append')
                       .withArgs(FILENAME, sinon.match('message 1\nmessage 2\n'))
                       .callsFake((_1, _2) => resolve()));
    const fileManagerCloseCall =
        new Promise<void>(resolve => sinon.stub(fileManager, 'close').callsFake(_ => resolve()));
    saveAsHandler.args[1]();
    assert.isTrue(fileManagerSave.calledOnceWith(FILENAME, '', true));
    await fileManagerAppendCall;
    fileManager.dispatchEventToListeners(Workspace.FileManager.Events.AppendedToURL, FILENAME);
    await fileManagerCloseCall;
  }

  it('can save to file without tab target', () => canSaveToFile(() => createTarget()));
  it('can save to file with tab target', () => canSaveToFile(() => {
                                           const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                           createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                           return createTarget({parentTarget: tabTarget});
                                         }));
});
