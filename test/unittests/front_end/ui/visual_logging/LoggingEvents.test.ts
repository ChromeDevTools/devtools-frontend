// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Host from '../../../../../front_end/core/host/host.js';
import * as VisualLogging from '../../../../../front_end/ui/visual_logging/visual_logging-testing.js';
import {stabilizeEvent, stabilizeImpressions} from '../../helpers/VisualLoggingHelpers.js';

const {assert} = chai;

describe('LoggingEvents', () => {
  let parent: Element;
  let element: Element;

  beforeEach(() => {
    parent = document.createElement('div');
    element = document.createElement('div');
    VisualLogging.LoggingState.getOrCreateLoggingState(parent, {ve: 1});
    VisualLogging.LoggingState.getOrCreateLoggingState(element, {ve: 1, context: '42'}, parent);
  });

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
    await VisualLogging.LoggingEvents.logClick(element, event);
    assert.isTrue(recordClick.calledOnce);
    assert.deepStrictEqual(
        stabilizeEvent(recordClick.firstCall.firstArg), {veid: 0, context: 42, mouseButton: 1, doubleClick: false});
  });

  it('calls UI binding to log a double click', async () => {
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );
    const event = new MouseEvent('dblclick', {button: 1});
    await VisualLogging.LoggingEvents.logClick(element, event, {doubleClick: true});
    assert.isTrue(recordClick.calledOnce);
    assert.deepStrictEqual(
        stabilizeEvent(recordClick.firstCall.firstArg), {veid: 0, context: 42, mouseButton: 1, doubleClick: true});
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
    assert.deepStrictEqual(stabilizeEvent(recordChange.firstCall.firstArg), {veid: 0, context: 42});
  });

  it('calls UI binding to log a keydown with any code', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown');
    sinon.stub(event, 'currentTarget').value(element);
    const throttler = new Common.Throttler.Throttler(1000000);
    void VisualLogging.LoggingEvents.logKeyDown([], throttler)(event);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordKeyDown.called);
    await throttler.process?.();
    assert.isTrue(recordKeyDown.calledOnce);
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.firstCall.firstArg), {veid: 0, context: 42});
  });

  it('calls UI binding to log a keydown with a matching code', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'Enter'});
    sinon.stub(event, 'currentTarget').value(element);
    const throttler = new Common.Throttler.Throttler(1000000);
    void VisualLogging.LoggingEvents.logKeyDown(['Enter', 'Escape'], throttler)(event);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordKeyDown.called);
    await throttler.process?.();
    assert.isTrue(recordKeyDown.calledOnce);
    assert.deepStrictEqual(stabilizeEvent(recordKeyDown.firstCall.firstArg), {veid: 0, context: 42});
  });

  it('does not call UI binding to log a keydown with a non-matching code', async () => {
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    const event = new KeyboardEvent('keydown', {code: 'KeyQ'});
    sinon.stub(event, 'currentTarget').value(element);
    const throttler = new Common.Throttler.Throttler(1000000);
    await VisualLogging.LoggingEvents.logKeyDown(['Enter', 'Escape'], throttler)(event);
    assert.isFalse(recordKeyDown.called);
    assert.notExists(throttler.process);
  });

  it('calls UI binding to log a hover event', async () => {
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );
    const event = new MouseEvent('click', {button: 1});
    sinon.stub(event, 'currentTarget').value(element);
    const throttler = new Common.Throttler.Throttler(1000000);
    void VisualLogging.LoggingEvents.logHover(throttler)(event);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordHover.called);
    await throttler.process?.();
    assert.isTrue(recordHover.calledOnce);
    assert.deepStrictEqual(stabilizeEvent(recordHover.firstCall.firstArg), {veid: 0, context: 42});
  });

  it('calls UI binding to log a drag event', async () => {
    const recordDrag = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordDrag',
    );
    const event = new MouseEvent('click', {button: 1});
    sinon.stub(event, 'currentTarget').value(element);
    const throttler = new Common.Throttler.Throttler(1000000);
    void VisualLogging.LoggingEvents.logDrag(throttler)(event);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordDrag.called);
    await throttler.process?.();
    assert.isTrue(recordDrag.calledOnce);
    assert.deepStrictEqual(stabilizeEvent(recordDrag.firstCall.firstArg), {veid: 0, context: 42});
  });

  it('calls UI binding to log a resize event', async () => {
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );
    const throttler = new Common.Throttler.Throttler(1000000);
    const loggingState = VisualLogging.LoggingState.getLoggingState(element);
    loggingState!.size = new DOMRect(0, 0, 100, 50);
    void VisualLogging.LoggingEvents.logResize(throttler)(element);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordResize.called);
    await throttler.process?.();
    assert.isTrue(recordResize.calledOnce);
    assert.deepStrictEqual(stabilizeEvent(recordResize.firstCall.firstArg), {veid: 0, width: 100, height: 50});
  });
});
