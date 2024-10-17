// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {expectCalled} from '../../testing/ExpectStubCall.js';
import {getVeId} from '../../testing/VisualLoggingHelpers.js';

import * as VisualLogging from './visual_logging-testing.js';

describe('LoggingEvents', () => {
  let parent: Element;
  let element: Element;
  let veid: number;
  let throttler: Common.Throttler.Throttler;

  beforeEach(() => {
    parent = document.createElement('div');
    element = document.createElement('div');
    VisualLogging.LoggingState.getOrCreateLoggingState(parent, {ve: 1});
    VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, context: '42'}, parent);
    veid = getVeId(element);
    throttler = new Common.Throttler.Throttler(1000000);
  });

  afterEach(async () => {
    await throttler.schedule(async () => {}, Common.Throttler.Scheduling.AS_SOON_AS_POSSIBLE);
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
    assert.sameDeepMembers(recordImpression.firstCall.firstArg.impressions, [
      {id: veid, type: 1, context: 42, parent: getVeId(parent), height: 0, width: 0},
      {id: getVeId(parent), type: 1, height: 0, width: 0},
    ]);
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
    assert.deepStrictEqual(recordClick.firstCall.firstArg, {veid, mouseButton: 0, doubleClick: false});
  });

  it('does not set mouse button for synthetic clicks', async () => {
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );
    const event = new MouseEvent('click', {button: 0});
    VisualLogging.LoggingEvents.logClick(throttler)(element, event);
    await assertThrottled(recordClick);
    assert.deepStrictEqual(recordClick.firstCall.firstArg, {veid, doubleClick: false});
  });

  it('calls UI binding to log a double click', async () => {
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );
    const event = new MouseEvent('dblclick', {button: 1});
    VisualLogging.LoggingEvents.logClick(throttler)(element, event, {doubleClick: true});
    await assertThrottled(recordClick);
    assert.deepStrictEqual(recordClick.firstCall.firstArg, {veid, doubleClick: true});
  });

  it('calls UI binding to log a change', async () => {
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );
    await VisualLogging.LoggingEvents.logChange(element);
    assert.isTrue(recordChange.calledOnce);
    assert.deepStrictEqual(recordChange.firstCall.firstArg, {veid});
  });

  it('calls UI binding to log a change of specific type', async () => {
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );
    VisualLogging.LoggingState.getLoggingState(element)!.pendingChangeContext = 'instertText';
    await VisualLogging.LoggingEvents.logChange(element);
    assert.isTrue(recordChange.calledOnce);
    assert.deepStrictEqual(recordChange.firstCall.firstArg, {veid, context: 296063892});
  });

  it('calls UI binding to log a keydown with any code', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown');
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event);
    await assertThrottled(recordKeyDown);
    assert.deepStrictEqual(recordKeyDown.firstCall.firstArg, {veid});
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
    assert.deepStrictEqual(recordKeyDown.firstCall.firstArg, {veid, context: 513111094});
  });

  it('calls UI binding to log a keydown with a matching key', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'Period', key: '>'});
    VisualLogging.LoggingState.getLoggingState(element)!.config.track = {keydown: '>'};
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event);
    await assertThrottled(recordKeyDown);
    assert.deepStrictEqual(recordKeyDown.firstCall.firstArg, {veid: getVeId(element), context: -1098575095});
  });

  it('calls UI binding to log a keydown with an provided context', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'Enter'});
    void VisualLogging.LoggingEvents.logKeyDown(throttler)(element, event, '21');
    await assertThrottled(recordKeyDown);
    assert.deepStrictEqual(recordKeyDown.firstCall.firstArg, {veid, context: 21});
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
    assert.deepStrictEqual(recordKeyDown.firstCall.firstArg, {veid, context: 1});
    assert.deepStrictEqual(recordKeyDown.secondCall.firstArg, {veid, context: 2});
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
    assert.deepStrictEqual(recordKeyDown.firstCall.firstArg, {veid, context: 1});
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
    assert.deepStrictEqual(recordHover.firstCall.firstArg, {veid});
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
    assert.deepStrictEqual(recordDrag.firstCall.firstArg, {veid});
  });

  it('calls UI binding to log a resize event', async () => {
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );
    VisualLogging.LoggingEvents.logResize(element, new DOMRect(0, 0, 100, 50));
    assert.deepStrictEqual(recordResize.firstCall.firstArg, {veid, width: 100, height: 50});
  });

  it('throttles calls UI binding to log a resize event', async () => {
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );
    VisualLogging.LoggingEvents.logResize(element, new DOMRect(0, 0, 100, 50));
    assert.deepStrictEqual(recordResize.firstCall.firstArg, {veid, width: 100, height: 50});
  });
});
