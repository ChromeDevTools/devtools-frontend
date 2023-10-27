// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Console from '../../../../../front_end/panels/console/console.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {assertElement, dispatchPasteEvent} from '../../helpers/DOMHelpers.js';
import {createTarget, registerNoopActions} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('ConsoleView', () => {
  let consoleView: Console.ConsoleView.ConsoleView;

  beforeEach(() => {
    registerNoopActions(['console.clear', 'console.clear.history', 'console.create-pin']);
    consoleView = Console.ConsoleView.ConsoleView.instance({forceNew: true, viewportThrottlerTimeout: 0});
  });

  afterEach(() => {
    consoleView.detach();
  });

  it('adds a title to every checkbox label in the settings view', async () => {
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

  function createConsoleMessage(
      target: SDK.Target.Target, message: string,
      type: SDK.ConsoleModel.MessageType = Protocol.Runtime.ConsoleAPICalledEventType.Log) {
    return new SDK.ConsoleModel.ConsoleMessage(
        target.model(SDK.RuntimeModel.RuntimeModel), Protocol.Log.LogEntrySource.Javascript, null, message, {type});
  }

  async function canSaveToFile(targetFactory: () => SDK.Target.Target) {
    const target = targetFactory();

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assertNotNullOrUndefined(consoleModel);
    consoleModel.addMessage(createConsoleMessage(target, 'message 1'));
    consoleModel.addMessage(createConsoleMessage(target, 'message 2'));
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

  async function getConsoleMessages() {
    const messagesElement = consoleView.element.querySelector('#console-messages');
    assertNotNullOrUndefined(messagesElement);

    await new Promise(resolve => setTimeout(resolve, 0));
    return [...messagesElement.querySelectorAll('.console-message-text')].map(e => (e as HTMLElement).innerText);
  }

  const messageTests = (inScope: boolean) => () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(inScope ? target : null);
      consoleView.markAsRoot();
      consoleView.show(document.body);
    });

    it('adds messages', async () => {
      const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assertNotNullOrUndefined(consoleModel);
      SDK.ConsoleModel.ConsoleModel.requestClearMessages();
      consoleModel.addMessage(createConsoleMessage(target, 'message 1'));
      consoleModel.addMessage(createConsoleMessage(target, 'message 2'));

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, inScope ? ['message 1', 'message 2'] : []);
    });

    it('prints results', async () => {
      const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assertNotNullOrUndefined(consoleModel);
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assertNotNullOrUndefined(runtimeModel);
      SDK.ConsoleModel.ConsoleModel.requestClearMessages();
      consoleModel.dispatchEventToListeners(SDK.ConsoleModel.Events.CommandEvaluated, {
        result: new SDK.RemoteObject.RemoteObjectImpl(runtimeModel, undefined, 'number', undefined, 42),
        commandMessage: createConsoleMessage(target, '[ultimateQuestionOfLife, theUniverse, everything].join()'),
      });

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, inScope ? ['42'] : []);
    });
  };

  describe('in scope', messageTests(true));
  describe('out of scope', messageTests(false));

  const handlesSwitchingScope = (preserveLog: boolean) => async () => {
    Common.Settings.Settings.instance().moduleSetting('preserveConsoleLog').set(preserveLog);
    const target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const anotherTarget = createTarget();
    consoleView.markAsRoot();
    consoleView.show(document.body);

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assertNotNullOrUndefined(consoleModel);
    consoleModel.addMessage(createConsoleMessage(target, 'message 1'));
    consoleModel.addMessage(createConsoleMessage(target, 'message 2'));

    const anotherConsoleModel = anotherTarget.model(SDK.ConsoleModel.ConsoleModel);
    assertNotNullOrUndefined(anotherConsoleModel);
    anotherConsoleModel.addMessage(createConsoleMessage(anotherTarget, 'message 3'));
    assert.deepEqual(await getConsoleMessages(), ['message 1', 'message 2']);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(anotherTarget);
    assert.deepEqual(await getConsoleMessages(), preserveLog ? ['message 1', 'message 2', 'message 3'] : ['message 3']);

    Common.Settings.Settings.instance().moduleSetting('preserveConsoleLog').set(false);
  };

  it('replaces messages when switching scope with preserve log off', handlesSwitchingScope(false));
  it('appends messages when switching scope with preserve log on', handlesSwitchingScope(true));

  describe('self-XSS warning', () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.SELF_XSS_WARNING);
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      consoleView.markAsRoot();
      consoleView.show(document.body);
    });

    it('shows', async () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'foo');

      const messagesElement = consoleView.element.querySelector('#console-messages');
      assertElement(messagesElement, HTMLElement);
      dispatchPasteEvent(messagesElement, {clipboardData: dt, bubbles: true});
      assert.strictEqual(
          Common.Console.Console.instance().messages()[0].text,
          'Warning: Don’t paste code into the DevTools Console that you don’t understand or haven’t reviewed yourself. This could allow attackers to steal your identity or take control of your computer. Please type ‘allow pasting’ below to allow pasting.');
    });

    it('is turned off when console history reaches a length of 5', async () => {
      const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assertNotNullOrUndefined(consoleModel);
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assertNotNullOrUndefined(runtimeModel);
      SDK.ConsoleModel.ConsoleModel.requestClearMessages();

      const selfXssWarningDisabledSetting = Common.Settings.Settings.instance().createSetting(
          'disableSelfXssWarning', false, Common.Settings.SettingStorageType.Synced);

      for (let i = 0; i < 5; i++) {
        assert.isFalse(selfXssWarningDisabledSetting.get());
        consoleModel.dispatchEventToListeners(
            SDK.ConsoleModel.Events.MessageAdded,
            createConsoleMessage(target, String(i), SDK.ConsoleModel.FrontendMessageType.Command));
      }
      assert.isTrue(selfXssWarningDisabledSetting.get());
    });
  });

  it('appends commands to the history right away', async () => {
    const target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    consoleView.markAsRoot();
    consoleView.show(document.body);

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assertNotNullOrUndefined(consoleModel);
    const consoleHistorySetting = Common.Settings.Settings.instance().createLocalSetting('consoleHistory', []);

    consoleModel.dispatchEventToListeners(
        SDK.ConsoleModel.Events.MessageAdded,
        createConsoleMessage(target, 'await new Promise(() => ())', SDK.ConsoleModel.FrontendMessageType.Command));

    assert.deepStrictEqual(consoleHistorySetting.get(), ['await new Promise(() => ())']);
  });
});
