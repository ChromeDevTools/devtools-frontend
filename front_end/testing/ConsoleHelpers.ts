// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type * as SDK from '../core/sdk/sdk.js';
import type * as Protocol from '../generated/protocol.js';
import * as IssuesManager from '../models/issues_manager/issues_manager.js';
import * as Logs from '../models/logs/logs.js';
import * as Console from '../panels/console/console.js';
import * as Components from '../ui/legacy/components/utils/utils.js';

export function createConsoleViewMessageWithStubDeps(rawMessage: SDK.ConsoleModel.ConsoleMessage) {
  const linkifier = sinon.createStubInstance(Components.Linkifier.Linkifier);
  const requestResolver = sinon.createStubInstance(Logs.RequestResolver.RequestResolver);
  const issuesResolver = sinon.createStubInstance(IssuesManager.IssueResolver.IssueResolver);
  const message = new Console.ConsoleViewMessage.ConsoleViewMessage(
      rawMessage, linkifier, requestResolver, issuesResolver, /* onResize */ () => {});
  return {message, linkifier};
}

/**
 * Helper for less verbose stack traces in test code. Pass stack traces with the
 * following format:
 *
 * "<scriptId>::<functionName>::<url>::<lineNumber>::<columnNumber>"
 */
export function createStackTrace(callFrameDescriptions: string[]): Protocol.Runtime.StackTrace {
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
