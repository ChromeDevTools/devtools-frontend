// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {stabilizeEvent, stabilizeImpressions} from '../../testing/VisualLoggingHelpers.js';

import * as VisualLogging from './visual_logging-testing.js';

const {assert} = chai;

describe('LoggingEvents', () => {
  let parent: Element;
  let element: Element;
  let throttler: Common.Throttler.Throttler;

  beforeEach(() => {
    parent = document.createElement('div');
    element = document.createElement('div');
    VisualLogging.LoggingState.getOrCreateLoggingState(parent, {ve: 1});
    VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1}, parent).context = 42;
    throttler = new Common.Throttler.Throttler(1000000);
  });

  async function assertThrottled(stub: sinon.SinonStub) {
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(stub.called);
    await throttler.process?.();
    assert.isTrue(stub.calledOnce);
  }

  it('calls UI binding to log an impression', async () => {
    const recordImpression = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordImpression',
    );
    await VisualLogging.LoggingEvents.logImpressions([element, parent]);
    assert.isTrue(recordImpression.calledOnce);
    assert.sameDeepMembers(
        stabilizeImpressions(recordImpression.firstCall.firstArg.impressions),
        [{id: 0, type: 1, context: 42, parent: 1}, {id: 1, type: 1}]);
  });

  it('calls UI binding to log a click', async () => {
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );
    const event = new MouseEvent('click', {button: 1});
    VisualLogging.LoggingEvents.logClick(throttler)(element, event);
    await assertThrottled(recordClick);
    assert.deepStrictEqual(
        stabilizeEvent(recordClick.firstCall.firstArg), {veid: 0, mouseButton: 1, doubleClick: false});
  });

  it('calls UI binding to log a double click', async () => {
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );
    const event = new MouseEvent('dblclick', {button: 1});
    VisualLogging.LoggingEvents.logClick(throttler)(element, event, {doubleClick: true});
    await assertThrottled(recordClick);
    assert.deepStrictEqual(
        stabilizeEvent(recordClick.firstCall.firstArg), {veid: 0, mouseButton: 1, doubleClick: true});
  });

  it('calls UI binding to log a change', async () => {
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );
    const event = new Event('change');
    sinon.stub(event, 'currentTarget').value(element);
    await VisualLogging.LoggingEvents.logChange(event);
    assert.isTrue(recordChange.calledOnce);
    assert.deepStrictEqual(stabilizeEvent(recordChange.firstCall.firstArg), {veid: 0});
  });

  it('calls UI binding to log a keydown with any code', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown');
    sinon.stub(event, 'currentTarget').value(element);
    VisualLogging.LoggingEvents.logKeyDown(throttler)(event);
    await assertThrottled(recordKeyDown);
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.firstCall.firstArg), {veid: 0});
  });

  it('calls UI binding to log a keydown with a matching code', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'Enter'});
    sinon.stub(event, 'currentTarget').value(element);
    VisualLogging.LoggingEvents.logKeyDown(throttler, ['Enter', 'Escape'])(event);
    await assertThrottled(recordKeyDown);
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.firstCall.firstArg), {veid: 0});
  });

  it('calls UI binding to log a keydown with an provided context', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'Enter'});
    sinon.stub(event, 'currentTarget').value(element);
    VisualLogging.LoggingEvents.logKeyDown(throttler)(event, 21);
    await assertThrottled(recordKeyDown);
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.firstCall.firstArg), {veid: 0, context: 21});
  });

  it('does not call UI binding to log a keydown with a non-matching code', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'KeyQ'});
    sinon.stub(event, 'currentTarget').value(element);
    VisualLogging.LoggingEvents.logKeyDown(throttler, ['Enter', 'Escape'])(event);
    assert.isFalse(recordKeyDown.called);
  });

  it('calls UI binding to log a hover event', async () => {
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );
    const event = new MouseEvent('click', {button: 1});
    sinon.stub(event, 'currentTarget').value(element);
    void VisualLogging.LoggingEvents.logHover(throttler)(event);
    await assertThrottled(recordHover);
    assert.deepStrictEqual(stabilizeEvent(recordHover.firstCall.firstArg), {veid: 0});
  });

  it('calls UI binding to log a drag event', async () => {
    const recordDrag = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordDrag',
    );
    const event = new MouseEvent('click', {button: 1});
    sinon.stub(event, 'currentTarget').value(element);
    void VisualLogging.LoggingEvents.logDrag(throttler)(event);
    await assertThrottled(recordDrag);
    assert.deepStrictEqual(stabilizeEvent(recordDrag.firstCall.firstArg), {veid: 0});
  });

  it('calls UI binding to log a resize event', async () => {
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );
    VisualLogging.LoggingEvents.logResize(throttler)(element, new DOMRect(0, 0, 100, 50));
    await assertThrottled(recordResize);
    assert.deepStrictEqual(stabilizeEvent(recordResize.firstCall.firstArg), {veid: 0, width: 100, height: 50});
  });

  it('throttles calls UI binding to log a resize event', async () => {
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );
    VisualLogging.LoggingEvents.logResize(throttler)(element, new DOMRect(0, 0, 100, 50));
    await assertThrottled(recordResize);
    assert.deepStrictEqual(stabilizeEvent(recordResize.firstCall.firstArg), {veid: 0, width: 100, height: 50});
  });
});
