// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import {findMenuItemWithLabel, getContextMenuForElement} from '../../testing/ContextMenuHelpers.js';
import {dispatchPasteEvent} from '../../testing/DOMHelpers.js';
import {createTarget, registerNoopActions} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {stubFileManager} from '../../testing/FileManagerHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Console from './console.js';

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

  it('can save to file', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    const target = createTarget({parentTarget: tabTarget});

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);
    consoleModel.addMessage(createConsoleMessage(target, 'message 1'));
    consoleModel.addMessage(createConsoleMessage(target, 'message 2'));
    const messagesElement = consoleView.element.querySelector('#console-messages');
    assert.exists(messagesElement);

    const contextMenu = getContextMenuForElement(messagesElement);
    const saveAsItem = findMenuItemWithLabel(contextMenu.saveSection(), 'Save as...');
    assert.exists(saveAsItem);

    const TIMESTAMP = 42;
    const URL_HOST = 'example.com';
    sinon.stub(Date, 'now').returns(TIMESTAMP);
    target.setInspectedURL(`http://${URL_HOST}/foo` as Platform.DevToolsPath.UrlString);
    const FILENAME = `${URL_HOST}-${TIMESTAMP}.log` as Platform.DevToolsPath.RawPathString;
    const fileManager = stubFileManager();
    const fileManagerCloseCall = expectCall(fileManager.close);
    contextMenu.invokeHandler(saveAsItem.id());
    assert.isTrue(fileManager.save.calledOnceWith(FILENAME, '', true, false));
    await fileManagerCloseCall;
    assert.isTrue(fileManager.append.calledOnceWith(FILENAME, sinon.match('message 1\nmessage 2\n')));
  });

  async function getConsoleMessages() {
    const messagesElement = consoleView.element.querySelector('#console-messages');
    assert.exists(messagesElement);

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
      assert.exists(consoleModel);
      SDK.ConsoleModel.ConsoleModel.requestClearMessages();
      consoleModel.addMessage(createConsoleMessage(target, 'message 1'));
      consoleModel.addMessage(createConsoleMessage(target, 'message 2'));

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, inScope ? ['message 1', 'message 2'] : []);
    });

    it('prints results', async () => {
      const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assert.exists(consoleModel);
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
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
    Common.Settings.Settings.instance().moduleSetting('preserve-console-log').set(preserveLog);
    const target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    const anotherTarget = createTarget();
    consoleView.markAsRoot();
    consoleView.show(document.body);

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);
    consoleModel.addMessage(createConsoleMessage(target, 'message 1'));
    consoleModel.addMessage(createConsoleMessage(target, 'message 2'));

    const anotherConsoleModel = anotherTarget.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(anotherConsoleModel);
    anotherConsoleModel.addMessage(createConsoleMessage(anotherTarget, 'message 3'));
    assert.deepEqual(await getConsoleMessages(), ['message 1', 'message 2']);

    SDK.TargetManager.TargetManager.instance().setScopeTarget(anotherTarget);
    assert.deepEqual(await getConsoleMessages(), preserveLog ? ['message 1', 'message 2', 'message 3'] : ['message 3']);

    Common.Settings.Settings.instance().moduleSetting('preserve-console-log').set(false);
  };

  it('replaces messages when switching scope with preserve log off', handlesSwitchingScope(false));
  it('appends messages when switching scope with preserve log on', handlesSwitchingScope(true));

  describe('self-XSS warning', () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      consoleView.markAsRoot();
      consoleView.show(document.body);
    });

    it('shows', async () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'foo');

      const messagesElement = consoleView.element.querySelector('#console-messages');
      assert.instanceOf(messagesElement, HTMLElement);
      dispatchPasteEvent(messagesElement, {clipboardData: dt, bubbles: true});
      assert.strictEqual(
          Common.Console.Console.instance().messages()[0].text,
          'Warning: Don’t paste code into the DevTools Console that you don’t understand or haven’t reviewed yourself. This could allow attackers to steal your identity or take control of your computer. Please type ‘allow pasting’ below and hit Enter to allow pasting.');
    });

    it('is turned off when console history reaches a length of 5', async () => {
      const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assert.exists(consoleModel);
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
      SDK.ConsoleModel.ConsoleModel.requestClearMessages();

      const selfXssWarningDisabledSetting = Common.Settings.Settings.instance().createSetting(
          'disable-self-xss-warning', false, Common.Settings.SettingStorageType.SYNCED);

      for (let i = 0; i < 5; i++) {
        assert.isFalse(selfXssWarningDisabledSetting.get());
        consoleModel.dispatchEventToListeners(
            SDK.ConsoleModel.Events.MessageAdded,
            createConsoleMessage(target, String(i), SDK.ConsoleModel.FrontendMessageType.Command));
      }
      assert.isTrue(selfXssWarningDisabledSetting.get());
    });

    it('is not shown when disabled via command line', () => {
      const stub = sinon.stub(Root.Runtime.Runtime, 'queryParam');
      stub.withArgs('disableSelfXssWarnings').returns('true');

      const dt = new DataTransfer();
      dt.setData('text/plain', 'foo');

      const messagesElement = consoleView.element.querySelector('#console-messages');
      assert.instanceOf(messagesElement, HTMLElement);
      dispatchPasteEvent(messagesElement, {clipboardData: dt, bubbles: true});

      assert.strictEqual(Common.Console.Console.instance().messages().length, 0);
      stub.restore();
    });
  });

  it('appends commands to the history right away', async () => {
    const target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    consoleView.markAsRoot();
    consoleView.show(document.body);

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);
    const consoleHistorySetting = Common.Settings.Settings.instance().createLocalSetting('console-history', []);

    consoleModel.dispatchEventToListeners(
        SDK.ConsoleModel.Events.MessageAdded,
        createConsoleMessage(target, 'await new Promise(() => ())', SDK.ConsoleModel.FrontendMessageType.Command));

    assert.deepStrictEqual(consoleHistorySetting.get(), ['await new Promise(() => ())']);
  });

  it('keeps updating the issue counter when re-attached after detaching', async () => {
    consoleView.markAsRoot();
    const spy = sinon.spy(consoleView, 'issuesCountUpdatedForTest');
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED);
    assert.isTrue(spy.calledOnce);

    // Pauses updating the issue counter
    consoleView.onDetach();
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED);
    assert.isTrue(spy.calledOnce);

    // Continues updating the issue counter
    consoleView.show(document.body);
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED);
    assert.isTrue(spy.calledTwice);
  });
});
