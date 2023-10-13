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
      config: {ve: 1, context: '42'},
      veid: 1,
      processed: false,
      context: state.context,
      parent: {
        impressionLogged: false,
        config: {ve: 1},
        veid: 2,
        processed: false,
        context: state.parent?.context as VisualLogging.LoggingState.ContextProvider,
        parent: null,
      },
    });
  });

  it('returns the same object for the same element', () => {
    const state = VisualLogging.LoggingState.getLoggingState(element, parent);
    assert.strictEqual(state, VisualLogging.LoggingState.getLoggingState(element));
  });

  it('hashes a string context', async () => {
    element.setAttribute('jslog', 'TreeItem; context: foobar');
    const state = VisualLogging.LoggingState.getLoggingState(element);
    const context = await state.context(element);
    assert.strictEqual(4191634312, context);
  });

  it('uses a custom context provider', async () => {
    const provider = sinon.stub();
    provider.returns(123);
    VisualLogging.LoggingState.registerContextProvider('custom', provider);
    element.setAttribute('jslog', 'TreeItem; context: custom');
    const state = VisualLogging.LoggingState.getLoggingState(element);
    const context = await state.context(element);
    assert.isTrue(provider.calledOnceWith(element));
    assert.strictEqual(123, context);
  });

  it('uses a custom parent provider', async () => {
    const provider = sinon.stub();
    const customParent = document.createElement('div');
    customParent.setAttribute('jslog', 'TreeItem; context: 123');
    provider.returns(customParent);
    VisualLogging.LoggingState.registerParentProvider('custom', provider);
    element.setAttribute('jslog', 'TreeItem; parent: custom');
    const state = VisualLogging.LoggingState.getLoggingState(element);
    assert.isTrue(provider.calledOnceWith(element));
    assert.strictEqual(123, await state.parent?.context(element));
  });
});
