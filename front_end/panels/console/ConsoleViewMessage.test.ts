// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import {
  createConsoleViewMessageWithStubDeps,
  createStackTrace,
} from '../../testing/ConsoleHelpers.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Console from './console.js';
// The css files aren't exported by the bundle, so we need to import it directly.
// eslint-disable-next-line @devtools/es-modules-import
import consoleViewStyles from './consoleView.css.js';

const {urlString} = Platform.DevToolsPath;

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

  describe('formatParameter', () => {
    it('creates an editable object properties section for objects', async () => {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const remoteObject = SDK.RemoteObject.RemoteObject.fromLocalObject({foo: 'bar'});
      const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
          runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Info, '',
          {parameters: [remoteObject]});
      const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
      const messageElement = message.toMessageElement();

      const propertiesSectionElement = messageElement.querySelector('.console-view-object-properties-section');
      assert.exists(propertiesSectionElement);

      const section = ObjectUI.ObjectPropertiesSection.getObjectPropertiesSectionFrom(propertiesSectionElement);
      assert.exists(section);

      const rootElement = section.objectTreeElement();
      await rootElement.onpopulate();
      const child = rootElement.childAt(0);
      assert.instanceOf(child, ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement);
      assert.isTrue(child.editable);
    });
  });
  describe('console insights', () => {
    const createMessage =
        (source: SDK.ConsoleModel.MessageSource, level: Protocol.Log.LogEntryLevel, messageText: string):
            HTMLElement => {
              sinon.stub(UI.ActionRegistry.ActionRegistry.instance(), 'hasAction')
                  .withArgs('explain.console-message.hover')
                  .returns(true);
              const target = createTarget();
              const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
              const rawMessage = new SDK.ConsoleModel.ConsoleMessage(runtimeModel, source, level, messageText);
              const {message} = createConsoleViewMessageWithStubDeps(rawMessage);
              const messageElement = message.toMessageElement();  // Trigger rendering.
              return messageElement;
            };

    it('shows a hover button', () => {
      const messageElement =
          createMessage(Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error, 'got here');
      const button = messageElement.querySelector('[aria-label=\'Understand this error. Powered by AI.\']');
      assert.strictEqual(
          button?.querySelector('.button-label div')?.getAttribute('data-text'), 'Understand this error');
    });

    it('creates teaser on hover', () => {
      const messageElement =
          createMessage(Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error, 'got here');
      const showTeaserStub = sinon.stub(Console.ConsoleInsightTeaser.ConsoleInsightTeaser.prototype, 'show');
      const generateTeaserStub =
          sinon.stub(Console.ConsoleInsightTeaser.ConsoleInsightTeaser.prototype, 'maybeGenerateTeaser');
      const builtInAi = AiAssistanceModel.BuiltInAi.BuiltInAi.instance();
      sinon.stub(builtInAi, 'isEventuallyAvailable').returns(true);
      messageElement.dispatchEvent(new MouseEvent('mouseenter'));
      sinon.assert.calledOnce(showTeaserStub);
      sinon.assert.calledOnce(generateTeaserStub);
    });

    it('does not show a hover button if the console message text is empty', () => {
      const messageElement =
          createMessage(Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error, '');
      const button = messageElement.querySelector('[aria-label=\'Understand this error. Powered by AI.\']');
      assert.isNull(button);
    });

    it('does not show a hover button for the self-XSS warning message', () => {
      const messageElement = createMessage(
          Common.Console.FrontendMessageSource.SELF_XSS, Protocol.Log.LogEntryLevel.Warning, 'Don’t paste code...');
      const button = messageElement.querySelector('[aria-label=\'Understand this warning. Powered by AI.\']');
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

    function errorMessageForStack(stack: Protocol.Runtime.StackTrace, withBuiltinFrames?: boolean) {
      const lines = [
        'Error:',
        ...(stack.callFrames.flatMap(frame => {
          const line = `    at ${frame.functionName} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`;
          if (withBuiltinFrames) {
            return [line, '    at JSON.parse (<anonymous>)'];
          }
          return [line];
        })),
      ];
      return lines.join('\n');
    }

    function getCallFrames(element: HTMLElement): string[] {
      const results = [];
      for (const line of element.querySelectorAll('.formatted-stack-frame,.formatted-builtin-stack-frame')) {
        if (line.checkVisibility()) {
          results.push(line.textContent);
        }
      }
      return results;
    }

    function getStructuredCallFrames(element: HTMLElement): string[] {
      const results = [];
      for (const line of findStackPreviewContainer(element).querySelectorAll('tbody tr')) {
        if (line.checkVisibility()) {
          results.push(line.textContent);
        }
      }
      return results;
    }

    async function expandStructuredTrace(element: HTMLElement) {
      (element.querySelector('.console-message-stack-trace-wrapper > div') as HTMLElement).click();
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
        ignoreListFn: (url: string) => boolean, withBuiltinFrames?: boolean): Promise<HTMLElement> {
      const target = createTarget();
      const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
      const stackTrace = createStackTrace([
        'USER_ID::userNestedFunction::http://example.com/script.js::40::15',
        'USER_ID::userFunction::http://example.com/script.js::10::2',
        'APP_ID::entry::http://example.com/app.js::25::10',
      ]);
      const stackTraceMessage = errorMessageForStack(stackTrace, withBuiltinFrames);
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

      linkifier.linkifyScriptLocation.callsFake((_target, _scriptId, sourceURL, lineNumber, options) => {
        const link = Components.Linkifier.Linkifier.linkifyURL(sourceURL, {lineNumber, ...options});
        if (ignoreListFn(sourceURL)) {
          link.classList.add(IGNORE_LIST_LINK);
        }
        return link;
      });
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
      const shadowElement = UI.UIUtils.createShadowRootWithCoreStyles(wrapperElement, {cssFile: consoleViewStyles});
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
         const target = createTarget();
         const runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
         const stackTrace = createStackTrace([
           'USER_ID::userNestedFunction::http://example.com/script.js::40::15',
           'USER_ID::userFunction::http://example.com/script.js::10::2',
           'APP_ID::entry::http://example.com/app.js::25::10',
         ]);
         const stackTraceMessage = errorMessageForStack(stackTrace);
         const messageDetails: SDK.ConsoleModel.ConsoleMessageDetails = {
           type: Protocol.Runtime.ConsoleAPICalledEventType.Error,
           stackTrace,
           parameters: [{
             type: Protocol.Runtime.RemoteObjectType.Object,
             subtype: Protocol.Runtime.RemoteObjectSubtype.Error,
             className: 'Error',
             description: stackTraceMessage,
           }],
         };
         const rawMessage = new SDK.ConsoleModel.ConsoleMessage(
             runtimeModel, Common.Console.FrontendMessageSource.ConsoleAPI, Protocol.Log.LogEntryLevel.Error,
             stackTraceMessage, messageDetails);
         const {message, linkifier} = createConsoleViewMessageWithStubDeps(rawMessage);

         // Inline Error frames: ALL ignore-listed
         linkifier.linkifyScriptLocation.callsFake((_target, _scriptId, sourceURL, lineNumber, options) => {
           const link = Components.Linkifier.Linkifier.linkifyURL(sourceURL, {lineNumber, ...options});
           link.classList.add(IGNORE_LIST_LINK);
           return link;
         });
         // Structured stack trace: only app.js is ignore-listed, script.js is NOT
         linkifier.maybeLinkifyConsoleCallFrame.callsFake((_target, callFrame, options) => {
           const link = Components.Linkifier.Linkifier.linkifyURL(
               urlString`${callFrame.url}`, {lineNumber: callFrame.lineNumber, ...options});
           if (callFrame.url.includes('/app.js')) {
             link.classList.add(IGNORE_LIST_LINK);
           }
           return link;
         });
         const element = message.toMessageElement();
         await message.formatErrorStackPromiseForTest();

         const wrapperElement = document.createElement('div');
         const shadowElement = UI.UIUtils.createShadowRootWithCoreStyles(wrapperElement, {cssFile: consoleViewStyles});
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
         assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED);

         // Collapsing hides them again
         await collapseIgnored(element);
         assertShowAllLink(element);
         assert.deepEqual(getCallFrames(element), []);
       });

    it('shows expandable list when something is ignore listed', async () => {
      const element = await createConsoleMessageWithIgnoreListing(url => url.includes('/app.js'));
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
      const element = await createConsoleMessageWithIgnoreListing(_ => false, true);
      assertNoLinks(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED_WITH_BUILTIN);
      assert.deepEqual(getStructuredCallFrames(element), []);
      await expandStructuredTrace(element);
      assertNoLinks(element);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
    });

    it('shows everything with no links when everything is ignore listed, including builtin frames', async () => {
      const element = await createConsoleMessageWithIgnoreListing(_ => true, true);
      assertNoLinks(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED_WITH_BUILTIN);
      assert.deepEqual(getStructuredCallFrames(element), []);
      await expandStructuredTrace(element);
      assertNoLinks(element);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
    });

    it('shows expandable list when something is ignore listed, collapsing builtin frames', async () => {
      const element = await createConsoleMessageWithIgnoreListing(url => url.includes('/app.js'), true);
      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), []);
      assert.deepEqual(getCallFrames(element), COLLAPSED_UNSTRUCTURED_WITH_BUILTIN);
      await expandIgnored(element);
      assertShowLessLink(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED_WITH_BUILTIN);
      await collapseIgnored(element);
      assertShowAllLink(element);

      await expandStructuredTrace(element);

      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), COLLAPSED_STRUCTURED);
      assert.deepEqual(getCallFrames(element), COLLAPSED_UNSTRUCTURED_WITH_BUILTIN);
      await expandIgnored(element);
      assertShowLessLink(element);
      assert.deepEqual(getCallFrames(element), EXPANDED_UNSTRUCTURED_WITH_BUILTIN);
      assert.deepEqual(getStructuredCallFrames(element), EXPANDED_STRUCTURED);
      await collapseIgnored(element);
      assertShowAllLink(element);
      assert.deepEqual(getStructuredCallFrames(element), COLLAPSED_STRUCTURED);
      assert.deepEqual(getCallFrames(element), COLLAPSED_UNSTRUCTURED_WITH_BUILTIN);
    });
  });
});
