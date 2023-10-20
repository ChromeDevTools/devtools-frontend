// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Host from '../../../../../front_end/core/host/host.js';
import * as VisualLoggingTesting from '../../../../../front_end/ui/visual_logging/visual_logging-testing.js';
import {renderElementIntoDOM} from '../../helpers/DOMHelpers.js';

const {assert} = chai;

describe('LoggingDriver', () => {
  let recordImpression: sinon.SinonStub;
  const throttler = new Common.Throttler.Throttler(1000000000);

  beforeEach(() => {
    VisualLoggingTesting.LoggingState.resetStateForTesting();
    recordImpression = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordImpression',
    );
  });

  afterEach(() => {
    VisualLoggingTesting.LoggingDriver.stopLogging();
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  });

  function addLoggableElements() {
    const parent = document.createElement('div') as HTMLElement;
    parent.id = 'parent';
    parent.setAttribute('jslog', 'TreeItem; track: hover');
    parent.style.width = '300px';
    parent.style.height = '300px';
    const element = document.createElement('div') as HTMLElement;
    element.id = 'element';
    element.setAttribute('jslog', 'TreeItem; context:42; track: click, keydown, hover, drag');
    element.style.width = '300px';
    element.style.height = '300px';
    parent.appendChild(element);
    renderElementIntoDOM(parent);
  }

  it('logs impressions on startLogging', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    assert.isTrue(recordImpression.calledOnce);
    assert.sameDeepMembers(
        recordImpression.firstCall.firstArg.impressions, [{id: 2, type: 1, context: 42, parent: 1}, {id: 1, type: 1}]);
  });

  async function assertImpressionRecordedDeferred() {
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordImpression.called);

    assert.exists(throttler.process);
    await throttler.process?.();
    assert.isTrue(recordImpression.called);
  }

  it('does not log impressions when hidden', async () => {
    addLoggableElements();
    sinon.stub(document, 'hidden').value(true);
    await VisualLoggingTesting.LoggingDriver.startLogging({domProcessingThrottler: throttler});
    assert.isFalse(recordImpression.called);
  });

  it('logs impressions when visibility changes', async () => {
    let hidden = true;
    addLoggableElements();
    sinon.stub(document, 'hidden').get(() => hidden);
    await VisualLoggingTesting.LoggingDriver.startLogging({domProcessingThrottler: throttler});

    hidden = false;
    const event = document.createEvent('Event');
    event.initEvent('visibilitychange', true, true);
    document.dispatchEvent(event);

    await assertImpressionRecordedDeferred();
  });

  it('logs impressions on scroll', async () => {
    addLoggableElements();
    const parent = document.getElementById('parent') as HTMLElement;
    parent.style.marginTop = '2000px';
    await VisualLoggingTesting.LoggingDriver.startLogging({domProcessingThrottler: throttler});

    window.scrollTo({
      top: 2000,
      left: 0,
      behavior: 'instant',
    });
    await new Promise(resolve => window.addEventListener('scrollend', resolve, {once: true}));
    await assertImpressionRecordedDeferred();
  });

  it('logs impressions on mutation', async () => {
    await VisualLoggingTesting.LoggingDriver.startLogging({domProcessingThrottler: throttler});
    addLoggableElements();
    await assertImpressionRecordedDeferred();
  });

  it('logs impressions on mutation in shadow DOM', async () => {
    const parent = document.createElement('div') as HTMLElement;
    renderElementIntoDOM(parent);
    const shadow = parent.attachShadow({mode: 'open'});
    const shadowContent = document.createElement('div');
    shadow.appendChild(shadowContent);

    await VisualLoggingTesting.LoggingDriver.startLogging({domProcessingThrottler: throttler});
    shadowContent.innerHTML = '<div jslog="TreeItem" style="width:300px;height:300px"></div>';
    await assertImpressionRecordedDeferred();
  });

  it('logs clicks', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.click();

    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isTrue(recordClick.calledOnce);
  });

  it('does not log clicks if not configured', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    const parent = document.getElementById('parent') as HTMLElement;
    parent.click();

    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordClick.called);
  });

  it('logs keydown', async () => {
    const keyboardLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({keyboardLogThrottler});
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new KeyboardEvent('keydown', {'key': 'a'}));
    element.dispatchEvent(new KeyboardEvent('keydown', {'key': 'b'}));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.exists(keyboardLogThrottler.process);
    assert.isFalse(recordKeyDown.called);

    await keyboardLogThrottler.process?.();
    assert.isTrue(recordKeyDown.calledOnce);
  });

  it('logs hover', async () => {
    const hoverLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({hoverLogThrottler});
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new MouseEvent('mouseover'));
    assert.exists(hoverLogThrottler.process);
    assert.isFalse(recordHover.called);

    await hoverLogThrottler.process?.();
    assert.isTrue(recordHover.calledOnce);
  });

  it('does not log hover if too short', async () => {
    const hoverLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({hoverLogThrottler});
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new MouseEvent('mouseover'));
    assert.exists(hoverLogThrottler.process);
    assert.isFalse(recordHover.called);

    element.dispatchEvent(new MouseEvent('mouseout'));

    await hoverLogThrottler.process?.();
    assert.isFalse(recordHover.called);
  });

  it('does not log hover if in descendent', async () => {
    const hoverLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({hoverLogThrottler});
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );

    const parent = document.getElementById('parent') as HTMLElement;
    const element = document.getElementById('element') as HTMLElement;
    parent.dispatchEvent(new MouseEvent('mouseover'));
    assert.exists(hoverLogThrottler.process);
    assert.isFalse(recordHover.called);

    element.dispatchEvent(new MouseEvent('mouseover'));

    await hoverLogThrottler.process?.();
    assert.isTrue(recordHover.called);
    assert.deepStrictEqual(recordHover.firstCall.firstArg, {veid: 2, context: 42});
  });

  it('logs drag', async () => {
    const dragLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({dragLogThrottler});
    const recordDrag = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordDrag',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new MouseEvent('pointerdown'));
    assert.exists(dragLogThrottler.process);
    assert.isFalse(recordDrag.called);

    await dragLogThrottler.process?.();
    assert.isTrue(recordDrag.calledOnce);
  });

  it('does not log drag if too short', async () => {
    const dragLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({dragLogThrottler});
    const recordDrag = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordDrag',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new MouseEvent('pointerdown'));
    assert.exists(dragLogThrottler.process);
    assert.isFalse(recordDrag.called);

    element.dispatchEvent(new MouseEvent('pointerup'));

    await dragLogThrottler.process?.();
    assert.isFalse(recordDrag.called);
  });

});
