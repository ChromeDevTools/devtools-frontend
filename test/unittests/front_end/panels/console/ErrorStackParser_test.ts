// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Console from '../../../../../front_end/panels/console/console.js';

const {assert} = chai;
const {parseSourcePositionsFromErrorStack} = Console.ErrorStackParser;

describe('ErrorStackParser', () => {
  let runtimeModel;
  let parseErrorStack: (stack: string) => Console.ErrorStackParser.ParsedErrorFrame[] | null;

  beforeEach(() => {
    // TODO(crbug/1280141): Remove complicated stubbing code once `parseSourcePositionsFromErrorStack`
    //                      no longer needs a RuntimeModel.
    runtimeModel = sinon.createStubInstance(SDK.RuntimeModel.RuntimeModel, {
      target: sinon.createStubInstance(SDK.Target.Target, {
        inspectedURL: '',
      }),
      debuggerModel: sinon.createStubInstance(SDK.DebuggerModel.DebuggerModel),
    });
    parseErrorStack = parseSourcePositionsFromErrorStack.bind(null, runtimeModel);
  });

  it('returns null for invalid strings', () => {
    assert.isNull(parseErrorStack(''));
    assert.isNull(parseErrorStack('foobar'));
  });

  it('returns null if the first word does not end in "Error"', () => {
    assert.isNull(parseErrorStack('CustomFoo: bar'));
  });

  it('accepts stacks with any "*Error" as its first word', () => {
    assert.isNotNull(parseErrorStack('Error: standard error'));
    assert.isNotNull(parseErrorStack('ReferenceError: unknown variable'));
    assert.isNotNull(parseErrorStack('CustomError: foobar'));
  });
});
