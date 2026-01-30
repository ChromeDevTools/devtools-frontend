// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';

import * as StackTrace from './stack_trace.js';

describe('DebuggableFrameFlavor for', () => {
  it('returns the exact same instance for subsequent identical (deep equal) DebuggableFrames', () => {
    const frameTemplate: StackTrace.StackTrace.DebuggableFrame = {
      line: 20,
      column: 10,
      sdkFrame: sinon.createStubInstance(SDK.DebuggerModel.CallFrame),
    };

    assert.strictEqual(
        StackTrace.StackTrace.DebuggableFrameFlavor.for({...frameTemplate}),
        StackTrace.StackTrace.DebuggableFrameFlavor.for({...frameTemplate}));
  });

  it('returns a different instance if the same DebuggableFrame object changes', () => {
    const frame = {
      line: 20,
      column: 10,
      sdkFrame: sinon.createStubInstance(SDK.DebuggerModel.CallFrame),
    } satisfies StackTrace.StackTrace.DebuggableFrame;
    const flavor1 = StackTrace.StackTrace.DebuggableFrameFlavor.for(frame);

    const flavor2 = StackTrace.StackTrace.DebuggableFrameFlavor.for({...frame, line: 30});

    assert.notStrictEqual(flavor2, flavor1);
  });
});
