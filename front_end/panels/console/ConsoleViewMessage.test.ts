// Copyright (c) 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {
  createConsoleViewMessageWithStubDeps,
  createStackTrace,
} from '../../testing/ConsoleHelpers.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

// The css files aren't exported by the bundle, so we need to import it directly.
// eslint-disable-next-line rulesdir/es_modules_import
import consoleViewStyles from './consoleView.css.js';

describeWithMockConnection('ConsoleViewMessage', () => {
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
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, 'got here', messageDetails);
      const {message, linkifier} = createConsoleViewMessageWithStubDeps(rawMessage);

      message.toMessageElement();  // Trigger rendering.

      sinon.assert.calledOnceWithExactly(linkifier.linkifyStackTraceTopFrame, target, stackTrace);
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
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, 'value of x is 42',
          messageDetails);
      const {message, linkifier} = createConsoleViewMessageWithStubDeps(rawMessage);

      message.toMessageElement();  // Trigger rendering.

      const expectedCallFrame = stackTrace.callFrames[1];  // userFunction.
      sinon.assert.calledOnceWithExactly(
          linkifier.maybeLinkifyConsoleCallFrame, target, expectedCallFrame,
          {inlineFrameIndex: 0, revealBreakpoint: true, userMetric: undefined});
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
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, /* level */ null, 'value of x is 42',
          messageDetails);
      const {message, linkifier} = createConsoleViewMessageWithStubDeps(rawMessage);

      message.toMessageElement();  // Trigger rendering.

      const expectedCallFrame = stackTrace.callFrames[3];  // userFunction.
      sinon.assert.calledOnceWithExactly(
          linkifier.maybeLinkifyConsoleCallFrame, target, expectedCallFrame,
          {inlineFrameIndex: 0, revealBreakpoint: true, userMetric: undefined});
    });
  });

  describe('console insights', () => {
    it('shows a hover button', () => {
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
          .withArgs('explain.console-message.hover')
          .returns(true);
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error, 'got here');
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();  // Trigger rendering.
      const button = messageElement.querySelector('[aria-label=\'Understand this error. Powered by AI.\']');
      assert.strictEqual(button?.textContent, 'Understand this errorAI');
    });

    it('does not show a hover button if the console message text is empty', () => {
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
          .withArgs('explain.console-message.hover')
          .returns(true);
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error, '');
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();  // Trigger rendering.
      const button = messageElement.querySelector('[aria-label=\'Understand this error. Powered by AI.\']');
      assert.isNull(button);
    });

    it('does not show a hover button for the self-XSS warning message', () => {
      sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
          .withArgs('explain.console-message.hover')
          .returns(true);
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.SELF_XSS, Protocol.Log.LogEntryLevel.Warning,
          'Don’t paste code...');
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();  // Trigger rendering.
      const button = messageElement.querySelector('[aria-label=\'Understand this warning. Powered by AI.\']');
      assert.isNull(button);
    });
  });

  describe('with ignore listing', () => {
    const IGNORE_LIST_LINK = 'ignore-list-link';

    function findStackPreviewContainer(element: HTMLElement) {
      const outer = element.querySelector('span.stack-preview-container');
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

    function errorMessageForStack(stack: Protocol.Runtime.StackTrace) {
      return [
        'Error:',
        ...(stack.callFrames.map(
            frame => `    at ${frame.functionName} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`)),
      ].join('\n');
    }

    function getCallFrames(element: HTMLElement): string[] {
      const results = [];
      for (const line of element.querySelectorAll('.formatted-stack-frame')) {
        if (line.checkVisibility()) {
          results.push(line.textContent ?? 'Error: line was null or undefined');
        }
      }
      return results;
    }

    function getStructuredCallFrames(element: HTMLElement): string[] {
      const results = [];
      for (const line of findStackPreviewContainer(element).querySelectorAll('tbody tr')) {
        if (line.checkVisibility()) {
          results.push(line.textContent ?? 'Error: line was null or undefined');
        }
      }
      return results;
    }

    function expandStructuredTrace(element: HTMLElement) {
      (element.querySelector('.console-message-stack-trace-wrapper > div') as HTMLElement).click();
    }

    function expandIgnored(element: HTMLElement) {
      const {showAll} = findLinks(element);
      (showAll.querySelector('.link') as HTMLElement).click();
    }

    function collapseIgnored(element: HTMLElement) {
      const {showLess} = findLinks(element);
      (showLess.querySelector('.link') as HTMLElement).click();
    }

    async function createConsoleMessageWithIgnoreListing(ignoreListFn: (url: string) => Boolean): Promise<HTMLElement> {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const stackTrace = createStackTrace([
        'USER_ID::userNestedFunction::http://example.com/script.js::40::15',
        'USER_ID::userFunction::http://example.com/script.js::10::2',
        'APP_ID::entry::http://example.com/app.js::25::10',
      ]);
      const stackTraceMessage = errorMessageForStack(stackTrace);
      const messageDetails = {
        type: Protocol.Runtime.ConsoleAPICalledEventType.Error,
        stackTrace,
        parameters: [{
          type: 'object',
          subtype: 'error',
          className: 'Error',
          description: stackTraceMessage,
        } as Protocol.Runtime.RemoteObject],
      };
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error,
          stackTraceMessage, messageDetails);
      const {message, linkifier} = createConsoleViewMessageWithStubDeps(rawMessage);

      linkifier.linkifyScriptLocation.callsFake((target, scriptId, sourceURL, lineNumber, options) => {
        const link = Components.Linkifier.Linkifier.linkifyURL(sourceURL, {lineNumber, ...options});
        if (ignoreListFn(sourceURL)) {
          link.classList.add(IGNORE_LIST_LINK);
        }
        return link;
      });
      linkifier.maybeLinkifyConsoleCallFrame.callsFake((target, callFrame, options) => {
        const link = Components.Linkifier.Linkifier.linkifyURL(
            callFrame.url as Platform.DevToolsPath.UrlString, {lineNumber: callFrame.lineNumber, ...options});
        if (ignoreListFn(callFrame.url)) {
          link.classList.add(IGNORE_LIST_LINK);
        }
        return link;
      });
      const element = message.toMessageElement();  // Trigger rendering.
      await message.formatErrorStackPromiseForTest();

      const wrapperElement = document.createElement('div');
      const shadowElement = UI.UIUtils.createShadowRootWithCoreStyles(wrapperElement, {cssFile: [consoleViewStyles]});
      shadowElement.appendChild(element);
      renderElementIntoDOM(wrapperElement);
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
    const EXPANDED_STRUCTURED = [
      '\nuserNestedFunction @ example.com/script.js:41',
      '\nuserFunction @ example.com/script.js:11',
      '\nentry @ example.com/app.js:26',
    ];
    const COLLAPSED_STRUCTURED = [
      '\nuserNestedFunction @ example.com/script.js:41',
      '\nuserFunction @ example.com/script.js:11',
    ];

    it('shows everything with no links when nothing is ignore listed', async () => {
      const element = await createConsoleMessageWithIgnoreListing(_ => false);
      assertNoLinks(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED);
      assert.deepEqual(getStructuredCallFrames(element), []);
      expandStructuredTrace(element);
      assertNoLinks(element);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
    });

    it('shows everything with no links when everything is ignore listed', async () => {
      const element = await createConsoleMessageWithIgnoreListing(_ => true);
      assertNoLinks(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED);
      assert.deepEqual(getStructuredCallFrames(element), []);
      expandStructuredTrace(element);
      assertNoLinks(element);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
    });

    it('shows expandable list when something is ignore listed', async () => {
      const element = await createConsoleMessageWithIgnoreListing(url => url.includes('/app.js'));
      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), []);
      assert.deepEqual(getCallFrames(element), COLLAPSED_UNSTRUCTURED);
      expandIgnored(element);
      assertShowLessLink(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED);
      collapseIgnored(element);
      assertShowAllLink(element);

      expandStructuredTrace(element);

      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), COLLAPSED_STRUCTURED);
      assert.deepEqual(getCallFrames(element), COLLAPSED_UNSTRUCTURED);
      expandIgnored(element);
      assertShowLessLink(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
      collapseIgnored(element);
      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), COLLAPSED_STRUCTURED);
      assert.deepEqual(getCallFrames(element), COLLAPSED_UNSTRUCTURED);
    });
  });
});
