// Copyright (c) 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as IssuesManager from '../../../../../front_end/models/issues_manager/issues_manager.js';
import * as Logs from '../../../../../front_end/models/logs/logs.js';
import * as Console from '../../../../../front_end/panels/console/console.js';
import * as Components from '../../../../../front_end/ui/legacy/components/utils/utils.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

/**
 * Helper for less verbose stack traces in test code. Pass stack traces with the
 * following format:
 *
 * "<scriptId>::<functionName>::<url>::<lineNumber>::<columnNumber>"
 */
function createStackTrace(callFrameDescriptions: string[]): Protocol.Runtime.StackTrace {
  const callFrames: Protocol.Runtime.CallFrame[] = callFrameDescriptions.map(descriptor => {
    const fields = descriptor.split('::');
    assert.lengthOf(fields, 5);
    return {
      scriptId: fields[0] as Protocol.Runtime.ScriptId,
      functionName: fields[1],
      url: fields[2],
      lineNumber: Number.parseInt(fields[3], 10),
      columnNumber: Number.parseInt(fields[4], 10),
    };
  });
  return {callFrames};
}

function createConsoleViewMessageWithStubDeps(rawMessage: SDK.ConsoleModel.ConsoleMessage) {
  const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
  const requestResolver = sinon.createStubInstance(Logs.RequestResolver.RequestResolver);
  const issuesResolver = sinon.createStubInstance(IssuesManager.IssueResolver.IssueResolver);
  const message = new Console.ConsoleViewMessage.ConsoleViewMessage(
      rawMessage, linkifier, requestResolver, issuesResolver, /* onResize */ () => {});
  return {message, linkifier};
}

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
          runtimeModel, SDK.ConsoleModel.FrontendMessageSource.ConsoleAPI, /* level */ null, 'got here',
          messageDetails);
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
          runtimeModel, SDK.ConsoleModel.FrontendMessageSource.ConsoleAPI, /* level */ null, 'value of x is 42',
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
          runtimeModel, SDK.ConsoleModel.FrontendMessageSource.ConsoleAPI, /* level */ null, 'value of x is 42',
          messageDetails);
      const {message, linkifier} = createConsoleViewMessageWithStubDeps(rawMessage);

      message.toMessageElement();  // Trigger rendering.

      const expectedCallFrame = stackTrace.callFrames[3];  // userFunction.
      sinon.assert.calledOnceWithExactly(
          linkifier.maybeLinkifyConsoleCallFrame, target, expectedCallFrame,
          {inlineFrameIndex: 0, revealBreakpoint: true, userMetric: undefined});
    });
  });
});
