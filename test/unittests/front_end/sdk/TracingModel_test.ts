// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {TracingModel} from '../../../../front_end/sdk/TracingModel.js';

describe('TracingModel', () => {
  it('is able to determine if a phase is a nestable async phase', () => {
    assert.isTrue(TracingModel.isNestableAsyncPhase('b'), '\'b\' should be considered a nestable async phase');
    assert.isTrue(TracingModel.isNestableAsyncPhase('e'), '\'e\' should be considered a nestable async phase');
    assert.isTrue(TracingModel.isNestableAsyncPhase('n'), '\'n\' should be considered a nestable async phase');
  });

  it('is able to determine if a phase is not a nestable async phase', () => {
    assert.isFalse(TracingModel.isNestableAsyncPhase('a'), '\'a\' should not be considered a nestable async phase');
    assert.isFalse(TracingModel.isNestableAsyncPhase('f'), '\'f\' should not be considered a nestable async phase');
    assert.isFalse(TracingModel.isNestableAsyncPhase('m'), '\'m\' should not be considered a nestable async phase');
  });

  // TODO continue writing tests here or use another describe block
});
