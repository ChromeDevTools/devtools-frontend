// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {expectCalled} from '../../testing/ExpectStubCall.js';
import {stabilizeEvent, stabilizeImpressions} from '../../testing/VisualLoggingHelpers.js';

import * as VisualLogging from './visual_logging-testing.js';

describe('LoggingEvents', () => {
  let parent: Element;
  let element: Element;
  let throttler: Common.Throttler.Throttler;

  beforeEach(() => {
    parent = document.createElement('div');
    element = document.createElement('div');
    VisualLogging.LoggingState.getOrCreateLoggingState(parent, {ve: 1});
    VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, context: '42'}, parent);
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
        [{id: 0, type: 1, context: 42, parent: 1, height: 0, width: 0}, {id: 1, type: 1, height: 0, width: 0}]);
  });

  it('calls UI binding to log a click', async () => {
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );
    // @ts-ignore
    const event = new MouseEvent('click', {button: 0, sourceCapabilities: new InputDeviceCapabilities()});
    VisualLogging.LoggingEvents.logClick(throttler)(element, event);
    await assertThrottled(recordClick);
    assert.deepStrictEqual(
        stabilizeEvent(recordClick.firstCall.firstArg), {veid: 0, mouseButton: 0, doubleClick: false});
  });

  it('does not set mouse button for synthetic clicks', async () => {
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );
    const event = new MouseEvent('click', {button: 0});
    VisualLogging.LoggingEvents.logClick(throttler)(element, event);
    await assertThrottled(recordClick);
    assert.deepStrictEqual(stabilizeEvent(recordClick.firstCall.firstArg), {veid: 0, doubleClick: false});
  });

  it('calls UI binding to log a double click', async () => {
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );
    const event = new MouseEvent('dblclick', {button: 1});
    VisualLogging.LoggingEvents.logClick(throttler)(element, event, {doubleClick: true});
    await assertThrottled(recordClick);
    assert.deepStrictEqual(stabilizeEvent(recordClick.firstCall.firstArg), {veid: 0, doubleClick: true});
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

  it('calls UI binding to log a change of specific type', async () => {
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );
    const event = new Event('change');
    sinon.stub(event, 'currentTarget').value(element);
    VisualLogging.LoggingState.getLoggingState(element)!.lastInputEventType = 'instertText';
    await VisualLogging.LoggingEvents.logChange(event);
    assert.isTrue(recordChange.calledOnce);
    assert.deepStrictEqual(stabilizeEvent(recordChange.firstCall.firstArg), {veid: 0, context: 296063892});
  });

  it('calls UI binding to log a keydown with any code', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown');
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event);
    await assertThrottled(recordKeyDown);
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.firstCall.firstArg), {veid: 0});
  });

  it('calls UI binding to log a keydown with a matching code', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'Enter', key: 'Enter'});
    VisualLogging.LoggingState.getLoggingState(element)!.config.track = {keydown: 'Enter|Escape'};
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event);
    await assertThrottled(recordKeyDown);
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.firstCall.firstArg), {veid: 0, context: 513111094});
  });

  it('calls UI binding to log a keydown with an provided context', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'Enter'});
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event, '21');
    await assertThrottled(recordKeyDown);
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.firstCall.firstArg), {veid: 0, context: 21});
  });

  it('throttles subsequent keydowns', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'Enter'});
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event);
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event);
    await assertThrottled(recordKeyDown);
  });

  it('does not drop keydowns with a specific context', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'Enter'});
    sinon.stub(event, 'currentTarget').value(element);
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event, '1');
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event, '2');
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(recordKeyDown.calledOnce);
    await throttler.process?.();
    assert.isTrue(recordKeyDown.calledTwice);
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.firstCall.firstArg), {veid: 0, context: 1});
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.secondCall.firstArg), {veid: 0, context: 2});
  });

  it('throttles subsequent keydowns with the same context', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'Enter'});
    sinon.stub(event, 'currentTarget').value(element);
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event, '1');
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event, '1');
    await assertThrottled(recordKeyDown);
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.firstCall.firstArg), {veid: 0, context: 1});
  });

  it('does not call UI binding to log a keydown with a non-matching code', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'KeyQ'});
    VisualLogging.LoggingState.getLoggingState(element)!.config.track = {keydown: 'Enter|Escape'};
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event);
    assert.isFalse(recordKeyDown.called);
  });

  it('calls UI binding to log a hover event', async () => {
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );
    const event = new MouseEvent('click', {button: 1});
    sinon.stub(event, 'currentTarget').value(element);
    void VisualLogging.LoggingEvents.logHover(new Common.Throttler.Throttler(0))(event);
    await expectCalled(recordHover);
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
    await throttler.schedule(async () => {}, true);
    await assertThrottled(recordDrag);
    assert.deepStrictEqual(stabilizeEvent(recordDrag.firstCall.firstArg), {veid: 0});
  });

  it('calls UI binding to log a resize event', async () => {
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );
    VisualLogging.LoggingEvents.logResize(element, new DOMRect(0, 0, 100, 50));
    assert.deepStrictEqual(stabilizeEvent(recordResize.firstCall.firstArg), {veid: 0, width: 100, height: 50});
  });

  it('throttles calls UI binding to log a resize event', async () => {
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );
    VisualLogging.LoggingEvents.logResize(element, new DOMRect(0, 0, 100, 50));
    assert.deepStrictEqual(stabilizeEvent(recordResize.firstCall.firstArg), {veid: 0, width: 100, height: 50});
  });
});
