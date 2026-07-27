// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {findMenuItemWithLabel, getContextMenuForElement} from '../../testing/ContextMenuHelpers.js';
import {dispatchPasteEvent, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
  registerNoopActions,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall, expectCalled} from '../../testing/ExpectStubCall.js';
import {stubFileManager} from '../../testing/FileManagerHelpers.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';
import {AiCodeCompletionSummaryToolbar} from '../common/common.js';

import * as Console from './console.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('ConsoleView', () => {
  let consoleView: Console.ConsoleView.ConsoleView;
  let universe: TestUniverse;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    sinon.stub(Workspace.IgnoreListManager.IgnoreListManager, 'instance').returns(universe.ignoreListManager);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);
    sinon.stub(IssuesManager.IssuesManager.IssuesManager, 'instance').returns(universe.issuesManager);
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);
    sinon.stub(Workspace.Workspace.WorkspaceImpl, 'instance').returns(universe.workspace);

    registerNoopActions(['console.clear', 'console.clear.history', 'console.create-pin']);
    consoleView = Console.ConsoleView.ConsoleView.instance({forceNew: true, viewportThrottlerTimeout: 0});
  });

  afterEach(() => {
    consoleView.dispose();
    Console.ConsoleView.ConsoleView.clearConsoleViewInstanceForTest();
    consoleView.detach();
  });

  it('expands a minimized drawer when toggling console', () => {
    const inspectorView = UI.InspectorView.InspectorView.instance({forceNew: true});
    const drawerVisibleStub = sinon.stub(inspectorView, 'drawerVisible').returns(true);
    const isDrawerMinimizedStub = sinon.stub(inspectorView, 'isDrawerMinimized').returns(true);
    const setDrawerMinimizedStub = sinon.stub(inspectorView, 'setDrawerMinimized');
    const hasFocusStub = sinon.stub(consoleView, 'hasFocus').returns(false);
    const bringToFrontStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'bringToFront');
    const showStub = sinon.stub(Common.Console.Console.instance(), 'show');
    const focusPromptStub = sinon.stub(consoleView, 'focusPrompt');

    const delegate = new Console.ConsoleView.ActionDelegate();
    assert.isTrue(delegate.handleAction({} as UI.Context.Context, 'console.toggle'));

    sinon.assert.calledOnceWithExactly(setDrawerMinimizedStub, false);
    sinon.assert.calledOnce(showStub);
    sinon.assert.calledOnce(focusPromptStub);
    sinon.assert.calledOnce(bringToFrontStub);

    drawerVisibleStub.restore();
    isDrawerMinimizedStub.restore();
    setDrawerMinimizedStub.restore();
    hasFocusStub.restore();
    bringToFrontStub.restore();
    showStub.restore();
    focusPromptStub.restore();
    UI.InspectorView.InspectorView.removeInstance();
  });

  it('minimizes drawer when console is already shown and focused in expanded drawer', () => {
    const inspectorView = UI.InspectorView.InspectorView.instance({forceNew: true});
    const drawerVisibleStub = sinon.stub(inspectorView, 'drawerVisible').returns(true);
    const isDrawerMinimizedStub = sinon.stub(inspectorView, 'isDrawerMinimized').returns(false);
    const setDrawerMinimizedStub = sinon.stub(inspectorView, 'setDrawerMinimized');
    const minimizeDrawerStub = sinon.stub(inspectorView, 'minimizeDrawer');
    const isShowingStub = sinon.stub(consoleView, 'isShowing').returns(true);
    const hasFocusStub = sinon.stub(consoleView, 'hasFocus').returns(true);
    const bringToFrontStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'bringToFront');
    const showStub = sinon.stub(Common.Console.Console.instance(), 'show');
    const focusPromptStub = sinon.stub(consoleView, 'focusPrompt');

    const delegate = new Console.ConsoleView.ActionDelegate();
    assert.isTrue(delegate.handleAction({} as UI.Context.Context, 'console.toggle'));

    sinon.assert.notCalled(setDrawerMinimizedStub);
    sinon.assert.calledOnce(minimizeDrawerStub);
    sinon.assert.notCalled(showStub);
    sinon.assert.notCalled(focusPromptStub);
    sinon.assert.notCalled(bringToFrontStub);

    drawerVisibleStub.restore();
    isDrawerMinimizedStub.restore();
    setDrawerMinimizedStub.restore();
    minimizeDrawerStub.restore();
    isShowingStub.restore();
    hasFocusStub.restore();
    bringToFrontStub.restore();
    showStub.restore();
    focusPromptStub.restore();
    UI.InspectorView.InspectorView.removeInstance();
  });

  it('focuses console prompt when drawer is expanded but console is not focused', () => {
    const inspectorView = UI.InspectorView.InspectorView.instance({forceNew: true});
    const drawerVisibleStub = sinon.stub(inspectorView, 'drawerVisible').returns(true);
    const isDrawerMinimizedStub = sinon.stub(inspectorView, 'isDrawerMinimized').returns(false);
    const setDrawerMinimizedStub = sinon.stub(inspectorView, 'setDrawerMinimized');
    const minimizeDrawerStub = sinon.stub(inspectorView, 'minimizeDrawer');
    const isShowingStub = sinon.stub(consoleView, 'isShowing').returns(true);
    const hasFocusStub = sinon.stub(consoleView, 'hasFocus').returns(false);
    const bringToFrontStub = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'bringToFront');
    const showStub = sinon.stub(Common.Console.Console.instance(), 'show');
    const focusPromptStub = sinon.stub(consoleView, 'focusPrompt');

    const delegate = new Console.ConsoleView.ActionDelegate();
    assert.isTrue(delegate.handleAction({} as UI.Context.Context, 'console.toggle'));

    sinon.assert.notCalled(minimizeDrawerStub);
    sinon.assert.notCalled(setDrawerMinimizedStub);
    sinon.assert.calledOnce(bringToFrontStub);
    sinon.assert.calledOnce(showStub);
    sinon.assert.calledOnce(focusPromptStub);

    drawerVisibleStub.restore();
    isDrawerMinimizedStub.restore();
    setDrawerMinimizedStub.restore();
    minimizeDrawerStub.restore();
    isShowingStub.restore();
    hasFocusStub.restore();
    bringToFrontStub.restore();
    showStub.restore();
    focusPromptStub.restore();
    UI.InspectorView.InspectorView.removeInstance();
  });

  it('adds a title to every checkbox label in the settings view', async () => {
    const consoleSettingsCheckboxes =
        consoleView.element.querySelector('devtools-toolbar')!.querySelectorAll('devtools-checkbox');
    assert.isOk(consoleSettingsCheckboxes, 'No checkbox found in console settings');
    for (const checkbox of consoleSettingsCheckboxes) {
      assert.isTrue(checkbox.shadowRoot?.querySelector('.devtools-checkbox-text')?.hasAttribute('title'));
    }
    // This test transitively schedules a task which may cause errors if the task
    // is run without the environments set in this test. Thus wait for its completion
    // before proceding to the next test.
    await consoleView.getScheduledRefreshPromiseForTest();
  });

  function createConsoleMessage(
      target: SDK.Target.Target,
      message: string,
      type: SDK.ConsoleModel.MessageType = Protocol.Runtime.ConsoleAPICalledEventType.Log,
      level: Protocol.Log.LogEntryLevel|null = null,
  ) {
    return new SDK.ConsoleModel.ConsoleMessage(
        target.model(SDK.RuntimeModel.RuntimeModel), Protocol.Log.LogEntrySource.Javascript, level, message, {type});
  }

  let globalMessageTimestamp = 0;

  function addMessage(
      consoleModel: SDK.ConsoleModel.ConsoleModel,
      target: SDK.Target.Target,
      message: string,
      type: SDK.ConsoleModel.MessageType,
      level: Protocol.Log.LogEntryLevel,
      timestamp?: number,
  ) {
    const consoleMessage = createConsoleMessage(target, message, type, level);
    consoleMessage.timestamp = timestamp ?? ++globalMessageTimestamp;
    consoleModel.addMessage(consoleMessage);
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
    const saveAsItem = findMenuItemWithLabel(contextMenu.saveSection(), 'Save as…');
    assert.exists(saveAsItem);

    const TIMESTAMP = 42;
    const URL_HOST = 'example.com';
    sinon.stub(Date, 'now').returns(TIMESTAMP);
    target.setInspectedURL(urlString`${`http://${URL_HOST}/foo`}`);
    const FILENAME = `${URL_HOST}-${TIMESTAMP}.log` as Platform.DevToolsPath.RawPathString;
    const fileManager = stubFileManager();
    const fileManagerCloseCall = expectCall(fileManager.close);
    contextMenu.invokeHandler(saveAsItem.id());
    assert.isTrue(fileManager.save.calledOnceWith(
        FILENAME, TextUtils.ContentData.EMPTY_TEXT_CONTENT_DATA, /* forceSaveAs=*/ true));
    await fileManagerCloseCall;
    assert.isTrue(fileManager.append.calledOnceWith(FILENAME, sinon.match('message 1\nmessage 2\n')));
  });

  it('can copy to clipboard', async () => {
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
    const copy = findMenuItemWithLabel(contextMenu.saveSection(), 'Copy console');
    assert.exists(copy);

    const copyText = sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'copyText').resolves();
    contextMenu.invokeHandler(copy.id());
    await expectCalled(copyText);
    sinon.assert.callCount(copyText, 1);
    assert.deepEqual(copyText.lastCall.args, ['message 1\nmessage 2\n']);
    copyText.resetHistory();
  });

  it('creates console history', () => {
    const target = createTarget();
    const id = 1;
    dispatchEvent(target, 'Runtime.executionContextCreated', {
      context: {
        id: id as Protocol.Runtime.ExecutionContextId,
        origin: 'http://example.com',
        name: `c${id}`,
        uniqueId: `c${id}`,
        auxData: {
          frameId: 'f2',
        },
      },
    });
    const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
    assert.exists(runtimeModel);
    const executionContext = runtimeModel.executionContext(id);
    assert.exists(executionContext);
    UI.Context.Context.instance().setFlavor(SDK.RuntimeModel.ExecutionContext, executionContext);

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);
    consoleModel.addMessage(createConsoleMessage(target, 'let x = 1;', SDK.ConsoleModel.FrontendMessageType.Command));
    consoleModel.addMessage(createConsoleMessage(target, 'let y = 100;', SDK.ConsoleModel.FrontendMessageType.Command));

    const consoleHistory = consoleView.getConsoleMessageHistory();
    assert.deepEqual(consoleHistory, 'let x = 1;\n\nlet y = 100;\n\n');
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
      renderElementIntoDOM(consoleView);
    });

    it('adds messages', async () => {
      const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assert.exists(consoleModel);
      SDK.ConsoleModel.ConsoleModel.requestClearMessages(SDK.TargetManager.TargetManager.instance());
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
      SDK.ConsoleModel.ConsoleModel.requestClearMessages(SDK.TargetManager.TargetManager.instance());
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
    renderElementIntoDOM(consoleView);

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

  it('replaces messages when switching scope with keep log off', handlesSwitchingScope(false));
  it('appends messages when switching scope with keep log on', handlesSwitchingScope(true));

  describe('self-XSS warning', () => {
    let target: SDK.Target.Target;

    beforeEach(() => {
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      consoleView.markAsRoot();
      renderElementIntoDOM(consoleView);
    });

    it('shows', async () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'foo');

      const messagesElement = consoleView.element.querySelector('#console-messages');
      assert.instanceOf(messagesElement, HTMLElement);
      dispatchPasteEvent(messagesElement, {clipboardData: dt, bubbles: true});
      assert.strictEqual(
          Common.Console.Console.instance().messages()[0].text,
          'Warning: Don’t paste code into the DevTools Console that you don’t understand or haven’t reviewed yourself. This could allow attackers to steal your identity or take control of your computer. Type "allow pasting" below and press Enter to allow pasting.');
    });

    it('is turned off when console history reaches a length of 5', async () => {
      const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assert.exists(consoleModel);
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
      SDK.ConsoleModel.ConsoleModel.requestClearMessages(SDK.TargetManager.TargetManager.instance());

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

      assert.lengthOf(Common.Console.Console.instance().messages(), 0);
      stub.restore();
    });
  });

  it('appends commands to the history right away', async () => {
    const target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    consoleView.markAsRoot();
    renderElementIntoDOM(consoleView);

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);
    const consoleHistorySetting = Common.Settings.Settings.instance().createLocalSetting('console-history', []);

    consoleModel.dispatchEventToListeners(
        SDK.ConsoleModel.Events.MessageAdded,
        createConsoleMessage(target, 'await new Promise(() => ())', SDK.ConsoleModel.FrontendMessageType.Command));

    assert.deepEqual(consoleHistorySetting.get(), ['await new Promise(() => ())']);
  });

  it('keeps updating the issue counter when re-attached after detaching', async () => {
    consoleView.markAsRoot();
    const spy = sinon.spy(consoleView, 'issuesCountUpdatedForTest');
    const issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED);
    sinon.assert.calledOnce(spy);

    // Pauses updating the issue counter
    consoleView.onDetach();
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED);
    sinon.assert.calledOnce(spy);

    // Continues updating the issue counter
    renderElementIntoDOM(consoleView);
    issuesManager.dispatchEventToListeners(IssuesManager.IssuesManager.Events.ISSUES_COUNT_UPDATED);
    sinon.assert.calledTwice(spy);
  });

  describe('ai code completion provider callbacks', () => {
    beforeEach(async () => {
      updateHostConfig({
        devToolsAiCodeCompletion: {
          enabled: true,
        },
        aidaAvailability: {
          enabled: true,
          blockedByAge: false,
          blockedByGeo: false,
        },
      });
      const aiCodeCompletionProviderStub =
          sinon.createStubInstance(TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider);
      aiCodeCompletionProviderStub.extension.returns([]);
      sinon.stub(TextEditor.AiCodeCompletionProvider.AiCodeCompletionProvider, 'createInstance')
          .returns(aiCodeCompletionProviderStub);
      sinon.stub(Host.AidaClient.HostConfigTracker, 'instance').returns({
        addEventListener: () => {},
        removeEventListener: () => {},
        dispose: () => {},
      } as unknown as Host.AidaClient.HostConfigTracker);
      Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', true);
      consoleView = Console.ConsoleView.ConsoleView.instance({forceNew: true, viewportThrottlerTimeout: 0});
    });

    it('initializes toolbar when the feature is enabled', async () => {
      const providerConfig = consoleView.aiCodeCompletionConfig;
      assert.exists(providerConfig);

      providerConfig.onFeatureEnabled();

      assert.exists(consoleView.element.querySelector('div.ai-code-completion-summary-toolbar-container'));
    });

    it('cleans up toolbar when the feature is disabled', async () => {
      const providerConfig = consoleView.aiCodeCompletionConfig;
      assert.exists(providerConfig);
      providerConfig.onFeatureEnabled();
      assert.exists(consoleView.element.querySelector('div.ai-code-completion-summary-toolbar-container'));

      providerConfig.onFeatureDisabled();

      assert.notExists(consoleView.element.querySelector('div.ai-code-completion-summary-toolbar-container'));
    });

    it('shows a loading state when a request is triggered', async () => {
      const setLoadingSpy =
          sinon.stub(AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar.prototype, 'setLoading');
      const providerConfig = consoleView.aiCodeCompletionConfig;
      assert.exists(providerConfig);
      providerConfig.onFeatureEnabled();

      providerConfig.onRequestTriggered();

      sinon.assert.calledOnce(setLoadingSpy);
      assert.isTrue(setLoadingSpy.firstCall.args[0]);
    });

    it('hides the loading indicator when a response is received', async () => {
      const setLoadingSpy =
          sinon.stub(AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar.prototype, 'setLoading');
      const providerConfig = consoleView.aiCodeCompletionConfig;
      assert.exists(providerConfig);
      providerConfig.onFeatureEnabled();
      providerConfig.onRequestTriggered();
      sinon.assert.calledOnce(setLoadingSpy);
      assert.isTrue(setLoadingSpy.firstCall.args[0]);

      providerConfig.onResponseReceived();

      sinon.assert.calledTwice(setLoadingSpy);
      assert.isFalse(setLoadingSpy.secondCall.args[0]);
    });

    it('attaches the citations toolbar when a suggestion with citations is accepted', async () => {
      const updateCitationsSpy =
          sinon.spy(AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar.prototype, 'updateCitations');
      const providerConfig = consoleView.aiCodeCompletionConfig;
      assert.exists(providerConfig);

      providerConfig.onFeatureEnabled();
      providerConfig.onResponseReceived();

      providerConfig.onSuggestionAccepted([{uri: 'https://example.com/source'}]);

      sinon.assert.calledOnce(updateCitationsSpy);
      assert.deepEqual(updateCitationsSpy.firstCall.args, [['https://example.com/source']]);
    });

    it('does not attach the citations toolbar if there are no citations', async () => {
      const updateCitationsSpy =
          sinon.spy(AiCodeCompletionSummaryToolbar.AiCodeCompletionSummaryToolbar.prototype, 'updateCitations');
      const providerConfig = consoleView.aiCodeCompletionConfig;
      assert.exists(providerConfig);

      providerConfig.onFeatureEnabled();
      providerConfig.onResponseReceived();

      providerConfig.onSuggestionAccepted([]);

      sinon.assert.notCalled(updateCitationsSpy);
    });
  });

  describe('group visibility', () => {
    let target: ReturnType<typeof createTarget>;
    let consoleModel: SDK.ConsoleModel.ConsoleModel|null;
    let messageTimestamp = 0;

    beforeEach(() => {
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assert.exists(consoleModel);
      messageTimestamp = 0;
      Common.Settings.Settings.instance().createSetting('console-group-similar', true).set(true);
    });

    for (const level
             of [Protocol.Log.LogEntryLevel.Error,
                 Protocol.Log.LogEntryLevel.Warning,
                 Protocol.Log.LogEntryLevel.Info,
                 Protocol.Log.LogEntryLevel.Verbose,
    ]) {
      it(`shows collapsed group but not message when filtering for ${level}`, async () => {
        const levels = Console.ConsoleFilter.ConsoleFilter.singleLevelMask(level);
        // Setting might exist, .set() is crucial
        Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);

        consoleView.markAsRoot();
        renderElementIntoDOM(consoleView);

        addMessage(
            consoleModel!, target, 'group', Protocol.Runtime.ConsoleAPICalledEventType.StartGroupCollapsed,
            Protocol.Log.LogEntryLevel.Info, ++messageTimestamp);
        addMessage(
            consoleModel!, target, 'message', Protocol.Runtime.ConsoleAPICalledEventType.Log, level,
            ++messageTimestamp);
        addMessage(
            consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
            Protocol.Log.LogEntryLevel.Info, ++messageTimestamp);

        const messages = await getConsoleMessages();
        assert.include(messages, 'group');
        assert.notInclude(messages, 'message');
      });

      it(`shows expanded group and message when filtering for ${level}`, async () => {
        const levels = Console.ConsoleFilter.ConsoleFilter.singleLevelMask(level);
        // Setting might exist, .set() is crucial
        Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);

        consoleView.markAsRoot();
        renderElementIntoDOM(consoleView);

        addMessage(
            consoleModel!, target, 'group', Protocol.Runtime.ConsoleAPICalledEventType.StartGroup,
            Protocol.Log.LogEntryLevel.Info, ++messageTimestamp);
        addMessage(
            consoleModel!, target, 'message', Protocol.Runtime.ConsoleAPICalledEventType.Log, level,
            ++messageTimestamp);
        addMessage(
            consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
            Protocol.Log.LogEntryLevel.Info, ++messageTimestamp);

        const messages = await getConsoleMessages();
        assert.include(messages, 'group');
        assert.include(messages, 'message');
      });
    }

    it(`does not show group when filtering for level it does not contain`, async () => {
      const levels = Console.ConsoleFilter.ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Warning);
      // Setting might exist, .set() is crucial
      Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);

      consoleView.markAsRoot();
      renderElementIntoDOM(consoleView);

      addMessage(
          consoleModel!, target, 'group', Protocol.Runtime.ConsoleAPICalledEventType.StartGroup,
          Protocol.Log.LogEntryLevel.Info, ++messageTimestamp);
      addMessage(
          consoleModel!, target, 'message', Protocol.Runtime.ConsoleAPICalledEventType.Log,
          Protocol.Log.LogEntryLevel.Error, ++messageTimestamp);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info, ++messageTimestamp);

      const messages = await getConsoleMessages();
      assert.notInclude(messages, 'group');
      assert.notInclude(messages, 'message');
    });

    it('hides nested groups when parent is collapsed', async () => {
      consoleView.markAsRoot();
      renderElementIntoDOM(consoleView);

      /* Emulate the following scenario pasted in the console:
         console.group('A')
         console.group('B')
         console.log('C')
         console.groupEnd() // B
         console.groupEnd() // A
      */
      addMessage(
          consoleModel!, target, 'A', Protocol.Runtime.ConsoleAPICalledEventType.StartGroup,
          Protocol.Log.LogEntryLevel.Info, ++messageTimestamp);
      addMessage(
          consoleModel!, target, 'B', Protocol.Runtime.ConsoleAPICalledEventType.StartGroup,
          Protocol.Log.LogEntryLevel.Info, ++messageTimestamp);
      addMessage(
          consoleModel!, target, 'C', Protocol.Runtime.ConsoleAPICalledEventType.Log, Protocol.Log.LogEntryLevel.Info,
          ++messageTimestamp);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info, ++messageTimestamp);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info, ++messageTimestamp);

      let messages = await getConsoleMessages();
      assert.include(messages, 'A', 'A should be visible');
      assert.include(messages, 'B', 'B should be visible');
      assert.include(messages, 'C', 'C should be visible');

      // Find the group A message view and collapse it
      const viewMessageA = consoleView.itemElement(0);
      (viewMessageA as Console.ConsoleViewMessage.ConsoleGroupViewMessage)!.setCollapsed(true);
      await consoleView.getScheduledRefreshPromiseForTest();

      messages = await getConsoleMessages();
      assert.include(messages, 'A', 'A should be visible after collapsing');
      assert.notInclude(messages, 'B', 'B should be hidden after collapsing parent A');
      assert.notInclude(messages, 'C', 'C should be hidden after collapsing parent A');
    });
  });

  describe('collapse all and expand all', () => {
    let target: ReturnType<typeof createTarget>;
    let consoleModel: SDK.ConsoleModel.ConsoleModel|null;

    beforeEach(() => {
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assert.exists(consoleModel);
      consoleView.markAsRoot();
      renderElementIntoDOM(consoleView);
    });

    it('collapseAll collapses expanded groups', async () => {
      addMessage(
          consoleModel!, target, 'group 1', Protocol.Runtime.ConsoleAPICalledEventType.StartGroup,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'inner message 1', Protocol.Runtime.ConsoleAPICalledEventType.Log,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'group 2', Protocol.Runtime.ConsoleAPICalledEventType.StartGroup,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'inner message 2', Protocol.Runtime.ConsoleAPICalledEventType.Log,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info);
      await consoleView.getScheduledRefreshPromiseForTest();

      // Both groups are expanded by default, so all group headers and messages are visible.
      assert.strictEqual(consoleView.itemCount(), 4);

      consoleView.collapseAll();

      // After collapsing, only the two group headers should be visible.
      assert.strictEqual(consoleView.itemCount(), 2);
    });

    it('expandAll expands collapsed groups', async () => {
      addMessage(
          consoleModel!, target, 'group 1', Protocol.Runtime.ConsoleAPICalledEventType.StartGroupCollapsed,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'inner message 1', Protocol.Runtime.ConsoleAPICalledEventType.Log,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'group 2', Protocol.Runtime.ConsoleAPICalledEventType.StartGroupCollapsed,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'inner message 2', Protocol.Runtime.ConsoleAPICalledEventType.Log,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info);
      await consoleView.getScheduledRefreshPromiseForTest();

      // Both groups are collapsed by default, so only group headers are visible.
      assert.strictEqual(consoleView.itemCount(), 2);

      consoleView.expandAll();

      // After expanding, all group headers and messages are visible.
      assert.strictEqual(consoleView.itemCount(), 4);
    });

    it('collapseAll then expandAll round-trips groups correctly', async () => {
      addMessage(
          consoleModel!, target, 'expanded group', Protocol.Runtime.ConsoleAPICalledEventType.StartGroup,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'expanded message', Protocol.Runtime.ConsoleAPICalledEventType.Log,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'collapsed group', Protocol.Runtime.ConsoleAPICalledEventType.StartGroupCollapsed,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'collapsed message', Protocol.Runtime.ConsoleAPICalledEventType.Log,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info);
      await consoleView.getScheduledRefreshPromiseForTest();

      // Mixed state: one expanded group and one collapsed group.
      assert.strictEqual(consoleView.itemCount(), 3);

      consoleView.collapseAll();
      assert.strictEqual(consoleView.itemCount(), 2);

      consoleView.expandAll();
      assert.strictEqual(consoleView.itemCount(), 4);
    });

    it('collapseAll collapses nested groups', async () => {
      addMessage(
          consoleModel!, target, 'outer', Protocol.Runtime.ConsoleAPICalledEventType.StartGroup,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'inner', Protocol.Runtime.ConsoleAPICalledEventType.StartGroup,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'deep message', Protocol.Runtime.ConsoleAPICalledEventType.Log,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info);
      await consoleView.getScheduledRefreshPromiseForTest();

      // All three are visible: outer, inner, deep message.
      assert.strictEqual(consoleView.itemCount(), 3);

      consoleView.collapseAll();

      // After collapse, only outer is visible.
      assert.strictEqual(consoleView.itemCount(), 1);
    });

    it('expandAll expands nested groups', async () => {
      addMessage(
          consoleModel!, target, 'outer', Protocol.Runtime.ConsoleAPICalledEventType.StartGroupCollapsed,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'inner', Protocol.Runtime.ConsoleAPICalledEventType.StartGroupCollapsed,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, 'deep message', Protocol.Runtime.ConsoleAPICalledEventType.Log,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info);
      addMessage(
          consoleModel!, target, '', Protocol.Runtime.ConsoleAPICalledEventType.EndGroup,
          Protocol.Log.LogEntryLevel.Info);
      await consoleView.getScheduledRefreshPromiseForTest();

      // All collapsed, only outer visible.
      assert.strictEqual(consoleView.itemCount(), 1);

      consoleView.expandAll();

      // After expanding, all three are visible.
      assert.strictEqual(consoleView.itemCount(), 3);
    });
  });

  describe('filtering', () => {
    let target: ReturnType<typeof createTarget>;
    let consoleModel: SDK.ConsoleModel.ConsoleModel|null;

    beforeEach(() => {
      target = createTarget();
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
      consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assert.exists(consoleModel);
      consoleView.markAsRoot();
      renderElementIntoDOM(consoleView);

      addMessage(consoleModel, target, 'sample info', Protocol.Runtime.ConsoleAPICalledEventType.Info,
                 Protocol.Log.LogEntryLevel.Info);
      addMessage(consoleModel, target, 'sample log', Protocol.Runtime.ConsoleAPICalledEventType.Log,
                 Protocol.Log.LogEntryLevel.Info);
      addMessage(consoleModel, target, 'sample warning', Protocol.Runtime.ConsoleAPICalledEventType.Warning,
                 Protocol.Log.LogEntryLevel.Warning);
      addMessage(consoleModel, target, 'sample debug', Protocol.Runtime.ConsoleAPICalledEventType.Debug,
                 Protocol.Log.LogEntryLevel.Verbose);
      addMessage(consoleModel, target, 'sample error', Protocol.Runtime.ConsoleAPICalledEventType.Error,
                 Protocol.Log.LogEntryLevel.Error);
      addMessage(consoleModel, target, 'abc info', Protocol.Runtime.ConsoleAPICalledEventType.Info,
                 Protocol.Log.LogEntryLevel.Info);
      addMessage(consoleModel, target, 'def info', Protocol.Runtime.ConsoleAPICalledEventType.Info,
                 Protocol.Log.LogEntryLevel.Info);
      addMessage(consoleModel, target, 'abc warn', Protocol.Runtime.ConsoleAPICalledEventType.Warning,
                 Protocol.Log.LogEntryLevel.Warning);
      addMessage(consoleModel, target, 'def warn', Protocol.Runtime.ConsoleAPICalledEventType.Warning,
                 Protocol.Log.LogEntryLevel.Warning);
      consoleModel.addMessage(
          createConsoleMessage(target, '\'Should be always visible\'', SDK.ConsoleModel.FrontendMessageType.Command));
      consoleModel.addMessage(
          createConsoleMessage(target, '\'Should be always visible\'', SDK.ConsoleModel.FrontendMessageType.Result));
    });

    it('shows messages for all levels', async () => {
      const levels = Console.ConsoleFilter.ConsoleFilter.allLevelsFilterValue();
      Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);
      await consoleView.getScheduledRefreshPromiseForTest();

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, [
        'sample info',
        'sample log',
        'sample warning',
        'sample debug',
        'sample error',
        'abc info',
        'def info',
        'abc warn',
        'def warn',
        '"\'Should be always visible\'"',
      ]);
    });

    it('shows messages for default levels', async () => {
      const levels = Console.ConsoleFilter.ConsoleFilter.defaultLevelsFilterValue();
      Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);
      await consoleView.getScheduledRefreshPromiseForTest();

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, [
        'sample info',
        'sample log',
        'sample warning',
        'sample error',
        'abc info',
        'def info',
        'abc warn',
        'def warn',
        '"\'Should be always visible\'"',
      ]);
    });

    it('shows messages for verbose level', async () => {
      const levels = Console.ConsoleFilter.ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Verbose);
      Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);
      await consoleView.getScheduledRefreshPromiseForTest();

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, [
        'sample debug',
        '"\'Should be always visible\'"',
      ]);
    });

    it('shows messages for info level', async () => {
      const levels = Console.ConsoleFilter.ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Info);
      Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);
      await consoleView.getScheduledRefreshPromiseForTest();

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, [
        'sample info',
        'sample log',
        'abc info',
        'def info',
        '"\'Should be always visible\'"',
      ]);
    });

    it('shows messages for warning and error levels', async () => {
      const levels = {
        [Protocol.Log.LogEntryLevel.Warning]: true,
        [Protocol.Log.LogEntryLevel.Error]: true,
      };
      Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);
      await consoleView.getScheduledRefreshPromiseForTest();

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, [
        'sample warning',
        'sample error',
        'abc warn',
        'def warn',
        '"\'Should be always visible\'"',
      ]);
    });

    it('filters messages by text', async () => {
      const levels = Console.ConsoleFilter.ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Verbose);
      Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);
      interface ConsoleViewFilter {
        textFilterUI: {setValue: (arg: string) => void};
        onFilterChanged: () => void;
      }
      const filter = (consoleView as unknown as {filter: ConsoleViewFilter}).filter;
      filter.textFilterUI.setValue('abc');
      filter.onFilterChanged();
      await consoleView.getScheduledRefreshPromiseForTest();

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, [
        '"\'Should be always visible\'"',
      ]);
    });

    it('filters messages by regex', async () => {
      const levels = Console.ConsoleFilter.ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Verbose);
      Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);
      interface ConsoleViewFilter {
        textFilterUI: {setValue: (arg: string) => void};
        onFilterChanged: () => void;
      }
      const filter = (consoleView as unknown as {filter: ConsoleViewFilter}).filter;
      filter.textFilterUI.setValue('/ab[a-z]/');
      filter.onFilterChanged();
      await consoleView.getScheduledRefreshPromiseForTest();

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, [
        '"\'Should be always visible\'"',
      ]);
    });

    it('filters messages by regex and warning level', async () => {
      const levels = Console.ConsoleFilter.ConsoleFilter.singleLevelMask(Protocol.Log.LogEntryLevel.Warning);
      Common.Settings.Settings.instance().createSetting('message-level-filters', levels).set(levels);
      interface ConsoleViewFilter {
        textFilterUI: {setValue: (arg: string) => void};
        onFilterChanged: () => void;
      }
      const filter = (consoleView as unknown as {filter: ConsoleViewFilter}).filter;
      filter.textFilterUI.setValue('/ab[a-z]/');
      filter.onFilterChanged();
      await consoleView.getScheduledRefreshPromiseForTest();

      const messages = await getConsoleMessages();
      assert.deepEqual(messages, [
        'abc warn',
        '"\'Should be always visible\'"',
      ]);
    });
  });

  describe('scroll preservation', () => {
    it('preserves scroll position when hidden and shown again', async () => {
      const tabTarget = createTarget({type: SDK.Target.Type.TAB});
      const target = createTarget({parentTarget: tabTarget});
      const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
      assert.exists(consoleModel);

      // Render consoleView into DOM with fixed height container.
      renderElementIntoDOM(consoleView, {height: 100});
      consoleView.element.style.height = '100%';
      const parentElement = consoleView.element.parentElement;
      assert.exists(parentElement);

      for (let i = 0; i < 100; i++) {
        consoleModel.addMessage(createConsoleMessage(target, `message ${i}`));
      }

      await consoleView.getScheduledRefreshPromiseForTest();

      const messagesElement = consoleView.element.querySelector('#console-messages') as HTMLElement;
      assert.exists(messagesElement);

      // Scroll to 10 and trigger wheel to update stickToBottom.
      messagesElement.scrollTop = 10;
      messagesElement.dispatchEvent(new Event('wheel'));

      assert.isTrue(messagesElement.scrollHeight > messagesElement.clientHeight, 'Viewport is not scrollable');
      assert.strictEqual(messagesElement.scrollTop, 10);

      // Hide and show again.
      consoleView.detach();
      consoleView.markAsRoot();
      consoleView.show(parentElement);

      assert.strictEqual(messagesElement.scrollTop, 10);
    });
  });

  it('renders console messages with invalid stacktraces', async () => {
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping =
        new Bindings.ResourceMapping.ResourceMapping(targetManager, Workspace.Workspace.WorkspaceImpl.instance());
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({forceNew: true});
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
      forceNew: true,
      resourceMapping,
      targetManager,
      ignoreListManager,
      workspace: Workspace.Workspace.WorkspaceImpl.instance(),
    });

    const target = createTarget();
    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);

    // Add invalid message.
    const badStackTrace = {
      callFrames: [
        {
          functionName: '',
          scriptId: 'invalid-ScriptId' as Protocol.Runtime.ScriptId,
          url: '',
          lineNumber: 0,
          columnNumber: 0,
        },
      ],
    };

    const badStackTraceMessage = new SDK.ConsoleModel.ConsoleMessage(
        target.model(SDK.RuntimeModel.RuntimeModel),
        Protocol.Log.LogEntrySource.Javascript,
        Protocol.Log.LogEntryLevel.Error,
        'This should be visible',
        {
          type: Protocol.Runtime.ConsoleAPICalledEventType.Error,
          stackTrace: badStackTrace,
        },
    );

    consoleView.markAsRoot();
    renderElementIntoDOM(consoleView);

    consoleModel.addMessage(badStackTraceMessage);

    await consoleView.getScheduledRefreshPromiseForTest();
    await UI.Widget.Widget.allUpdatesComplete;

    assert.strictEqual(consoleView.itemCount(), 1);
    const messageView = consoleView.itemElement(0) as Console.ConsoleViewMessage.ConsoleViewMessage;
    assert.exists(messageView);

    const contentElement = messageView.contentElement();
    const messageTextElement = contentElement.querySelector('.console-message-text');
    assert.exists(messageTextElement);
    assert.strictEqual(messageTextElement.textContent?.trim(), 'This should be visible');

    const stackTraceWrapper = contentElement.querySelector('.console-message-stack-trace-wrapper');
    assert.exists(stackTraceWrapper);

    const stackTraceElement = stackTraceWrapper.querySelector('.hidden-stack-trace');
    assert.exists(stackTraceElement);

    const previewWidgetElement = stackTraceElement.firstElementChild as HTMLElement;
    assert.exists(previewWidgetElement);
    assert.exists(previewWidgetElement.shadowRoot);

    const shadowRoot = previewWidgetElement.shadowRoot;
    const table = shadowRoot.querySelector('.stack-preview-container');
    assert.exists(table);

    const row = table.querySelector('tbody tr');
    assert.exists(row);

    const functionName = row.querySelector('.function-name')?.textContent?.trim();
    assert.strictEqual(functionName, '(anonymous)');

    const link = row.querySelector('.link')?.textContent?.trim();
    assert.strictEqual(link, '(unknown)');
  });

  it('shows timestamps when console-timestamps-enabled setting is toggled', async () => {
    const target = createTarget();
    SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    consoleView.markAsRoot();
    renderElementIntoDOM(consoleView);

    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);

    const timestampsSetting = Common.Settings.Settings.instance().moduleSetting('console-timestamps-enabled');
    timestampsSetting.set(false);

    const timestamp = 1400000000789;
    const message = new SDK.ConsoleModel.ConsoleMessage(
        target.model(SDK.RuntimeModel.RuntimeModel),
        Protocol.Log.LogEntrySource.Other,
        Protocol.Log.LogEntryLevel.Info,
        'Message with timestamp',
        {
          type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
          timestamp,
        },
    );

    consoleModel.addMessage(message);
    await consoleView.getScheduledRefreshPromiseForTest();
    await UI.Widget.Widget.allUpdatesComplete;

    assert.strictEqual(consoleView.itemCount(), 1);
    let itemElement = consoleView.itemElement(0) as Console.ConsoleViewMessage.ConsoleViewMessage;
    assert.exists(itemElement);
    assert.isNull(itemElement.contentElement().querySelector('.console-timestamp'));

    timestampsSetting.set(true);

    itemElement = consoleView.itemElement(0) as Console.ConsoleViewMessage.ConsoleViewMessage;
    let timestampElement = itemElement.contentElement().querySelector('.console-timestamp');
    assert.exists(timestampElement);
    const expectedFormattedTimestamp = UI.UIUtils.formatTimestamp(timestamp, false) + ' ';
    assert.strictEqual(timestampElement.textContent, expectedFormattedTimestamp);

    timestampsSetting.set(false);

    itemElement = consoleView.itemElement(0) as Console.ConsoleViewMessage.ConsoleViewMessage;
    timestampElement = itemElement.contentElement().querySelector('.console-timestamp');
    assert.isNull(timestampElement);
  });

  it('verifies viewport stick-to-bottom behavior when Console is opened', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    const target = createTarget({parentTarget: tabTarget});
    const consoleModel = target.model(SDK.ConsoleModel.ConsoleModel);
    assert.exists(consoleModel);

    for (let i = 0; i < 150; ++i) {
      consoleModel.addMessage(createConsoleMessage(target, `Message #${i}`));
    }

    consoleView.markAsRoot();
    renderElementIntoDOM(consoleView, {height: 200});

    await consoleView.getScheduledRefreshPromiseForTest();

    const viewport = (consoleView as unknown as {viewport: Console.ConsoleViewport.ConsoleViewport}).viewport;
    assert.exists(viewport);

    assert.isTrue(UI.UIUtils.isScrolledToBottom(viewport.element));
    assert.isTrue(viewport.stickToBottom());
  });

  describe('keyboard navigation', () => {
    let target: SDK.Target.Target;
    let consoleModel: SDK.ConsoleModel.ConsoleModel;

    beforeEach(() => {
      target = universe.createTarget();
      universe.targetManager.setScopeTarget(target);
      consoleView.markAsRoot();
      renderElementIntoDOM(consoleView);
      const model = target.model(SDK.ConsoleModel.ConsoleModel);
      assert.exists(model);
      consoleModel = model;
    });

    it('can navigate links by keyboard', async () => {
      const url = urlString`http://example.test/script.js`;
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: '1' as Protocol.Runtime.ScriptId,
        url: 'http://example.test/script.js',
        startLine: 0,
        startColumn: 0,
        endLine: 100,
        endColumn: 0,
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
      });

      const m1 = new SDK.ConsoleModel.ConsoleMessage(
          target.model(SDK.RuntimeModel.RuntimeModel),
          Protocol.Log.LogEntrySource.Javascript,
          Protocol.Log.LogEntryLevel.Info,
          'Before',
          {url, line: 10, column: 1},
      );
      const m2 = new SDK.ConsoleModel.ConsoleMessage(
          target.model(SDK.RuntimeModel.RuntimeModel),
          Protocol.Log.LogEntrySource.Javascript,
          Protocol.Log.LogEntryLevel.Info,
          'Text around www.chromium.org/1a multiple links, www.chromium.org/1b',
          {url, line: 20, column: 1},
      );
      const m3 = new SDK.ConsoleModel.ConsoleMessage(
          target.model(SDK.RuntimeModel.RuntimeModel),
          Protocol.Log.LogEntrySource.Javascript,
          Protocol.Log.LogEntryLevel.Info,
          'www.chromium.org/2',
          {url, line: 30, column: 1},
      );

      consoleModel.addMessage(m1);
      consoleModel.addMessage(m2);
      consoleModel.addMessage(m3);

      await consoleView.getScheduledRefreshPromiseForTest();

      consoleView.focus();

      const viewport = (consoleView as unknown as {viewport: Console.ConsoleViewport.ConsoleViewport}).viewport;
      const contentElement = viewport.contentElement() as HTMLElement;
      contentElement.focus();

      const getActiveElement = (): HTMLElement => {
        const el = UI.DOMUtilities.deepActiveElement(document);
        if (!el) {
          throw new Error('Active element is null');
        }
        return el as HTMLElement;
      };

      let activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '', 'script.js:31');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '', 'www.chromium.org/2');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'DIV');
      assert.isTrue(activeElement.classList.contains('console-message-wrapper'));

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '', 'script.js:21');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '', 'www.chromium.org/1b');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '', 'www.chromium.org/1a');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'DIV');
      assert.isTrue(activeElement.classList.contains('console-message-wrapper'));

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      activeElement = getActiveElement();
      assert.include(activeElement.textContent || '', 'www.chromium.org/1a');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      activeElement = getActiveElement();
      assert.include(activeElement.textContent || '', 'www.chromium.org/1b');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      activeElement = getActiveElement();
      assert.include(activeElement.textContent || '', 'script.js:21');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'DIV');
      assert.isTrue(activeElement.classList.contains('console-message-wrapper'));

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      activeElement = getActiveElement();
      assert.include(activeElement.textContent || '', 'www.chromium.org/2');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      activeElement = getActiveElement();
      assert.include(activeElement.textContent || '', 'script.js:31');
    });

    it('can navigate stack trace links by keyboard', async () => {
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: '1' as Protocol.Runtime.ScriptId,
        url: 'http://example.test/foo.js',
        startLine: 0,
        startColumn: 0,
        endLine: 100,
        endColumn: 0,
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
      });
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: '2' as Protocol.Runtime.ScriptId,
        url: 'http://example.test/console-key-links.js',
        startLine: 0,
        startColumn: 0,
        endLine: 100,
        endColumn: 0,
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
      });

      const stackTrace: Protocol.Runtime.StackTrace = {
        callFrames: [
          {
            functionName: 'fn1',
            scriptId: '1' as Protocol.Runtime.ScriptId,
            url: 'http://example.test/foo.js',
            lineNumber: 22,
            columnNumber: 0,
          },
          {
            functionName: '',
            scriptId: '2' as Protocol.Runtime.ScriptId,
            url: 'http://example.test/console-key-links.js',
            lineNumber: 75,
            columnNumber: 0,
          },
        ],
      };

      const message = new SDK.ConsoleModel.ConsoleMessage(
          target.model(SDK.RuntimeModel.RuntimeModel),
          Protocol.Log.LogEntrySource.Javascript,
          Protocol.Log.LogEntryLevel.Error,
          'Custom error with link www.chromium.org/linkInErrMsg',
          {
            type: Protocol.Runtime.ConsoleAPICalledEventType.Error,
            stackTrace,
          },
      );

      consoleModel.addMessage(message);

      await consoleView.getScheduledRefreshPromiseForTest();

      const messageView = consoleView.itemElement(0) as Console.ConsoleViewMessage.ConsoleViewMessage;
      assert.exists(messageView);

      // Wait for stack trace to be formatted.
      await messageView.formatErrorStackPromiseForTest();
      await UI.Widget.Widget.allUpdatesComplete;

      consoleView.focus();

      const viewport = (consoleView as unknown as {viewport: Console.ConsoleViewport.ConsoleViewport}).viewport;
      const contentElement = viewport.contentElement() as HTMLElement;
      contentElement.focus();

      const getActiveElement = (): HTMLElement => {
        const el = UI.DOMUtilities.deepActiveElement(document);
        if (!el) {
          throw new Error('Active element is null');
        }
        return el as HTMLElement;
      };

      let activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '',
                     'foo.js:23');  // The active element should be the message source link.

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true, composed: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '', 'www.chromium.org/linkInErrMsg');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true, composed: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'DIV');
      assert.isTrue(activeElement.classList.contains('console-message-wrapper'));

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, composed: true}));
      await UI.Widget.Widget.allUpdatesComplete;  // Wait for the expand rendering to complete.
      // ArrowDown should move focus to the link in the error message.
      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, composed: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '', 'www.chromium.org/linkInErrMsg');

      // ArrowDown should move focus to the source link.
      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, composed: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '', 'foo.js:23');

      // ArrowDown should move focus to the first frame of the stack trace.
      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, composed: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '', 'foo.js:23');

      // ArrowDown should move focus to the second frame of the stack trace.
      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, composed: true}));
      activeElement = getActiveElement();
      assert.strictEqual(activeElement.tagName, 'BUTTON');
      assert.include(activeElement.textContent || '', 'console-key-links.js:76');

      // ArrowDown should stay on the second frame of the stack trace.
      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, composed: true}));
      activeElement = getActiveElement();
      assert.include(activeElement.textContent || '', 'console-key-links.js:76');

      // Collapse the stack trace.
      const wrapper = messageView.element();
      wrapper.focus();
      assert.strictEqual(getActiveElement(), wrapper);

      wrapper.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true, composed: true}));
      await UI.Widget.Widget.allUpdatesComplete;

      // Verify it collapsed by navigating down.
      wrapper.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, composed: true}));
      activeElement = getActiveElement();
      assert.include(activeElement.textContent || '', 'www.chromium.org/linkInErrMsg');

      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, composed: true}));
      activeElement = getActiveElement();
      assert.include(activeElement.textContent || '', 'foo.js:23');  // The active element should be the source link.

      // Next ArrowDown should NOT go to stack trace, so it should stay on source link.
      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true, composed: true}));
      activeElement = getActiveElement();
      assert.include(activeElement.textContent || '', 'foo.js:23');
    });
  });

});
