// Copyright (c) 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createConsoleViewMessageWithStubDeps, createStackTrace} from '../../helpers/ConsoleHelpers.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

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
