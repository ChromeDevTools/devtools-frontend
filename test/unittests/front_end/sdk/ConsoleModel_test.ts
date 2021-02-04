// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as SDKModule from '../../../../front_end/sdk/sdk.js';

describe('ConsoleMessage', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../front_end/sdk/sdk.js');
  });

  function newMessage(options: {
    source?: SDKModule.ConsoleModel.MessageSource,
    message?: string,
    url?: string,
    scriptId?: string,
    executionContextId?: number,
  }) {
    return new SDK.ConsoleModel.ConsoleMessage(
        null, options.source || SDK.ConsoleModel.MessageSource.ConsoleAPI, null, options.message || 'Message',
        undefined, options.url, undefined, undefined, undefined, undefined, undefined, options.executionContextId,
        options.scriptId);
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
    const c = newMessage({source: SDK.ConsoleModel.MessageSource.CSS});
    assert.isTrue(a.isEqual(b));
    assert.isFalse(b.isEqual(c));
    assert.isFalse(c.isEqual(a));
  });

  it('compares using url', () => {
    const a = newMessage({});
    const b = newMessage({url: 'http://a.b/c'});
    const c = newMessage({url: 'http://a.b/c'});
    const d = newMessage({url: 'http://a.b/d'});
    assert.isFalse(a.isEqual(b));
    assert.isTrue(b.isEqual(c));
    assert.isFalse(c.isEqual(d));
    assert.isFalse(d.isEqual(a));
  });

  it('compares using execution context and script id', () => {
    const a = newMessage({});
    const b = newMessage({executionContextId: 5, scriptId: '1'});
    const c = newMessage({executionContextId: 5, scriptId: '1'});
    const d = newMessage({executionContextId: 6, scriptId: '1'});
    const e = newMessage({executionContextId: 5, scriptId: '2'});
    assert.isFalse(a.isEqual(b));
    assert.isFalse(b.isEqual(a));
    assert.isTrue(b.isEqual(c));
    assert.isFalse(c.isEqual(d));
    assert.isFalse(c.isEqual(e));
  });
});
