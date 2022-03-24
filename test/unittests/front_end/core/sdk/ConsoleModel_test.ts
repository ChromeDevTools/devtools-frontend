// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';

describe('ConsoleMessage', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });
  const scriptId1 = '1' as Protocol.Runtime.ScriptId;
  const scriptId2 = '2' as Protocol.Runtime.ScriptId;

  function newMessage({
    source = SDK.ConsoleModel.FrontendMessageSource.ConsoleAPI,
    message = 'Message',
    url,
    scriptId,
    executionContextId,
    stackTrace,
  }: {
    source?: SDKModule.ConsoleModel.MessageSource,
    message?: string,
    url?: Platform.DevToolsPath.UrlString,
    scriptId?: Protocol.Runtime.ScriptId,
    executionContextId?: number,
    stackTrace?: Protocol.Runtime.StackTrace,
  }) {
    return new SDK.ConsoleModel.ConsoleMessage(
        null, source, null, message, {url, executionContextId, scriptId, stackTrace});
  }

  it('compares using message', () => {
    const a = newMessage({});
    const b = newMessage({});
    const c = newMessage({message: 'DifferentMessage'});
    assert.isTrue(a.isEqual(b));
    assert.isFalse(b.isEqual(c));
    assert.isFalse(c.isEqual(a));
    assert.isTrue(c.isEqual(c));
  });

  it('compares using source', () => {
    const a = newMessage({});
    const b = newMessage({});
    const c = newMessage({source: SDK.ConsoleModel.FrontendMessageSource.CSS});
    assert.isTrue(a.isEqual(b));
    assert.isFalse(b.isEqual(c));
    assert.isFalse(c.isEqual(a));
  });

  it('compares using url', () => {
    const a = newMessage({});
    const b = newMessage({url: 'http://a.b/c' as Platform.DevToolsPath.UrlString});
    const c = newMessage({url: 'http://a.b/c' as Platform.DevToolsPath.UrlString});
    const d = newMessage({url: 'http://a.b/d' as Platform.DevToolsPath.UrlString});
    assert.isFalse(a.isEqual(b));
    assert.isTrue(b.isEqual(c));
    assert.isFalse(c.isEqual(d));
    assert.isFalse(d.isEqual(a));
  });

  it('compares using execution context and script id', () => {
    const a = newMessage({});
    const b = newMessage({executionContextId: 5, scriptId: scriptId1});
    const c = newMessage({executionContextId: 5, scriptId: scriptId1});
    const d = newMessage({executionContextId: 6, scriptId: scriptId1});
    const e = newMessage({executionContextId: 5, scriptId: scriptId2});
    assert.isFalse(a.isEqual(b));
    assert.isFalse(b.isEqual(a));
    assert.isTrue(b.isEqual(c));
    assert.isFalse(c.isEqual(d));
    assert.isFalse(c.isEqual(e));
  });

  it('compares using script ids in stack traces', () => {
    const functionName = 'foo';
    const url = 'http://localhost/foo.js';
    const lineNumber = 1;
    const columnNumber = 1;
    const a =
        newMessage({stackTrace: {callFrames: [{functionName, scriptId: scriptId1, url, lineNumber, columnNumber}]}});
    const b =
        newMessage({stackTrace: {callFrames: [{functionName, scriptId: scriptId2, url, lineNumber, columnNumber}]}});
    assert.isFalse(a.isEqual(b));
  });
});
