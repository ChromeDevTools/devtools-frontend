// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  createConsoleViewMessageWithStubDeps,
  createStackTrace,
} from '../../testing/ConsoleHelpers.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {dispatchEvent} from '../../testing/MockConnection.js';
import {mockResourceTree} from '../../testing/ResourceTreeHelpers.js';
import type * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';
// The css files aren't exported by the bundle, so we need to import it directly.
// eslint-disable-next-line @devtools/es-modules-import
import consoleViewStyles from './consoleView.css.js';

describeWithEnvironment('ConsoleViewMessage', () => {
  describe('anchor rendering', () => {
    it('links to the top frame for normal console message', () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const stackTrace = createStackTrace([
        'USER_ID::userNestedFunction::http://example.com/script.js::40::15',
        'USER_ID::userFunction::http://example.com/script.js::10::2',
        'APP_ID::entry::http://example.com/app.js::25::10',
      ]);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
        stackTrace,
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          /* level */ null,
          'got here',
          messageDetails,
      );
      const {message, linkifier} = createConsoleViewMessageWithStubDeps(rawMessage);

      message.toMessageElement();  // Trigger rendering.

      sinon.assert.calledOnceWithExactly(
          linkifier.linkifyStackTraceTopFrame,
          target,
          stackTrace,
      );
    });

    it('links to the frame with the logpoint/breakpoint if the stack trace contains the "marker sourceURL"', () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const stackTrace = createStackTrace([
        `LOG_ID::eval::${SDK.DebuggerModel.LOGPOINT_SOURCE_URL}::0::15`,
        'USER_ID::userFunction::http://example.com/script.js::10::2',
        'APP_ID::entry::http://example.com/app.js::25::10',
      ]);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
        stackTrace,
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          /* level */ null,
          'value of x is 42',
          messageDetails,
      );
      const {message, linkifier} = createConsoleViewMessageWithStubDeps(rawMessage);

      message.toMessageElement();  // Trigger rendering.

      const expectedCallFrame = stackTrace.callFrames[1];  // userFunction.
      sinon.assert.calledOnceWithExactly(
          linkifier.maybeLinkifyConsoleCallFrame,
          target,
          expectedCallFrame,
          {revealBreakpoint: true, userMetric: undefined},
      );
    });

    it('uses the last "marker sourceURL" frame when searching for the breakpoint/logpoint frame', () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const stackTrace = createStackTrace([
        `LOG_ID::leakedClosure::${SDK.DebuggerModel.LOGPOINT_SOURCE_URL}::2::3`,
        'USER_ID::callback::http://example.com/script.js::5::42',
        `LOG_ID::eval::${SDK.DebuggerModel.LOGPOINT_SOURCE_URL}::0::15`,
        'USER_ID::userFunction::http://example.com/script.js::10::2',
        'APP_ID::entry::http://example.com/app.js::25::10',
      ]);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
        stackTrace,
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          /* level */ null,
          'value of x is 42',
          messageDetails,
      );
      const {message, linkifier} = createConsoleViewMessageWithStubDeps(rawMessage);

      message.toMessageElement();  // Trigger rendering.

      const expectedCallFrame = stackTrace.callFrames[3];  // userFunction.
      sinon.assert.calledOnceWithExactly(
          linkifier.maybeLinkifyConsoleCallFrame,
          target,
          expectedCallFrame,
          {revealBreakpoint: true, userMetric: undefined},
      );
    });

    it('reveals script location on click for message added before script was parsed', async () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);

      const targetManager = SDK.TargetManager.TargetManager.instance();
      const workspace = Workspace.Workspace.WorkspaceImpl.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(
          targetManager,
          workspace,
      );
      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({
        forceNew: true,
      });
      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        ignoreListManager,
        workspace,
      });

      const linkifier = new Components.Linkifier.Linkifier(100, false);
      linkifier.targetAdded(target);
      const requestResolver = sinon.createStubInstance(
          Logs.RequestResolver.RequestResolver,
      );
      const issuesResolver = sinon.createStubInstance(
          IssuesManager.IssueResolver.IssueResolver,
      );

      const url = Platform.DevToolsPath.urlString`http://example.com/source2.js`;
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Info,
          'hello?',
          {url},
      );
      const message = new Console.ConsoleViewMessage.ConsoleViewMessage(
          rawMessage,
          linkifier,
          requestResolver,
          issuesResolver,
          /* onResize */ () => {},
      );

      const messageElement = message.toMessageElement();
      const anchorElement = messageElement.querySelector(
                                '.devtools-link',
                                ) as HTMLElement;
      assert.exists(anchorElement);

      const revealStub = sinon.stub(Common.Revealer.RevealerRegistry.instance(), 'reveal').resolves();

      const scriptParsedEvent: Protocol.Debugger.ScriptParsedEvent = {
        scriptId: '1' as Protocol.Runtime.ScriptId,
        url,
        startLine: 0,
        startColumn: 0,
        endLine: 10,
        endColumn: 10,
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
        sourceMapURL: undefined,
        hasSourceURL: false,
        length: 10,
      };
      dispatchEvent(target, 'Debugger.scriptParsed', scriptParsedEvent);

      await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();

      anchorElement.click();

      sinon.assert.calledOnce(revealStub);
      const revealedLocation = revealStub.firstCall.args[0] as Workspace.UISourceCode.UILocation;
      assert.strictEqual(revealedLocation.uiSourceCode.url(), url);
    });
  });

  describe('formatParameter', () => {
    it('creates an editable object properties section for objects', async () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const remoteObject = SDK.RemoteObject.RemoteObject.fromLocalObject({
        foo: 'bar',
      });
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Info,
          '',
          {parameters: [remoteObject]},
      );
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();

      const propertiesSectionElement = messageElement.querySelector(
          '.console-view-object-properties-section',
      );
      assert.exists(propertiesSectionElement);

      const section = UI.Widget.Widget.get(propertiesSectionElement) as
          ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget;
      assert.exists(section);

      assert.exists(section.objectTree);
      assert.isFalse(section.objectTree.readOnly);
    });

    it('formats console.dir(document.__proto__) without exception', async () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
      const remoteObject = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        subtype: Protocol.Runtime.RemoteObjectSubtype.Node,
        className: 'HTMLDocument',
        description: 'HTMLDocument',
        objectId: '1' as Protocol.Runtime.RemoteObjectId,
      });
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Info,
          '',
          {
            type: Protocol.Runtime.ConsoleAPICalledEventType.Dir,
            parameters: [remoteObject],
          },
      );
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();
      renderElementIntoDOM(messageElement);
      await UI.Widget.Widget.allUpdatesComplete;
      await raf();

      const propertiesSectionElement = messageElement.querySelector(
          '.console-view-object-properties-section',
      );
      assert.exists(propertiesSectionElement);
      const tree = propertiesSectionElement.querySelector('devtools-tree');
      assert.exists(tree?.shadowRoot);
      assert.include(tree.shadowRoot.textContent || '', 'HTMLDocument');
    });

    it('formats an object which throws on string conversion without crashing', async () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
      const remoteObject = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        className: 'Object',
        description: 'Object',
        objectId: '1' as Protocol.Runtime.RemoteObjectId,
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          description: 'Object',
          overflow: false,
          properties: [
            {
              name: 'toString',
              type: Protocol.Runtime.PropertyPreviewType.Object,
              value: 'Object',
            },
          ],
        },
      });
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Info,
          '',
          {
            type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
            parameters: [remoteObject],
          },
      );
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();
      renderElementIntoDOM(messageElement);
      await UI.Widget.Widget.allUpdatesComplete;
      await raf();

      const propertiesSectionElement = messageElement.querySelector(
          '.console-view-object-properties-section',
      );
      assert.exists(propertiesSectionElement);
      const tree = propertiesSectionElement.querySelector('devtools-tree');
      assert.exists(tree?.shadowRoot);
      assert.include(tree.shadowRoot.textContent || '', 'toString');
    });

    it('formats native functions without exception', async () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);

      const mathRandomFunction = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Function,
        description: 'function random() { [native code] }',
        objectId: '1' as Protocol.Runtime.RemoteObjectId,
      });
      const appendChildFunction = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Function,
        description: 'function appendChild() { [native code] }',
        objectId: '2' as Protocol.Runtime.RemoteObjectId,
      });

      const rawMessage1 = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Info,
          '',
          {
            type: SDK.ConsoleModel.FrontendMessageType.Result,
            parameters: [mathRandomFunction],
          },
      );
      const {message: message1} = createConsoleViewMessageWithStubDeps(rawMessage1);

      const formattedPromise1 = expectCall(
          sinon.stub(
              message1,
              'formattedParameterAsFunctionForTest' as keyof typeof message1,
              ),
      );
      const messageElement1 = message1.toMessageElement();
      await formattedPromise1;
      assert.strictEqual(
          messageElement1.deepTextContent(),
          'ƒ random() { [native code] }',
      );

      const rawMessage2 = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Info,
          '',
          {
            type: SDK.ConsoleModel.FrontendMessageType.Result,
            parameters: [appendChildFunction],
          },
      );
      const {message: message2} = createConsoleViewMessageWithStubDeps(rawMessage2);

      const formattedPromise2 = expectCall(
          sinon.stub(
              message2,
              'formattedParameterAsFunctionForTest' as keyof typeof message2,
              ),
      );
      const messageElement2 = message2.toMessageElement();
      await formattedPromise2;
      assert.strictEqual(
          messageElement2.deepTextContent(),
          'ƒ appendChild() { [native code] }',
      );
    });

    it('formats performance getters (PerformanceTiming and MemoryInfo)', async () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModel);
      const performanceTimingObject = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        className: 'PerformanceTiming',
        description: 'PerformanceTiming',
        objectId: '1' as Protocol.Runtime.RemoteObjectId,
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          description: 'PerformanceTiming',
          overflow: true,
          properties: [
            {name: 'navigationStart', type: Protocol.Runtime.PropertyPreviewType.Number, value: '1000'},
            {name: 'unloadEventStart', type: Protocol.Runtime.PropertyPreviewType.Number, value: '0'},
            {name: 'unloadEventEnd', type: Protocol.Runtime.PropertyPreviewType.Number, value: '0'},
            {name: 'redirectStart', type: Protocol.Runtime.PropertyPreviewType.Number, value: '0'},
            {name: 'redirectEnd', type: Protocol.Runtime.PropertyPreviewType.Number, value: '0'},
          ],
        },
      });
      const memoryInfoObject = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        className: 'MemoryInfo',
        description: 'MemoryInfo',
        objectId: '2' as Protocol.Runtime.RemoteObjectId,
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          description: 'MemoryInfo',
          overflow: false,
          properties: [
            {name: 'totalJSHeapSize', type: Protocol.Runtime.PropertyPreviewType.Number, value: '10000000'},
            {name: 'usedJSHeapSize', type: Protocol.Runtime.PropertyPreviewType.Number, value: '1000000'},
            {name: 'jsHeapSizeLimit', type: Protocol.Runtime.PropertyPreviewType.Number, value: '2000000000'},
          ],
        },
      });
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Info,
          '',
          {
            type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
            parameters: [performanceTimingObject, memoryInfoObject],
          },
      );
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();
      renderElementIntoDOM(messageElement);
      await UI.Widget.Widget.allUpdatesComplete;
      await raf();

      const textContent = messageElement.deepTextContent();
      assert.include(textContent, 'PerformanceTiming');
      assert.include(textContent, 'navigationStart');
      assert.include(textContent, 'MemoryInfo');
      assert.include(textContent, 'totalJSHeapSize');
    });
  });
  describe('console insights', () => {
    const createMessage = (
        source: SDK.ConsoleModel.MessageSource,
        level: Protocol.Log.LogEntryLevel,
        messageText: string,
        ): HTMLElement => {
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
          .withArgs('explain.console-message.hover')
          .returns(true);
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          source,
          level,
          messageText,
      );
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();  // Trigger rendering.
      return messageElement;
    };

    it('shows a hover button', () => {
      const messageElement = createMessage(
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Error,
          'got here',
      );
      const button = messageElement.querySelector(
          '[aria-label=\'Understand this error\']',
      );
      assert.strictEqual(
          button?.querySelector('.button-label div')?.getAttribute('data-text'),
          'Understand this error',
      );
    });

    it('creates teaser on hover', () => {
      const messageElement = createMessage(
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Error,
          'got here',
      );
      const showTeaserStub = sinon.stub(
          Console.ConsoleInsightTeaser.ConsoleInsightTeaser.prototype,
          'show',
      );
      const generateTeaserStub = sinon.stub(
          Console.ConsoleInsightTeaser.ConsoleInsightTeaser.prototype,
          'maybeGenerateTeaser',
      );
      const builtInAi = AiAssistanceModel.BuiltInAi.BuiltInAi.instance();
      sinon.stub(builtInAi, 'isEventuallyAvailable').returns(true);
      messageElement.dispatchEvent(new MouseEvent('mouseenter'));
      sinon.assert.calledOnce(showTeaserStub);
      sinon.assert.calledOnce(generateTeaserStub);
    });

    it('does not show a hover button if the console message text is empty', () => {
      const messageElement = createMessage(
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Error,
          '',
      );
      const button = messageElement.querySelector(
          '[aria-label=\'Understand this error\']',
      );
      assert.isNull(button);
    });

    it('does not show a hover button for the self-XSS warning message', () => {
      const messageElement = createMessage(
          Common.Console.FrontendMessageSource.SELF_XSS,
          Protocol.Log.LogEntryLevel.Warning,
          'Don’t paste code...',
      );
      const button = messageElement.querySelector(
          '[aria-label=\'Understand this warning\']',
      );
      assert.isNull(button);
    });
  });

  describe('with ignore listing', () => {
    const IGNORE_LIST_LINK = 'ignore-list-link';

    function findStackPreviewContainer(element: HTMLElement) {
      const outer = element.querySelector('.stack-preview-container');
      assert.isNotNull(outer);
      const inner = outer.shadowRoot;
      assert.isNotNull(inner);
      return inner;
    }

    function findLinks(element: HTMLElement) {
      const root = findStackPreviewContainer(element);
      const showAll = root.querySelector('.show-all-link');
      assert.isNotNull(showAll);
      const showLess = root.querySelector('.show-less-link');
      assert.isNotNull(showLess);
      return {showAll, showLess};
    }

    function assertNoLinks(element: HTMLElement) {
      const {showAll, showLess} = findLinks(element);
      assert.isFalse(showAll.checkVisibility());
      assert.isFalse(showLess.checkVisibility());
    }

    function assertShowAllLink(element: HTMLElement) {
      const {showAll, showLess} = findLinks(element);
      assert.isTrue(showAll.checkVisibility());
      assert.isFalse(showLess.checkVisibility());
    }

    function assertShowLessLink(element: HTMLElement) {
      const {showAll, showLess} = findLinks(element);
      assert.isFalse(showAll.checkVisibility());
      assert.isTrue(showLess.checkVisibility());
    }

    function errorMessageForStack(
        stack: Protocol.Runtime.StackTrace,
        withBuiltinFrames?: boolean,
    ) {
      const lines = [
        'Error:',
        ...stack.callFrames.flatMap(frame => {
          const line = `    at ${frame.functionName} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`;
          if (withBuiltinFrames) {
            return [line, '    at JSON.parse (<anonymous>)'];
          }
          return [line];
        }),
      ];
      return lines.join('\n');
    }

    function getCallFrames(element: HTMLElement): string[] {
      const results = [];
      for (const line of element.querySelectorAll(
               '.formatted-stack-frame,.formatted-builtin-stack-frame',
               )) {
        if (line.checkVisibility()) {
          results.push(line.textContent);
        }
      }
      return results;
    }

    function getStructuredCallFrames(element: HTMLElement): string[] {
      const results = [];
      for (const line of findStackPreviewContainer(element).querySelectorAll(
               'tbody tr',
               )) {
        if (line.checkVisibility()) {
          results.push(line.textContent);
        }
      }
      return results;
    }

    async function expandStructuredTrace(element: HTMLElement) {
      (element.querySelector(
           '.console-message-stack-trace-wrapper > div',
           ) as HTMLElement)
          .click();
      await UI.Widget.Widget.allUpdatesComplete;
    }

    async function expandIgnored(element: HTMLElement) {
      const {showAll} = findLinks(element);
      (showAll.querySelector('.link') as HTMLElement).click();
      await UI.Widget.Widget.allUpdatesComplete;
    }

    async function collapseIgnored(element: HTMLElement) {
      const {showLess} = findLinks(element);
      (showLess.querySelector('.link') as HTMLElement).click();
      await UI.Widget.Widget.allUpdatesComplete;
    }

    async function createConsoleMessageWithIgnoreListing(
        ignoreListFn: (url: string) => boolean,
        withBuiltinFrames?: boolean,
        ): Promise<HTMLElement> {
      const connection = new MockCDPConnection([]);
      mockResourceTree(connection);
      const target = createTarget({connection});
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const stackTrace = createStackTrace([
        'USER_ID::userNestedFunction::http://example.com/script.js::40::15',
        'USER_ID::userFunction::http://example.com/script.js::10::2',
        'APP_ID::entry::http://example.com/app.js::25::10',
      ]);
      const stackTraceMessage = errorMessageForStack(
          stackTrace,
          withBuiltinFrames,
      );
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Error,
        stackTrace,
        parameters: [
          {
            type: 'object',
            subtype: 'error',
            className: 'Error',
            description: stackTraceMessage,
          } as Protocol.Runtime.RemoteObject,
        ],
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Error,
          stackTraceMessage,
          messageDetails,
      );
      const {message, linkifier} = createConsoleViewMessageWithStubDeps(rawMessage);

      linkifier.linkifyScriptLocation.callsFake(
          (_target, _scriptId, sourceURL, lineNumber, options) => {
            const link = Components.Linkifier.Linkifier.linkifyURL(sourceURL, {
              lineNumber,
              ...options,
            });
            if (ignoreListFn(sourceURL)) {
              link.classList.add(IGNORE_LIST_LINK);
            }
            return link;
          },
      );
      const originalLinkifyStackTraceFrame = Components.Linkifier.Linkifier.linkifyStackTraceFrame;
      sinon.stub(Components.Linkifier.Linkifier, 'linkifyStackTraceFrame').callsFake((frame, options) => {
        const link = originalLinkifyStackTraceFrame(frame, options);
        if ((frame.url && ignoreListFn(frame.url)) || (frame.uiSourceCode && ignoreListFn(frame.uiSourceCode.url()))) {
          link.classList.add(IGNORE_LIST_LINK);
        }
        return link;
      });
      const element = message.toMessageElement();  // Trigger rendering.

      const wrapperElement = document.createElement('div');
      const shadowElement = UI.UIUtils.createShadowRootWithCoreStyles(
          wrapperElement,
          {cssFile: consoleViewStyles},
      );
      shadowElement.appendChild(element);
      renderElementIntoDOM(wrapperElement);
      await raf();
      assert.isTrue(element.checkVisibility());
      return element;
    }

    const EXPANDED_UNSTRUCTURED = [
      '    at userNestedFunction (/script.js:40:15)\n',
      '    at userFunction (/script.js:10:2)\n',
      '    at entry (/app.js:25:10)',
    ];
    const COLLAPSED_UNSTRUCTURED = [
      '    at userNestedFunction (/script.js:40:15)\n',
      '    at userFunction (/script.js:10:2)\n',
    ];
    const EXPANDED_UNSTRUCTURED_WITH_BUILTIN = [
      '    at userNestedFunction (/script.js:40:15)\n',
      '    at JSON.parse (<anonymous>)\n',
      '    at userFunction (/script.js:10:2)\n',
      '    at JSON.parse (<anonymous>)\n',
      '    at entry (/app.js:25:10)\n',
      '    at JSON.parse (<anonymous>)',
    ];
    const COLLAPSED_UNSTRUCTURED_WITH_BUILTIN = [
      '    at userNestedFunction (/script.js:40:15)\n',
      '    at JSON.parse (<anonymous>)\n',
      '    at userFunction (/script.js:10:2)\n',
      '    at JSON.parse (<anonymous>)\n',
    ];
    const EXPANDED_STRUCTURED = [
      '\nuserNestedFunction @ /script.js:41',
      '\nuserFunction @ /script.js:11',
      '\nentry @ /app.js:26',
    ];
    const COLLAPSED_STRUCTURED = [
      '\nuserNestedFunction @ /script.js:41',
      '\nuserFunction @ /script.js:11',
    ];

    beforeEach(() => {
      const targetManager = SDK.TargetManager.TargetManager.instance();
      const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(
          targetManager,
          Workspace.Workspace.WorkspaceImpl.instance(),
      );
      const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({
        forceNew: true,
      });
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        ignoreListManager,
        workspace: Workspace.Workspace.WorkspaceImpl.instance(),
      });
    });

    it('shows everything with no links when nothing is ignore listed', async () => {
      const element = await createConsoleMessageWithIgnoreListing(_ => false);
      assertNoLinks(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED);
      assert.deepEqual(getStructuredCallFrames(element), []);
      await expandStructuredTrace(element);
      assertNoLinks(element);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
    });

    it('shows everything with no links when everything is ignore listed', async () => {
      const element = await createConsoleMessageWithIgnoreListing(_ => true);
      assertNoLinks(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED);
      assert.deepEqual(getStructuredCallFrames(element), []);
      await expandStructuredTrace(element);
      assertNoLinks(element);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
    });

    // Regression test for crbug.com/379788109: when all inline Error frames
    // are ignore-listed but the structured stack trace (console.error call
    // stack) has non-ignore-listed frames, the toggle should still appear.
    it('shows expandable list when all inline frames are ignored but structured trace has non-ignored frames',
       async () => {
         const connection = new MockCDPConnection([]);
         mockResourceTree(connection);
         const target = createTarget({connection});
         const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
         const errorStackTrace = createStackTrace([
           'USER_ID::userNestedFunction::http://example.com/script.js::40::15',
           'USER_ID::userFunction::http://example.com/script.js::10::2',
         ]);
         const consoleStackTrace = createStackTrace([
           'USER_ID::userNestedFunction::http://example.com/script.js::40::15',
           'USER_ID::userFunction::http://example.com/script.js::10::2',
           'APP_ID::entry::http://example.com/app.js::25::10',
         ]);
         const stackTraceMessage = errorMessageForStack(errorStackTrace);
         const messageDetails: SDK.ConsoleModel.ConsoleMessageDetails = {
           type: Protocol.Runtime.ConsoleAPICalledEventType.Error,
           stackTrace: consoleStackTrace,
           parameters: [
             {
               type: Protocol.Runtime.RemoteObjectType.Object,
               subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
               className: 'Error',
               description: stackTraceMessage,
             },
           ],
         };
         const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
             runtimeModel,
             Common.Console.FrontendMessageSource.ConsoleAPI,
             Protocol.Log.LogEntryLevel.Error,
             stackTraceMessage,
             messageDetails,
         );
         const {message} = createConsoleViewMessageWithStubDeps(rawMessage);

         // Inline Error frames: ALL ignore-listed (they are all script.js)
         // Structured stack trace: contains app.js which is not ignore-listed, so it has non-ignored frames!
         const originalLinkifyStackTraceFrame = Components.Linkifier.Linkifier.linkifyStackTraceFrame;
         sinon.stub(Components.Linkifier.Linkifier, 'linkifyStackTraceFrame').callsFake((frame, options) => {
           const link = originalLinkifyStackTraceFrame(frame, options);
           if (frame.url?.includes('/script.js') || frame.uiSourceCode?.url().includes('/script.js')) {
             link.classList.add(IGNORE_LIST_LINK);
           }
           return link;
         });
         const element = message.toMessageElement();
         await message.formatErrorStackPromiseForTest();

         const wrapperElement = document.createElement('div');
         const shadowElement = UI.UIUtils.createShadowRootWithCoreStyles(
             wrapperElement,
             {cssFile: consoleViewStyles},
         );
         shadowElement.appendChild(element);
         renderElementIntoDOM(wrapperElement);
         await raf();
         assert.isTrue(element.checkVisibility());

         // All inline frames are ignored, so with the fix they should be hidden
         // and the "Show ignore-listed frames" toggle should be visible.
         assertShowAllLink(element);
         assert.deepEqual(getCallFrames(element), []);

         // Clicking "Show ignore-listed frames" reveals them
         await expandIgnored(element);
         assertShowLessLink(element);
         assert.deepEqual(getCallFrames(element), [
           '    at userNestedFunction (/script.js:40:15)\n',
           '    at userFunction (/script.js:10:2)',
         ]);

         // Collapsing hides them again
         await collapseIgnored(element);
         assertShowAllLink(element);
         assert.deepEqual(getCallFrames(element), []);
       });

    it('shows expandable list when something is ignore listed', async () => {
      const element = await createConsoleMessageWithIgnoreListing(
          url => url.includes('/app.js'),
      );
      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), []);
      assert.deepEqual(getCallFrames(element), COLLAPSED_UNSTRUCTURED);
      await expandIgnored(element);
      assertShowLessLink(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED);
      await collapseIgnored(element);
      assertShowAllLink(element);

      await expandStructuredTrace(element);

      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), COLLAPSED_STRUCTURED);
      assert.deepEqual(getCallFrames(element), COLLAPSED_UNSTRUCTURED);
      await expandIgnored(element);
      assertShowLessLink(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
      await collapseIgnored(element);
      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), COLLAPSED_STRUCTURED);
      assert.deepEqual(getCallFrames(element), COLLAPSED_UNSTRUCTURED);
    });

    it('shows everything with no links when nothing is ignore listed, including builtin frames', async () => {
      const element = await createConsoleMessageWithIgnoreListing(
          _ => false,
          true,
      );
      assertNoLinks(element);
      assert.deepEqual(
          getCallFrames(element),
          EXPANDED_UNSTRUCTURED_WITH_BUILTIN,
      );
      assert.deepEqual(getStructuredCallFrames(element), []);
      await expandStructuredTrace(element);
      assertNoLinks(element);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
    });

    it('shows everything with no links when everything is ignore listed, including builtin frames', async () => {
      const element = await createConsoleMessageWithIgnoreListing(
          _ => true,
          true,
      );
      assertNoLinks(element);
      assert.deepEqual(
          getCallFrames(element),
          EXPANDED_UNSTRUCTURED_WITH_BUILTIN,
      );
      assert.deepEqual(getStructuredCallFrames(element), []);
      await expandStructuredTrace(element);
      assertNoLinks(element);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
    });

    it('shows expandable list when something is ignore listed, collapsing builtin frames', async () => {
      const element = await createConsoleMessageWithIgnoreListing(
          url => url.includes('/app.js'),
          true,
      );
      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), []);
      assert.deepEqual(
          getCallFrames(element),
          COLLAPSED_UNSTRUCTURED_WITH_BUILTIN,
      );
      await expandIgnored(element);
      assertShowLessLink(element);
      assert.deepEqual(
          getCallFrames(element),
          EXPANDED_UNSTRUCTURED_WITH_BUILTIN,
      );
      await collapseIgnored(element);
      assertShowAllLink(element);

      await expandStructuredTrace(element);

      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), COLLAPSED_STRUCTURED);
      assert.deepEqual(
          getCallFrames(element),
          COLLAPSED_UNSTRUCTURED_WITH_BUILTIN,
      );
      await expandIgnored(element);
      assertShowLessLink(element);
      assert.deepEqual(
          getCallFrames(element),
          EXPANDED_UNSTRUCTURED_WITH_BUILTIN,
      );
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
      await collapseIgnored(element);
      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), COLLAPSED_STRUCTURED);
      assert.deepEqual(
          getCallFrames(element),
          COLLAPSED_UNSTRUCTURED_WITH_BUILTIN,
      );
    });

    it('updates message anchor location when ignore listing pattern changes', async () => {
      const connection = new MockCDPConnection([]);
      mockResourceTree(connection);
      const target = createTarget({connection});
      const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
      assert.exists(debuggerModel);

      const linkifier = new Components.Linkifier.Linkifier();
      linkifier.targetAdded(target);

      // Dispatch scriptParsed events for foo.js, boo.js, and main.js.
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: '1' as Protocol.Runtime.ScriptId,
        url: 'http://example.com/foo.js',
        startLine: 0,
        startColumn: 0,
        endLine: 100,
        endColumn: 0,
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
        executionContextAuxData: {isDefault: true},
      });
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: '2' as Protocol.Runtime.ScriptId,
        url: 'http://example.com/boo.js',
        startLine: 0,
        startColumn: 0,
        endLine: 100,
        endColumn: 0,
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
        executionContextAuxData: {isDefault: true},
      });
      dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: '3' as Protocol.Runtime.ScriptId,
        url: 'http://example.com/main.js',
        startLine: 0,
        startColumn: 0,
        endLine: 100,
        endColumn: 0,
        executionContextId: 1 as Protocol.Runtime.ExecutionContextId,
        hash: '',
        buildId: '',
        executionContextAuxData: {isDefault: true},
      });

      const stackTrace = createStackTrace([
        '1::foo::http://example.com/foo.js::19::0',
        '2::boo::http://example.com/boo.js::26::0',
        '3::main::http://example.com/main.js::31::0',
      ]);
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Info,
          'trace',
          {
            type: Protocol.Runtime.ConsoleAPICalledEventType.Trace,
            stackTrace,
          },
      );

      const requestResolver = sinon.createStubInstance(
          Logs.RequestResolver.RequestResolver,
      );
      const issuesResolver = sinon.createStubInstance(
          IssuesManager.IssueResolver.IssueResolver,
      );
      const message = new Console.ConsoleViewMessage.ConsoleViewMessage(
          rawMessage,
          linkifier,
          requestResolver,
          issuesResolver,
          /* onResize */ () => {},
      );

      const element = message.toMessageElement();
      const debuggerWorkspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
      await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();

      const anchor = element.querySelector('.console-message-anchor');
      assert.exists(anchor);
      assert.strictEqual(anchor.textContent?.trim(), 'foo.js:20');

      const setting = Common.Settings.Settings.instance().resolve(
                          Workspace.IgnoreListManager.skipStackFramesPatternSettingDescriptor,
                          ) as Common.Settings.RegExpSetting;

      // Ignore-list foo.js: anchor should now point to boo.js:27.
      setting.setAsArray([{pattern: 'foo\\.js', disabled: false}]);
      await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();
      assert.strictEqual(anchor.textContent?.trim(), 'boo.js:27');

      // Ignore-list foo.js and boo.js: anchor should now point to main.js:32.
      setting.setAsArray([{pattern: 'foo\\.js|boo\\.js', disabled: false}]);
      await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();
      assert.strictEqual(anchor.textContent?.trim(), 'main.js:32');

      // Reset ignore list: anchor should point back to foo.js:20.
      setting.setAsArray([]);
      await debuggerWorkspaceBinding.pendingLiveLocationChangesPromise();
      assert.strictEqual(anchor.textContent?.trim(), 'foo.js:20');

      linkifier.dispose();
    });
  });

  describe('ConsoleTableMessageView', () => {
    let copyTextStub: sinon.SinonStub;

    beforeEach(() => {
      copyTextStub = sinon.stub(
          Host.InspectorFrontendHost.InspectorFrontendHostInstance,
          'copyText',
      );
    });

    afterEach(() => {
      copyTextStub.restore();
    });

    function createConsoleTableMessageView(
        rawMessage: SDK.ConsoleModel.ConsoleMessage,
    ) {
      const linkifier = sinon.createStubInstance(
          Components.Linkifier.Linkifier,
      );
      const requestResolver = sinon.createStubInstance(
          Logs.RequestResolver.RequestResolver,
      );
      const issuesResolver = sinon.createStubInstance(
          IssuesManager.IssueResolver.IssueResolver,
      );
      const message = new Console.ConsoleViewMessage.ConsoleTableMessageView(
          rawMessage,
          linkifier,
          requestResolver,
          issuesResolver,
          /* onResize */ () => {},
      );
      return {message, linkifier};
    }

    function setupMockTableMessageView() {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const preview: Protocol.Runtime.ObjectPreview = {
        type: Protocol.Runtime.ObjectPreviewType.Object,
        overflow: false,
        properties: [
          {
            name: '0',
            type: Protocol.Runtime.PropertyPreviewType.Object,
            valuePreview: {
              type: Protocol.Runtime.ObjectPreviewType.Object,
              overflow: false,
              properties: [
                {
                  name: 'a',
                  type: Protocol.Runtime.PropertyPreviewType.Number,
                  value: '1',
                },
              ],
            },
          },
        ],
      };

      const mockRemoteObject = sinon.createStubInstance(
          SDK.RemoteObject.RemoteObject,
      );
      Object.defineProperty(mockRemoteObject, 'preview', {
        get: () => preview,
        configurable: true,
      });
      Object.defineProperty(mockRemoteObject, 'type', {
        get: () => 'object',
        configurable: true,
      });
      Object.defineProperty(mockRemoteObject, 'subtype', {
        get: () => undefined,
        configurable: true,
      });
      Object.defineProperty(mockRemoteObject, 'description', {
        get: () => 'Object',
        configurable: true,
      });
      Object.defineProperty(mockRemoteObject, 'hasChildren', {
        get: () => false,
        configurable: true,
      });
      mockRemoteObject.customPreview.returns(null);

      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Table,
        parameters: [mockRemoteObject],
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          null,
          '',
          messageDetails,
      );
      const {message} = createConsoleTableMessageView(rawMessage);
      return message;
    }

    it('copies table as Markdown on context menu trigger', () => {
      const message = setupMockTableMessageView();

      message.toMessageElement();  // Render
      const dataGrid = message.getDataGridForTest();
      assert.exists(dataGrid);

      const contextMenu = new UI.ContextMenu.ContextMenu(
          new MouseEvent('contextmenu'),
      );
      message.populateTableContextMenuForTest(contextMenu);

      const clipboardSection = contextMenu.clipboardSection();
      const copySubMenu = clipboardSection.items.find(
          item => item.buildDescriptor().label === 'Copy table as',
      );
      assert.exists(copySubMenu);

      const subItems = (copySubMenu as UI.ContextMenu.SubMenu).defaultSection().items;
      const markdownItem = subItems.find(
          item => item.buildDescriptor().label === 'Copy as Markdown',
      );
      assert.exists(markdownItem);

      contextMenu.invokeHandler(markdownItem.id());
      const expectedMarkdown = '| \\(index\\) | a |\n' +
          '| --- | --- |\n' +
          '| 0 | 1 |';
      sinon.assert.calledOnceWithExactly(copyTextStub, expectedMarkdown);
    });

    it('copies table as CSV on context menu trigger', () => {
      const message = setupMockTableMessageView();

      message.toMessageElement();  // Render
      const dataGrid = message.getDataGridForTest();
      assert.exists(dataGrid);

      const contextMenu = new UI.ContextMenu.ContextMenu(
          new MouseEvent('contextmenu'),
      );
      message.populateTableContextMenuForTest(contextMenu);

      const clipboardSection = contextMenu.clipboardSection();
      const copySubMenu = clipboardSection.items.find(
          item => item.buildDescriptor().label === 'Copy table as',
      );
      assert.exists(copySubMenu);

      const subItems = (copySubMenu as UI.ContextMenu.SubMenu).defaultSection().items;
      const csvItem = subItems.find(
          item => item.buildDescriptor().label === 'Copy as CSV',
      );
      assert.exists(csvItem);

      contextMenu.invokeHandler(csvItem.id());
      const expectedCSV = '(index),a\n' +
          '0,1';
      sinon.assert.calledOnceWithExactly(copyTextStub, expectedCSV);
    });

    function setupMockTableMessageViewWithLargeObject(tableType: 'c'|'d') {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);

      const aProperties: Protocol.Runtime.PropertyPreview[] = [];
      const bProperties: Protocol.Runtime.PropertyPreview[] = [];

      for (let i = 0; i < 15; ++i) {
        bProperties.push({
          name: 'a' + i,
          type: Protocol.Runtime.PropertyPreviewType.String,
          value: 'a' + i,
        });
      }
      for (let i = 0; i < 15; ++i) {
        aProperties.push({
          name: 'b' + i,
          type: Protocol.Runtime.PropertyPreviewType.String,
          value: 'b' + i,
        });
        bProperties.push({
          name: 'b' + i,
          type: Protocol.Runtime.PropertyPreviewType.String,
          value: 'b' + i,
        });
      }

      const aPreview: Protocol.Runtime.ObjectPreview = {
        type: Protocol.Runtime.ObjectPreviewType.Object,
        overflow: false,
        properties: aProperties,
      };

      const bPreview: Protocol.Runtime.ObjectPreview = {
        type: Protocol.Runtime.ObjectPreviewType.Object,
        overflow: false,
        properties: bProperties,
      };

      const preview: Protocol.Runtime.ObjectPreview = {
        type: Protocol.Runtime.ObjectPreviewType.Object,
        overflow: false,
        properties: [],
      };

      if (tableType === 'c') {
        preview.properties = [
          {name: '0', type: Protocol.Runtime.PropertyPreviewType.Object, valuePreview: aPreview},
          {name: '1', type: Protocol.Runtime.PropertyPreviewType.Object, valuePreview: bPreview},
          {name: '2', type: Protocol.Runtime.PropertyPreviewType.Object, valuePreview: aPreview},
          {name: '3', type: Protocol.Runtime.PropertyPreviewType.Object, valuePreview: bPreview},
        ];
      } else {
        preview.properties = [
          {name: '0', type: Protocol.Runtime.PropertyPreviewType.Object, valuePreview: bPreview},
          {name: '1', type: Protocol.Runtime.PropertyPreviewType.Object, valuePreview: aPreview},
          {name: '2', type: Protocol.Runtime.PropertyPreviewType.Object, valuePreview: bPreview},
          {name: '3', type: Protocol.Runtime.PropertyPreviewType.Object, valuePreview: aPreview},
        ];
      }

      const mockRemoteObject = sinon.createStubInstance(
          SDK.RemoteObject.RemoteObject,
      );
      Object.defineProperty(mockRemoteObject, 'preview', {
        get: () => preview,
        configurable: true,
      });
      Object.defineProperty(mockRemoteObject, 'type', {
        get: () => 'object',
        configurable: true,
      });
      Object.defineProperty(mockRemoteObject, 'subtype', {
        get: () => undefined,
        configurable: true,
      });
      Object.defineProperty(mockRemoteObject, 'description', {
        get: () => 'Object',
        configurable: true,
      });
      Object.defineProperty(mockRemoteObject, 'hasChildren', {
        get: () => false,
        configurable: true,
      });
      mockRemoteObject.customPreview.returns(null);

      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Table,
        parameters: [mockRemoteObject],
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          null,
          '',
          messageDetails,
      );
      const {message} = createConsoleTableMessageView(rawMessage);
      return message;
    }

    it('properly renders tables with more than 20 columns (maxColumnsToRender) for object c', () => {
      const message = setupMockTableMessageViewWithLargeObject('c');

      message.toMessageElement();  // Render
      const dataGrid = message.getDataGridForTest();
      assert.exists(dataGrid);

      const contextMenu = new UI.ContextMenu.ContextMenu(
          new MouseEvent('contextmenu'),
      );
      message.populateTableContextMenuForTest(contextMenu);

      const clipboardSection = contextMenu.clipboardSection();
      const copySubMenu = clipboardSection.items.find(
          item => item.buildDescriptor().label === 'Copy table as',
      );
      assert.exists(copySubMenu);

      const subItems = (copySubMenu as UI.ContextMenu.SubMenu).defaultSection().items;
      const csvItem = subItems.find(
          item => item.buildDescriptor().label === 'Copy as CSV',
      );
      assert.exists(csvItem);

      contextMenu.invokeHandler(csvItem.id());
      const expectedCSV = `(index),b0,b1,b2,b3,b4,b5,b6,b7,b8,b9,b10,b11,b12,b13,b14,a0,a1,a2,a3,a4
0,'b0','b1','b2','b3','b4','b5','b6','b7','b8','b9','b10','b11','b12','b13','b14',,,,,
1,'b0','b1','b2','b3','b4','b5','b6','b7','b8','b9','b10','b11','b12','b13','b14','a0','a1','a2','a3','a4'
2,'b0','b1','b2','b3','b4','b5','b6','b7','b8','b9','b10','b11','b12','b13','b14',,,,,
3,'b0','b1','b2','b3','b4','b5','b6','b7','b8','b9','b10','b11','b12','b13','b14','a0','a1','a2','a3','a4'`;
      sinon.assert.calledOnceWithExactly(copyTextStub, expectedCSV);
    });

    it('properly renders tables with more than 20 columns (maxColumnsToRender) for object d', () => {
      const message = setupMockTableMessageViewWithLargeObject('d');

      message.toMessageElement();  // Render
      const dataGrid = message.getDataGridForTest();
      assert.exists(dataGrid);

      const contextMenu = new UI.ContextMenu.ContextMenu(
          new MouseEvent('contextmenu'),
      );
      message.populateTableContextMenuForTest(contextMenu);

      const clipboardSection = contextMenu.clipboardSection();
      const copySubMenu = clipboardSection.items.find(
          item => item.buildDescriptor().label === 'Copy table as',
      );
      assert.exists(copySubMenu);

      const subItems = (copySubMenu as UI.ContextMenu.SubMenu).defaultSection().items;
      const csvItem = subItems.find(
          item => item.buildDescriptor().label === 'Copy as CSV',
      );
      assert.exists(csvItem);

      contextMenu.invokeHandler(csvItem.id());
      const expectedCSV = `(index),a0,a1,a2,a3,a4,a5,a6,a7,a8,a9,a10,a11,a12,a13,a14,b0,b1,b2,b3,b4
0,'a0','a1','a2','a3','a4','a5','a6','a7','a8','a9','a10','a11','a12','a13','a14','b0','b1','b2','b3','b4'
1,,,,,,,,,,,,,,,,'b0','b1','b2','b3','b4'
2,'a0','a1','a2','a3','a4','a5','a6','a7','a8','a9','a10','a11','a12','a13','a14','b0','b1','b2','b3','b4'
3,,,,,,,,,,,,,,,,'b0','b1','b2','b3','b4'`;
      sinon.assert.calledOnceWithExactly(copyTextStub, expectedCSV);
    });
  });

  describe('console.dir', () => {
    it('does not make boolean primitives expandable', () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Dir,
        parameters: [{type: Protocol.Runtime.RemoteObjectType.Boolean, value: true} as Protocol.Runtime.RemoteObject],
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, '', messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();

      assert.isNull(messageElement.querySelector('.console-view-object-properties-section'));
    });

    it('makes boolean object wrappers expandable', () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Dir,
        parameters: [{
          type: Protocol.Runtime.RemoteObjectType.Object,
          objectId: '1' as Protocol.Runtime.RemoteObjectId,
          description: 'Boolean',
        } as Protocol.Runtime.RemoteObject],
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, '', messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();

      assert.isNotNull(messageElement.querySelector('.console-view-object-properties-section'));
    });

    it('does not make string primitives expandable', () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Dir,
        parameters: [{type: Protocol.Runtime.RemoteObjectType.String, value: 'foo'} as Protocol.Runtime.RemoteObject],
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, '', messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();

      assert.isNull(messageElement.querySelector('.console-view-object-properties-section'));
    });

    it('makes string object wrappers expandable', () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Dir,
        parameters: [{
          type: Protocol.Runtime.RemoteObjectType.Object,
          objectId: '2' as Protocol.Runtime.RemoteObjectId,
          description: 'String',
        } as Protocol.Runtime.RemoteObject],
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, '', messageDetails);
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();

      assert.isNotNull(messageElement.querySelector('.console-view-object-properties-section'));
    });
  });

  describe('linkifyWithCustomLinkifier', () => {
    it('linkifies links correctly', () => {
      const cases = [
        {text: 'www.chromium.org', expectedUrl: 'http://www.chromium.org'},
        {
          text: 'http://www.chromium.org/',
          expectedUrl: 'http://www.chromium.org/',
        },
        {
          text: 'follow http://www.chromium.org/',
          expectedUrl: 'http://www.chromium.org/',
        },
        {
          text: 'string http://www.chromium.org/',
          expectedUrl: 'http://www.chromium.org/',
        },
        {
          text: '123 \'http://www.chromium.org/\'',
          expectedUrl: 'http://www.chromium.org/',
        },
        {
          text: 'http://www.chromium.org/some?v=114:56:57',
          expectedUrl: 'http://www.chromium.org/some?v=114',
          lineNumber: 55,
          columnNumber: 56,
        },
        {
          text: 'http://www.example.com/düsseldorf?neighbourhood=Lörick',
          expectedUrl: 'http://www.example.com/düsseldorf?neighbourhood=Lörick',
        },
        {text: 'http://👓.ws', expectedUrl: 'http://👓.ws'},
        {
          text: 'http:/www.example.com/молодец',
          expectedUrl: 'http://www.example.com/молодец',
        },
        {
          text: 'http://ar.wikipedia.org/wiki/نجيب_محفوظ/',
          expectedUrl: 'http://ar.wikipedia.org/wiki/نجيب_محفوظ/',
        },
        {
          text: 'http://example.com/スター・ウォーズ/',
          expectedUrl: 'http://example.com/スター・ウォーズ/',
        },
        {text: 'data:text/plain;a', expectedUrl: 'data:text/plain;a'},
        {text: '\'www.chromium.org\'', expectedUrl: 'http://www.chromium.org'},
        {text: '(www.chromium.org)', expectedUrl: 'http://www.chromium.org'},
        {text: '"www.chromium.org"', expectedUrl: 'http://www.chromium.org'},
        {text: '{www.chromium.org}', expectedUrl: 'http://www.chromium.org'},
        {text: '[www.chromium.org]', expectedUrl: 'http://www.chromium.org'},
        {
          text: 'www.chromium.org\u00a0',
          expectedUrl: 'http://www.chromium.org',
        },
        {text: 'www.chromium.org~', expectedUrl: 'http://www.chromium.org~'},
        {text: 'www.chromium.org,', expectedUrl: 'http://www.chromium.org'},
        {text: 'www.chromium.org:', expectedUrl: 'http://www.chromium.org'},
        {text: 'www.chromium.org;', expectedUrl: 'http://www.chromium.org'},
        {text: 'www.chromium.org.', expectedUrl: 'http://www.chromium.org'},
        {text: 'www.chromium.org...', expectedUrl: 'http://www.chromium.org'},
        {text: 'www.chromium.org!', expectedUrl: 'http://www.chromium.org'},
        {text: 'www.chromium.org?', expectedUrl: 'http://www.chromium.org'},
        {
          text: 'at triggerError (http://localhost/show/:22:11)',
          expectedUrl: 'http://localhost/show/',
          lineNumber: 21,
          columnNumber: 10,
        },
      ];

      for (const {text, expectedUrl, lineNumber, columnNumber} of cases) {
        let firstExtractedUrl: string|undefined;
        let firstExtractedLineNumber: number|undefined;
        let firstExtractedColumnNumber: number|undefined;

        Console.ConsoleViewMessage.ConsoleViewMessage.linkifyWithCustomLinkifier(
            text,
            (text, url, line, column) => {
              if (firstExtractedUrl === undefined) {
                firstExtractedUrl = url;
                firstExtractedLineNumber = line;
                firstExtractedColumnNumber = column;
              }
              const element = document.createElement('span');
              element.textContent = text;
              return element;
            },
        );

        assert.strictEqual(
            firstExtractedUrl,
            expectedUrl,
            `Failed for text: ${text}`,
        );
        assert.strictEqual(
            firstExtractedLineNumber,
            lineNumber,
            `Failed for line number in text: ${text}`,
        );
        assert.strictEqual(
            firstExtractedColumnNumber,
            columnNumber,
            `Failed for column number in text: ${text}`,
        );
      }
    });

    it('does not bog down the regex with multiple slashes', () => {
      const linkifier = (text: string) => {
        const span = document.createElement('span');
        span.textContent = text;
        return span;
      };
      Console.ConsoleViewMessage.ConsoleViewMessage.linkifyWithCustomLinkifier(
          '/'.repeat(1000),
          linkifier,
      );
      Console.ConsoleViewMessage.ConsoleViewMessage.linkifyWithCustomLinkifier(
          '/a/'.repeat(1000),
          linkifier,
      );
    });
  });

  describe('ConsoleCommand', () => {
    it('substitutes control characters with replacement characters', () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Info,
          'var\u001d i = 0;',
          {
            type: SDK.ConsoleModel.FrontendMessageType.Command,
          },
      );
      const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
      const requestResolver = sinon.createStubInstance(Logs.RequestResolver.RequestResolver);
      const issuesResolver = sinon.createStubInstance(IssuesManager.IssueResolver.IssueResolver);
      const commandMessage = new Console.ConsoleViewMessage.ConsoleCommand(
          rawMessage,
          linkifier,
          requestResolver,
          issuesResolver,
          /* onResize */ () => {},
      );
      const messageElement = commandMessage.toMessageElement();
      const formattedCommand = messageElement.querySelector('.source-code');
      assert.exists(formattedCommand);
      assert.strictEqual(formattedCommand.textContent, 'var\uFFFD i = 0;');
    });
  });

  describe('ES2025 format', () => {
    let target: SDK.Target.Target;
    let runtimeModel: SDK.RuntimeModel.RuntimeModel;

    beforeEach(() => {
      target = createTarget();
      runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel)!;
    });

    it('formats Promise correctly', async () => {
      const promisePreview: Protocol.Runtime.ObjectPreview = {
        type: Protocol.Runtime.ObjectPreviewType.Object,
        subtype: Protocol.Runtime.ObjectPreviewSubtype.Promise,
        description: 'Promise',
        overflow: false,
        properties: [
          {name: '[[PromiseState]]', type: Protocol.Runtime.PropertyPreviewType.String, value: 'rejected'},
          {name: '[[PromiseResult]]', type: Protocol.Runtime.PropertyPreviewType.Number, value: '-0'},
        ],
      };

      const remoteObject = new SDK.RemoteObject.RemoteObjectImpl(
          runtimeModel,
          'mock-id' as Protocol.Runtime.RemoteObjectId,
          'object',
          'promise',
          undefined,
          undefined,
          'Promise',
          promisePreview,
      );

      const rawMessage =
          new SDK.ConsoleModel.ConsoleMessage(runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI,
                                              Protocol.Log.LogEntryLevel.Info, '', {parameters: [remoteObject]});
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();
      renderElementIntoDOM(messageElement);
      await UI.Widget.Widget.allUpdatesComplete;
      await raf();

      const tree = messageElement.querySelector('devtools-tree');
      assert.exists(tree?.shadowRoot);
      assert.include(tree.shadowRoot.textContent || '', 'Promise {<rejected>: -0}');
    });

    it('formats Symbol correctly', () => {
      const remoteObject = new SDK.RemoteObject.RemoteObjectImpl(
          runtimeModel,
          undefined,
          'symbol',
          undefined,
          undefined,
          undefined,
          'Symbol(a)',
      );

      const rawMessage =
          new SDK.ConsoleModel.ConsoleMessage(runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI,
                                              Protocol.Log.LogEntryLevel.Info, '', {parameters: [remoteObject]});
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();

      assert.strictEqual(messageElement.textContent, 'Symbol(a)');
    });

    it('formats Map correctly', async () => {
      const mapPreview: Protocol.Runtime.ObjectPreview = {
        type: Protocol.Runtime.ObjectPreviewType.Object,
        subtype: Protocol.Runtime.ObjectPreviewSubtype.Map,
        description: 'Map(1)',
        overflow: false,
        properties: [],
        entries: [{
          key: {
            type: Protocol.Runtime.ObjectPreviewType.Object,
            description: 'Object',
            overflow: false,
            properties: [],
          },
          value: {
            type: Protocol.Runtime.ObjectPreviewType.Object,
            description: 'Object',
            overflow: false,
            properties: [],
          },
        }],
      };

      const remoteObject = new SDK.RemoteObject.RemoteObjectImpl(
          runtimeModel,
          'mock-id' as Protocol.Runtime.RemoteObjectId,
          'object',
          'map',
          undefined,
          undefined,
          'Map(1)',
          mapPreview,
      );

      const rawMessage =
          new SDK.ConsoleModel.ConsoleMessage(runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI,
                                              Protocol.Log.LogEntryLevel.Info, '', {parameters: [remoteObject]});
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();
      renderElementIntoDOM(messageElement);
      await UI.Widget.Widget.allUpdatesComplete;
      await raf();

      const tree = messageElement.querySelector('devtools-tree');
      assert.exists(tree?.shadowRoot);
      assert.include(tree.shadowRoot.textContent || '', 'Map(1) {{…} => {…}}');
    });

    it('formats Set correctly', async () => {
      const setPreview: Protocol.Runtime.ObjectPreview = {
        type: Protocol.Runtime.ObjectPreviewType.Object,
        subtype: Protocol.Runtime.ObjectPreviewSubtype.Set,
        description: 'Set(1)',
        overflow: false,
        properties: [],
        entries: [{
          value: {
            type: Protocol.Runtime.ObjectPreviewType.Object,
            description: 'Object',
            overflow: false,
            properties: [],
          },
        }],
      };

      const remoteObject = new SDK.RemoteObject.RemoteObjectImpl(
          runtimeModel,
          'mock-id' as Protocol.Runtime.RemoteObjectId,
          'object',
          'set',
          undefined,
          undefined,
          'Set(1)',
          setPreview,
      );

      const rawMessage =
          new SDK.ConsoleModel.ConsoleMessage(runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI,
                                              Protocol.Log.LogEntryLevel.Info, '', {parameters: [remoteObject]});
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();
      renderElementIntoDOM(messageElement);
      await UI.Widget.Widget.allUpdatesComplete;
      await raf();

      const tree = messageElement.querySelector('devtools-tree');
      assert.exists(tree?.shadowRoot);
      assert.include(tree.shadowRoot.textContent || '', 'Set(1) {{…}}');
    });
  });

  describe('ConsoleMessageFormat', () => {
    let target: SDK.Target.Target;
    let runtimeModel: SDK.RuntimeModel.RuntimeModel;

    beforeEach(() => {
      target = createTarget();
      runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel)!;
    });

    const createMessageElement = async (formatString: string, parameters: SDK.RemoteObject.RemoteObject[]) => {
      const formatStringObj = SDK.RemoteObject.RemoteObject.fromLocalObject(formatString);
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel,
          Common.Console.FrontendMessageSource.ConsoleAPI,
          Protocol.Log.LogEntryLevel.Info,
          formatString,
          {
            type: Protocol.Runtime.ConsoleAPICalledEventType.Log,
            parameters: [formatStringObj, ...parameters],
          },
      );
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const element = message.toMessageElement();
      renderElementIntoDOM(element);
      await UI.Widget.Widget.allUpdatesComplete;
      await raf();
      return element;
    };

    it('formats numbers correctly', async () => {
      const element = await createMessageElement(
          'Message format number %i, %d and %f',
          [
            SDK.RemoteObject.RemoteObject.fromLocalObject(1),
            SDK.RemoteObject.RemoteObject.fromLocalObject(2),
            SDK.RemoteObject.RemoteObject.fromLocalObject(3.5),
          ],
      );
      assert.strictEqual(element.deepTextContent(), 'Message format number 1, 2 and 3.5');
    });

    it('formats strings correctly', async () => {
      const element = await createMessageElement(
          'Message %s for %s',
          [
            SDK.RemoteObject.RemoteObject.fromLocalObject('format'),
            SDK.RemoteObject.RemoteObject.fromLocalObject('string'),
          ],
      );
      assert.strictEqual(element.deepTextContent(), 'Message format for string');
    });

    it('formats objects optimally (%o)', async () => {
      const obj = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        className: 'Object',
        description: 'Object',
        objectId: '1' as Protocol.Runtime.RemoteObjectId,
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          description: 'Object',
          overflow: false,
          properties: [
            {name: 'foo', type: Protocol.Runtime.PropertyPreviewType.String, value: 'bar'},
          ],
        },
      });
      const element = await createMessageElement('Object %o', [obj]);
      assert.include(element.deepTextContent(), 'Object');
      assert.include(element.deepTextContent(), 'foo');
      assert.include(element.deepTextContent(), 'bar');
    });

    it('formats arrays optimally (%o)', async () => {
      const arr = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        subtype: Protocol.Runtime.RemoteObjectSubtype.Array,
        className: 'Array',
        description: 'Array(2)',
        objectId: '1' as Protocol.Runtime.RemoteObjectId,
        preview: {
          type: Protocol.Runtime.ObjectPreviewType.Object,
          subtype: Protocol.Runtime.ObjectPreviewSubtype.Array,
          description: 'Array(2)',
          overflow: false,
          properties: [
            {name: '0', type: Protocol.Runtime.PropertyPreviewType.String, value: 'foo'},
            {name: '1', type: Protocol.Runtime.PropertyPreviewType.String, value: 'bar'},
          ],
        },
      });
      const element = await createMessageElement('Array %o', [arr]);
      assert.include(element.deepTextContent(), 'Array');
      assert.include(element.deepTextContent(), 'foo');
      assert.include(element.deepTextContent(), 'bar');
    });

    it('formats objects generically (%O)', async () => {
      const obj = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        className: 'Object',
        description: 'Object',
        objectId: '1' as Protocol.Runtime.RemoteObjectId,
      });
      const element = await createMessageElement('Object as object: %O', [obj]);
      assert.strictEqual(element.deepTextContent(), 'Object as object: Object');
    });

    it('formats arrays generically (%O)', async () => {
      const arr = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        subtype: Protocol.Runtime.RemoteObjectSubtype.Array,
        className: 'Array',
        description: 'Array(2)',
        objectId: '1' as Protocol.Runtime.RemoteObjectId,
      });
      const element = await createMessageElement('Array as object: %O', [arr]);
      assert.strictEqual(element.deepTextContent(), 'Array as object: Array(2)');
    });

    it('formats floating points as integers (%d %i)', async () => {
      const element = await createMessageElement(
          'Floating as integers: %d %i',
          [
            SDK.RemoteObject.RemoteObject.fromLocalObject(42.5),
            SDK.RemoteObject.RemoteObject.fromLocalObject(42.5),
          ],
      );
      assert.strictEqual(element.deepTextContent(), 'Floating as integers: 42 42');
    });

    it('formats floating points as is (%f)', async () => {
      const element = await createMessageElement(
          'Floating as is: %f',
          [
            SDK.RemoteObject.RemoteObject.fromLocalObject(42.5),
          ],
      );
      assert.strictEqual(element.deepTextContent(), 'Floating as is: 42.5');
    });

    it('formats non-numbers as numbers (%d %i %f)', async () => {
      const doc = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        subtype: Protocol.Runtime.RemoteObjectSubtype.Node,
        className: 'HTMLDocument',
        description: 'document',
      });
      const element = await createMessageElement(
          'Non-numbers as numbers: %d %i %f',
          [
            doc,
            SDK.RemoteObject.RemoteObject.fromLocalObject(null),
            SDK.RemoteObject.RemoteObject.fromLocalObject('document'),
          ],
      );
      assert.strictEqual(element.deepTextContent(), 'Non-numbers as numbers: NaN NaN NaN');
    });

    it('formats string as is (%s)', async () => {
      const element = await createMessageElement(
          'String as is: %s',
          [
            SDK.RemoteObject.RemoteObject.fromLocalObject('string'),
          ],
      );
      assert.strictEqual(element.deepTextContent(), 'String as is: string');
    });

    it('formats object as string (%s)', async () => {
      const doc = runtimeModel.createRemoteObject({
        type: Protocol.Runtime.RemoteObjectType.Object,
        subtype: Protocol.Runtime.RemoteObjectSubtype.Node,
        className: 'HTMLDocument',
        description: '[object HTMLDocument]',
      });
      const element = await createMessageElement(
          'Object as string: %s',
          [doc],
      );
      assert.strictEqual(element.deepTextContent(), 'Object as string: [object HTMLDocument]');
    });
  });
});
