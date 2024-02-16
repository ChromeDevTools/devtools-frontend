// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as VisualLogging from '../../../../../front_end/ui/visual_logging/visual_logging-testing.js';
import {stabilizeState} from '../../helpers/VisualLoggingHelpers.js';

const {assert} = chai;

describe('LoggingState', () => {
  let parent: Element;
  let element: Element;

  beforeEach(() => {
    parent = document.createElement('div');
    element = document.createElement('div');
  });

  it('getOrCreateLoggingState creates state entry on demand', () => {
    VisualLogging.LoggingState.getOrCreateLoggingState(parent, {ve: 1});
    const state = VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, context: '42'}, parent);
    assert.deepEqual(stabilizeState(state), {
      impressionLogged: false,
      config: {ve: 1, context: '42'},
      veid: 0,
      processed: false,
      context: state.context,
      parent: {
        impressionLogged: false,
        config: {ve: 1},
        veid: 1,
        processed: false,
        context: state.parent?.context as VisualLogging.LoggingState.ContextProvider,
        parent: null,
      },
    });
  });

  it('getOrCreateLoggingState and getLoggingState return the same object for the same element', () => {
    const state = VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, context: '42'}, parent);
    assert.strictEqual(
        state, VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, context: '42'}, parent));
    assert.strictEqual(state, VisualLogging.LoggingState.getLoggingState(element));
  });

  it('can update parent', () => {
    VisualLogging.LoggingState.getOrCreateLoggingState(parent, {ve: 1, context: '21'}, undefined);
    const state = VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, context: '42'}, parent);
    assert.strictEqual(state.parent, VisualLogging.LoggingState.getLoggingState(parent));

    const newParent = document.createElement('div');
    VisualLogging.LoggingState.getOrCreateLoggingState(parent, {ve: 1, context: '84'}, undefined);
    VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, context: '42'}, newParent);

    assert.strictEqual(state.parent, VisualLogging.LoggingState.getLoggingState(newParent));
  });

  it('getLoggingState returns null for unknown element', () => {
    assert.isNull(VisualLogging.LoggingState.getLoggingState(element));
  });

  it('hashes a string context', async () => {
    const state = VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, context: 'foobar'});
    const context = await state.context(element);
    assert.strictEqual(4191634312, context);
  });

  it('uses a custom context provider', async () => {
    const provider = sinon.stub();
    provider.returns(123);
    VisualLogging.LoggingState.registerContextProvider('custom', provider);
    const state = VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, context: 'custom'});
    const context = await state.context(element);
    assert.isTrue(provider.calledOnceWith(element));
    assert.strictEqual(123, context);
  });

  it('uses a custom parent provider', async () => {
    const provider = sinon.stub();
    const customParent = document.createElement('div');
    customParent.setAttribute('jslog', '<not important>');
    VisualLogging.LoggingState.getOrCreateLoggingState(customParent, {ve: 1, context: '123'});
    provider.returns(customParent);
    VisualLogging.LoggingState.registerParentProvider('custom', provider);
    const state = VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, parent: 'custom'});
    assert.isTrue(provider.calledOnceWith(element));
    assert.strictEqual(123, await state.parent?.context(element));
  });

  it('walks the DOM upwards to find the parent loggable', async () => {
    const provider = sinon.stub();
    const container = document.createElement('div');
    container.innerHTML = `
      <div id="loggable" jslog="Pane">
        <div id="providedByParentProvider"></div>
      </div>
    `;
    VisualLogging.LoggingState.getOrCreateLoggingState(
        container.querySelector('#loggable') as Element, {ve: 1, context: '123'});
    provider.returns(container.querySelector('#providedByParentProvider'));
    VisualLogging.LoggingState.registerParentProvider('custom2', provider);

    const state = VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, parent: 'custom2'});
    assert.isTrue(provider.calledOnceWith(element));
    assert.strictEqual(123, await state.parent?.context(element));
  });

  it('walks across shadow roots to find the parent loggable', async () => {
    const provider = sinon.stub();
    const container = document.createElement('div');
    container.innerHTML = `
      <div id="loggable" jslog="Pane">
        <div id="shadow"></div>
      </div>
    `;
    const shadow = container.querySelector('#shadow')?.attachShadow({mode: 'open'});
    const shadowContent = document.createElement('div');
    shadowContent.innerHTML = '<div id="providedByParentProvider"></div>';
    shadow?.appendChild(shadowContent);

    VisualLogging.LoggingState.getOrCreateLoggingState(
        container.querySelector('#loggable') as Element, {ve: 1, context: '123'});
    provider.returns(shadowContent.querySelector('#providedByParentProvider'));
    VisualLogging.LoggingState.registerParentProvider('custom3', provider);

    const state = VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, parent: 'custom3'});
    assert.isTrue(provider.calledOnceWith(element));
    assert.strictEqual(123, await state.parent?.context(element));
  });
});
