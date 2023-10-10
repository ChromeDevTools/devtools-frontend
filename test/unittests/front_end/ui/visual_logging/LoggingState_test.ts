// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as VisualLogging from '../../../../../front_end/ui/visual_logging/visual_logging-testing.js';

const {assert} = chai;

describe('LoggingState', () => {
  let parent: Element;
  let element: Element;

  beforeEach(() => {
    VisualLogging.LoggingState.resetStateForTesting();
    parent = document.createElement('div');
    parent.setAttribute('jslog', 'TreeItem');
    element = document.createElement('div');
    element.setAttribute('jslog', 'TreeItem; context:42');
  });

  it('creates state entry on demand', () => {
    const state = VisualLogging.LoggingState.getLoggingState(element, parent);
    assert.deepEqual(state, {
      impressionLogged: false,
      config: {ve: 1, context: 42},
      veid: 1,
      parent: {impressionLogged: false, config: {ve: 1}, veid: 2, parent: null},
    });
  });

  it('returns the same object for the same element', () => {
    const state = VisualLogging.LoggingState.getLoggingState(element, parent);
    assert.strictEqual(state, VisualLogging.LoggingState.getLoggingState(element));
  });
});
