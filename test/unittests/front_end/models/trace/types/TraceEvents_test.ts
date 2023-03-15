// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
const {assert} = chai;

describe('TraceEvent types', () => {
  const {Phase, isNestableAsyncPhase, isAsyncPhase, isFlowPhase} = TraceEngine.Types.TraceEvents;
  it('is able to determine if a phase is a nestable async phase', () => {
    assert.isTrue(isNestableAsyncPhase(Phase.ASYNC_NESTABLE_START));
    assert.isTrue(isNestableAsyncPhase(Phase.ASYNC_NESTABLE_END));
    assert.isTrue(isNestableAsyncPhase(Phase.ASYNC_NESTABLE_INSTANT));
  });

  it('is able to determine if a phase is not a nestable async phase', () => {
    assert.isFalse(isNestableAsyncPhase(Phase.BEGIN));
    assert.isFalse(isNestableAsyncPhase(Phase.END));
    assert.isFalse(isNestableAsyncPhase(Phase.ASYNC_BEGIN));
  });

  it('is able to determine if a phase is an async phase', () => {
    assert.isTrue(isAsyncPhase(Phase.ASYNC_NESTABLE_START));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_NESTABLE_END));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_NESTABLE_INSTANT));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_BEGIN));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_STEP_INTO));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_STEP_PAST));
    assert.isTrue(isAsyncPhase(Phase.ASYNC_END));
  });

  it('is able to determine if a phase is not an async phase', () => {
    assert.isFalse(isAsyncPhase(Phase.BEGIN));
    assert.isFalse(isAsyncPhase(Phase.METADATA));
    assert.isFalse(isAsyncPhase(Phase.OBJECT_CREATED));
  });

  it('is able to determine if a phase is a flow phase', () => {
    assert.isTrue(isFlowPhase(Phase.FLOW_START));
    assert.isTrue(isFlowPhase(Phase.FLOW_STEP));
    assert.isTrue(isFlowPhase(Phase.FLOW_END));
  });

  it('is able to determine if a phase is not a flow phase', () => {
    assert.isFalse(isFlowPhase(Phase.ASYNC_STEP_INTO));
    assert.isFalse(isFlowPhase(Phase.ASYNC_NESTABLE_START));
    assert.isFalse(isFlowPhase(Phase.BEGIN));
  });
});
