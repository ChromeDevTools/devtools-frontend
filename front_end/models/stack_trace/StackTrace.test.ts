// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {protocolCallFrame, stubFrame} from '../../testing/StackTraceHelpers.js';

import * as StackTrace from './stack_trace.js';

describe('DebuggableFrameFlavor for', () => {
  it('returns the exact same instance for subsequent identical (deep equal) DebuggableFrames', () => {
    const frameTemplate = stubFrame<StackTrace.StackTrace.DebuggableFrame>({
      line: 20,
      column: 10,
      sdkFrame: sinon.createStubInstance(SDK.DebuggerModel.CallFrame),
    });

    assert.strictEqual(
        StackTrace.StackTrace.DebuggableFrameFlavor.for({...frameTemplate}),
        StackTrace.StackTrace.DebuggableFrameFlavor.for({...frameTemplate}));
  });

  it('returns a different instance if the same DebuggableFrame object changes', () => {
    const frame = stubFrame<StackTrace.StackTrace.DebuggableFrame>({
      line: 20,
      column: 10,
      sdkFrame: sinon.createStubInstance(SDK.DebuggerModel.CallFrame),
    });
    const flavor1 = StackTrace.StackTrace.DebuggableFrameFlavor.for(frame);

    const flavor2 = StackTrace.StackTrace.DebuggableFrameFlavor.for({...frame, line: 30});

    assert.notStrictEqual(flavor2, flavor1);
  });
});

describe('isConsoleOriginated', () => {
  function makeStackTrace(callFrames: Protocol.Runtime.CallFrame[]): Protocol.Runtime.StackTrace {
    return {callFrames};
  }

  it('returns true for a single frame with empty url and empty functionName', () => {
    const stack = makeStackTrace([protocolCallFrame(':0::0:0')]);
    assert.isTrue(StackTrace.StackTrace.isConsoleOriginated(stack));
  });

  it('returns false when there are multiple frames', () => {
    const stack = makeStackTrace([protocolCallFrame(':0::0:0'), protocolCallFrame(':0::0:0')]);
    assert.isFalse(StackTrace.StackTrace.isConsoleOriginated(stack));
  });

  it('returns false when there are no frames', () => {
    const stack = makeStackTrace([]);
    assert.isFalse(StackTrace.StackTrace.isConsoleOriginated(stack));
  });

  it('returns false when the single frame has a url', () => {
    const stack = makeStackTrace([protocolCallFrame('https://example.com/script.js:0::0:0')]);
    assert.isFalse(StackTrace.StackTrace.isConsoleOriginated(stack));
  });

  it('returns false when the single frame has a functionName', () => {
    const stack = makeStackTrace([protocolCallFrame(':0:myFunction:0:0')]);
    assert.isFalse(StackTrace.StackTrace.isConsoleOriginated(stack));
  });

  it('returns true regardless of other frame fields like lineNumber and columnNumber', () => {
    const stack = makeStackTrace([protocolCallFrame(':0::42:7')]);
    assert.isTrue(StackTrace.StackTrace.isConsoleOriginated(stack));
  });
});
