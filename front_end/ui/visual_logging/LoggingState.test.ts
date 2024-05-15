// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getVeId} from '../../testing/VisualLoggingHelpers.js';

import * as VisualLogging from './visual_logging-testing.js';

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
    assert.deepEqual(state, {
      impressionLogged: false,
      config: {ve: 1, context: '42'},
      veid: getVeId(element),
      processed: false,
      size: new DOMRect(0, 0, 0, 0),
      parent: {
        impressionLogged: false,
        config: {ve: 1},
        veid: getVeId(parent),
        processed: false,
        parent: null,
        size: new DOMRect(0, 0, 0, 0),
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

  it('uses a custom parent provider', async () => {
    const provider = sinon.stub();
    const customParent = document.createElement('div');
    customParent.setAttribute('jslog', '<not important>');
    VisualLogging.LoggingState.getOrCreateLoggingState(customParent, {ve: 1, context: '123'});
    provider.returns(customParent);
    VisualLogging.LoggingState.registerParentProvider('custom', provider);
    const state = VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, parent: 'custom'});
    assert.isTrue(provider.calledOnceWith(element));
    assert.strictEqual('123', await state.parent?.config.context);
  });

  it('uses a mapped parent', async () => {
    const customParent = document.createElement('div');
    customParent.setAttribute('jslog', '<not important>');
    VisualLogging.LoggingState.getOrCreateLoggingState(customParent, {ve: 1, context: '123'});
    VisualLogging.LoggingState.setMappedParent(element, customParent);
    const state = VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, parent: 'custom'});
    assert.strictEqual('123', await state.parent?.config?.context);
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
    assert.strictEqual('123', await state.parent?.config.context);
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
    assert.strictEqual('123', await state.parent?.config.context);
  });
});
