// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Host from '../../../../../front_end/core/host/host.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as VisualLoggingTesting from '../../../../../front_end/ui/visual_logging/visual_logging-testing.js';
import {renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {stabilizeEvent, stabilizeImpressions} from '../../helpers/VisualLoggingHelpers.js';

const {assert} = chai;

describe('LoggingDriver', () => {
  let recordImpression: sinon.SinonStub;
  let throttler: Common.Throttler.Throttler;

  beforeEach(() => {
    throttler = new Common.Throttler.Throttler(1000000000);
    recordImpression = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordImpression',
    );
  });

  afterEach(() => {
    VisualLoggingTesting.LoggingDriver.stopLogging();
  });

  function addLoggableElements() {
    const parent = document.createElement('div') as HTMLElement;
    parent.id = 'parent';
    parent.setAttribute('jslog', 'TreeItem; track: hover');
    parent.style.width = '300px';
    parent.style.height = '300px';
    const element = document.createElement('div') as HTMLElement;
    element.id = 'element';
    element.setAttribute('jslog', 'TreeItem; context:42; track: click, keydown, hover, drag, resize');
    element.style.width = '300px';
    element.style.height = '300px';
    parent.appendChild(element);
    renderElementIntoDOM(parent);
  }

  it('logs impressions on startLogging', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    assert.isTrue(recordImpression.calledOnce);
    assert.sameDeepMembers(stabilizeImpressions(recordImpression.firstCall.firstArg.impressions), [
      {id: 1, type: 1, context: 42, parent: 0, 'width': 300, 'height': 300},
      {id: 0, type: 1, 'width': 300, 'height': 300},
    ]);

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
    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    assert.isFalse(recordImpression.called);
  });

  it('logs impressions when visibility changes', async () => {
    let hidden = true;
    addLoggableElements();
    sinon.stub(document, 'hidden').get(() => hidden);
    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});

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
    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});

    let scrollendPromise = new Promise(resolve => window.addEventListener('scrollend', resolve, {once: true}));
    window.scrollTo({
      top: 2000,
      left: 0,
      behavior: 'instant',
    });
    await scrollendPromise;
    await assertImpressionRecordedDeferred();

    scrollendPromise = new Promise(resolve => window.addEventListener('scrollend', resolve, {once: true}));
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
    await scrollendPromise;
  });

  it('logs impressions on mutation', async () => {
    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    addLoggableElements();
    await assertImpressionRecordedDeferred();
  });

  it('logs impressions on mutation in shadow DOM', async () => {
    const parent = document.createElement('div') as HTMLElement;
    renderElementIntoDOM(parent);
    const shadow = parent.attachShadow({mode: 'open'});
    const shadowContent = document.createElement('div');
    shadow.appendChild(shadowContent);

    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    shadowContent.innerHTML = '<div jslog="TreeItem" style="width:300px;height:300px"></div>';
    await assertImpressionRecordedDeferred();
  });

  it('logs impressions on mutation in additional document', async () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement;
    renderElementIntoDOM(iframe);

    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    const iframeDocument = iframe.contentDocument;
    assertNotNullOrUndefined(iframeDocument);
    await VisualLoggingTesting.LoggingDriver.addDocument(iframeDocument);
    iframeDocument.body.innerHTML = '<div jslog="TreeItem" style="width:300px;height:300px"></div>';
    await assertImpressionRecordedDeferred();
  });

  it('correctly determines visiblity in additional document', async () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement;
    renderElementIntoDOM(iframe);
    iframe.style.width = '100px';
    iframe.style.height = '100px';
    iframe.width = '100';
    iframe.height = '100';
    const iframeDocument = iframe.contentDocument;
    assertNotNullOrUndefined(iframeDocument);
    iframeDocument.body.innerHTML =  // Second div should not be out of viewport and not logged
        `<div style="width:150px;height:150px"></div>
         <div jslog="TreeItem" style="width:150px;height:150px"></div>`;

    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    await VisualLoggingTesting.LoggingDriver.addDocument(iframeDocument);
    assert.isFalse(recordImpression.called);
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

  it('does not log click on double click', async () => {
    const clickLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    const element = document.getElementById('element') as HTMLElement;
    element.setAttribute('jslog', 'TreeItem; context:42; track: click, dblclick');
    await VisualLoggingTesting.LoggingDriver.startLogging({clickLogThrottler});
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    element.dispatchEvent(new MouseEvent('click'));
    element.dispatchEvent(new MouseEvent('dblclick'));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.exists(clickLogThrottler.process);
    assert.isFalse(recordClick.called);

    await clickLogThrottler.process?.();
    assert.isTrue(recordClick.calledOnce);
    assert.deepStrictEqual(
        stabilizeEvent(recordClick.firstCall.firstArg), {veid: 0, context: 42, mouseButton: 0, doubleClick: true});
  });

  it('does not log click on parent when clicked on child', async () => {
    const clickLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    const parent = document.getElementById('parent') as HTMLElement;
    parent.setAttribute('jslog', 'TreeItem; track: click');
    await VisualLoggingTesting.LoggingDriver.startLogging({clickLogThrottler});
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.exists(clickLogThrottler.process);
    assert.isFalse(recordClick.called);

    await clickLogThrottler.process?.();
    assert.isTrue(recordClick.calledOnce);
    assert.deepStrictEqual(
        stabilizeEvent(recordClick.firstCall.firstArg), {veid: 0, context: 42, mouseButton: 0, doubleClick: false});
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
    assert.deepStrictEqual(stabilizeEvent(recordHover.firstCall.firstArg), {veid: 0, context: 42});
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

  it('logs resize', async () => {
    const resizeLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    const element = document.getElementById('element') as HTMLElement;

    element.style.height = '400px';
    await new Promise(resolve => new ResizeObserver(resolve).observe(element));
    assert.exists(resizeLogThrottler.process);
    assert.isFalse(recordResize.called);

    await resizeLogThrottler.process?.();
    assert.isTrue(recordResize.calledOnce);
  });

  it('does not log resize if too small', async () => {
    const resizeLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.style.height = '301px';
    assert.isNull(resizeLogThrottler.process);
    assert.isFalse(recordResize.called);
  });

  it('marks loggable elements for debugging', async () => {
    // @ts-ignore
    globalThis.setVeDebuggingEnabled(true);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    assert.strictEqual(document.getElementById('parent')?.style.outline, 'red solid 1px');
    assert.strictEqual(document.getElementById('element')?.style.outline, 'red solid 1px');
  });

  it('logs non-DOM impressions', async () => {
    addLoggableElements();
    const loggable = {};
    VisualLoggingTesting.NonDomState.registerLoggable(
        loggable, {ve: 1, context: '123'}, document.getElementById('parent') || undefined);
    await VisualLoggingTesting.LoggingDriver.startLogging();
    assert.isTrue(recordImpression.calledOnce);

    assert.sameDeepMembers(stabilizeImpressions(recordImpression.firstCall.firstArg.impressions), [
      {id: 2, type: 1, context: 123, parent: 0},
      {id: 1, type: 1, context: 42, parent: 0, 'width': 300, 'height': 300},
      {id: 0, type: 1, 'width': 300, 'height': 300},
    ]);
    assert.isEmpty(VisualLoggingTesting.NonDomState.getNonDomState().loggables);
  });
});
