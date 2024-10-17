// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {expectCall, expectCalled} from '../../testing/ExpectStubCall.js';
import {getVeId} from '../../testing/VisualLoggingHelpers.js';

import * as VisualLoggingTesting from './visual_logging-testing.js';

describe('LoggingDriver', () => {
  let recordImpression: sinon.SinonStub;
  let throttler: Common.Throttler.Throttler;
  let throttle: sinon.SinonStub;
  let onerror: OnErrorEventHandler;

  before(() => {
    onerror = window.onerror;
    window.onerror = (message, url, lineNumber, column, error) => {
      if (message !== 'ResizeObserver loop completed with undelivered notifications.' && onerror) {
        onerror.apply(window, [message, url, lineNumber, column, error]);
      }
    };
  });

  after(() => {
    window.onerror = onerror;
  });

  beforeEach(() => {
    throttler = new Common.Throttler.Throttler(1000000000);
    throttle = sinon.stub(throttler, 'schedule');
    recordImpression = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordImpression',
    );
  });

  afterEach(async () => {
    await VisualLoggingTesting.LoggingDriver.stopLogging();
  });

  function addLoggableElements() {
    const parent = document.createElement('div') as HTMLElement;
    parent.id = 'parent';
    parent.setAttribute('jslog', 'TreeItem; track: hover');
    parent.style.width = '300px';
    parent.style.height = '300px';
    const element = document.createElement('div') as HTMLElement;
    element.id = 'element';
    element.setAttribute('jslog', 'TreeItem; context:42; track: click, keydown, hover, drag, resize, change');
    element.style.width = '300px';
    element.style.height = '300px';
    parent.appendChild(element);
    renderElementIntoDOM(parent);
  }

  it('logs impressions on startLogging', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    assert.isTrue(recordImpression.calledOnce);
    assert.sameDeepMembers(recordImpression.firstCall.firstArg.impressions, [
      {id: getVeId('#element'), type: 1, context: 42, parent: getVeId('#parent'), width: 300, height: 300},
      {id: getVeId('#parent'), type: 1, width: 300, height: 300},
    ]);
  });

  async function assertImpressionRecordedDeferred() {
    const [work] = await expectCalled(throttle);
    assert.isFalse(recordImpression.called);

    await work();
    assert.isTrue(recordImpression.called);
  }

  it('does not log impressions when document hidden', async () => {
    addLoggableElements();
    sinon.stub(document, 'hidden').value(true);
    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    assert.isFalse(recordImpression.called);
  });

  it('does not log impressions when parent hidden', async () => {
    addLoggableElements();
    const parent = document.getElementById('parent') as HTMLElement;
    parent.style.height = '0';
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

    const scrollend = sinon.stub();
    window.addEventListener('scrollend', scrollend);
    window.scrollTo({
      top: 2000,
      left: 0,
      behavior: 'instant',
    });
    await expectCalled(scrollend);
    await assertImpressionRecordedDeferred();

    scrollend.resetHistory();
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
    await expectCalled(scrollend);
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
    assert.exists(iframeDocument);
    await VisualLoggingTesting.LoggingDriver.addDocument(iframeDocument);
    iframeDocument.body.innerHTML = '<div jslog="TreeItem" style="width:300px;height:300px"></div>';
    await assertImpressionRecordedDeferred();
  });

  it('correctly determines visibility in additional document', async () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement;
    renderElementIntoDOM(iframe);
    iframe.style.width = '100px';
    iframe.style.height = '100px';
    iframe.width = '100';
    iframe.height = '100';
    const iframeDocument = iframe.contentDocument;
    assert.exists(iframeDocument);
    iframeDocument.body.innerHTML =  // Second div should not be out of viewport and not logged
        `<div style="width:150px;height:150px"></div>
         <div jslog="TreeItem" style="width:150px;height:150px"></div>`;

    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    await VisualLoggingTesting.LoggingDriver.addDocument(iframeDocument);
    assert.isFalse(recordImpression.called);
  });

  it('hashes a string context', async () => {
    const element = document.createElement('div') as HTMLElement;
    element.setAttribute('jslog', 'TreeItem; track: hover; context: foobar');
    element.style.width = '300px';
    element.style.height = '300px';
    renderElementIntoDOM(element);

    await VisualLoggingTesting.LoggingDriver.startLogging();
    assert.isTrue(recordImpression.calledOnce);
    assert.strictEqual(recordImpression.firstCall.firstArg.impressions[0]?.context, -103332984);
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

    await expectCalled(recordClick);
  });

  it('logs right clicks', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new MouseEvent('contextmenu'));

    await expectCalled(recordClick);
  });

  it('logs middle clicks', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new MouseEvent('auxclick'));

    await expectCalled(recordClick);
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
    addLoggableElements();
    const element = document.getElementById('element') as HTMLElement;
    element.setAttribute('jslog', 'TreeItem; context:42; track: click, dblclick');
    await VisualLoggingTesting.LoggingDriver.startLogging({clickLogThrottler: throttler});
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    element.dispatchEvent(new MouseEvent('click'));
    element.dispatchEvent(new MouseEvent('dblclick'));
    const [logging] = await expectCalled(throttle);
    assert.isTrue(throttle.calledTwice);
    assert.isFalse(recordClick.called);

    await logging();
    assert.isTrue(recordClick.calledOnce);
    assert.isTrue(recordClick.firstCall.firstArg.doubleClick);
  });

  it('does not log click on parent when clicked on child', async () => {
    addLoggableElements();
    const parent = document.getElementById('parent') as HTMLElement;
    parent.setAttribute('jslog', 'TreeItem; track: click');
    await VisualLoggingTesting.LoggingDriver.startLogging({clickLogThrottler: throttler});
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.click();
    const [logging] = await expectCalled(throttle);
    assert.isFalse(recordClick.called);

    await logging();
    assert.isTrue(recordClick.calledOnce);
    assert.strictEqual(recordClick.firstCall.firstArg.veid, getVeId(element));
  });

  const logsSelectOptions = (event: Event) => async () => {
    const parent = document.createElement('div') as HTMLElement;
    parent.innerHTML = `
      <select jslog="TreeItem; context: 0" id="select" style="width: 30px; height: 20px">
        <option jslog="TreeItem; context: 1">1</option>
        <option jslog="TreeItem; context: 2">2</option>
      </select>`;
    renderElementIntoDOM(parent);
    const select = document.getElementById('select')!;
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    await VisualLoggingTesting.LoggingDriver.startLogging(
        {processingThrottler: throttler, clickLogThrottler: throttler});

    assert.isTrue(recordImpression.calledOnce);
    const impressions = recordImpression.firstCall.firstArg.impressions;
    assert.sameDeepMembers(impressions, [
      {id: getVeId(select), type: 1, width: 30, height: 20, context: 0},
    ]);

    recordImpression.resetHistory();

    throttle.callsArg(0);
    select.dispatchEvent(event);

    await expectCalled(recordClick);
    assert.isTrue(recordClick.calledOnce);
    assert.strictEqual(recordClick.firstCall.firstArg.veid, getVeId(select));

    await expectCalled(recordImpression);
    assert.isTrue(recordImpression.calledOnce);
    assert.sameDeepMembers(recordImpression.firstCall.firstArg.impressions, [
      {id: getVeId('option:first-child'), type: 1, parent: getVeId(select), context: 1, width: 0, height: 0},
      {id: getVeId('option:last-child'), type: 1, parent: getVeId(select), context: 2, width: 0, height: 0},
    ]);
  };

  it('logs impressions on select options on click', logsSelectOptions(new MouseEvent('click')));
  it('logs impressions on select options on space press', logsSelectOptions(new KeyboardEvent('keypress', {key: ' '})));
  it('logs impressions on select options on F4', logsSelectOptions(new KeyboardEvent('keydown', {code: 'F4'})));

  it('logs option click on select change', async () => {
    const parent = document.createElement('div') as HTMLElement;
    parent.innerHTML = `
      <select jslog="TreeItem; context: 0" id="select">
        <option jslog="TreeItem; context: 1; track: click">1</option>
        <option jslog="TreeItem; context: 2; track: click">2</option>
      </select>`;
    renderElementIntoDOM(parent);

    await VisualLoggingTesting.LoggingDriver.startLogging({clickLogThrottler: throttler});
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    const select = document.getElementById('select') as HTMLSelectElement;
    assert.exists(select);
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    await expectCalled(throttle).then(([logging]) => logging());

    assert.isTrue(recordClick.calledOnce);
    assert.deepStrictEqual(
        recordClick.firstCall.firstArg, {veid: getVeId(select.selectedOptions[0]), doubleClick: false});
  });

  it('logs keydown', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({keyboardLogThrottler: throttler});
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new KeyboardEvent('keydown', {key: 'a'}));
    element.dispatchEvent(new KeyboardEvent('keydown', {key: 'b'}));
    const [logging] = await expectCalled(throttle);
    assert.isTrue(throttle.calledTwice);
    assert.isFalse(recordKeyDown.called);

    await logging();
    assert.isTrue(recordKeyDown.calledOnce);
  });

  it('logs keydown for specific codes', async () => {
    addLoggableElements();

    const element = document.getElementById('element') as HTMLElement;
    element.setAttribute('jslog', 'TreeItem; context:42; track: keydown: KeyA|KeyB');
    await VisualLoggingTesting.LoggingDriver.startLogging({keyboardLogThrottler: throttler});
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );

    element.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyC'}));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(throttle.called);

    element.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyA'}));
    let [logging] = await expectCalled(throttle);
    assert.isFalse(recordKeyDown.called);
    await logging();
    assert.isTrue(recordKeyDown.calledOnce);

    recordKeyDown.resetHistory();

    element.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyB'}));
    [logging] = await expectCalled(throttle);
    assert.isFalse(recordKeyDown.called);
    await logging();
    assert.isTrue(recordKeyDown.calledOnce);
  });

  it('logs change', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new Event('change'));
    assert.isTrue(recordChange.calledOnce);
  });

  it('logs change for each input type', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new InputEvent('input', {inputType: 'insertText'}));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordChange.called);
    element.dispatchEvent(new InputEvent('input', {inputType: 'insertText'}));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordChange.called);

    let logging = expectCalled(recordChange);
    element.dispatchEvent(new InputEvent('input', {inputType: 'inserFromPaste'}));
    await logging;

    logging = expectCalled(recordChange);
    element.dispatchEvent(new InputEvent('input', {inputType: 'inserFromDrop'}));
    await logging;
    logging = expectCalled(recordChange);
    element.dispatchEvent(new Event('change'));
    await logging;
  });

  it('logs change on focus out after input', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new InputEvent('input', {inputType: 'insertText'}));
    element.dispatchEvent(new Event('focusout'));
    await expectCalled(recordChange);
  });

  it('logs change on new impressions', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const element = document.getElementById('element') as HTMLElement;
    const parent = document.getElementById('parent') as HTMLElement;
    element.dispatchEvent(new InputEvent('input', {inputType: 'insertText'}));
    throttle.callsArg(0);
    parent.appendChild(element.cloneNode());
    await expectCalled(recordChange);
  });

  it('logs change on resize', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new InputEvent('input', {inputType: 'insertText'}));
    throttle.callsArg(0);
    element.style.width = '400px';
    await expectCalled(recordChange);
  });

  it('does not log change on focus out without input', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new Event('focusout'));
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordChange.calledOnce);
  });

  it('logs state with change of a checkbox', async () => {
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const element = document.createElement('input');
    element.setAttribute('jslog', 'TreeItem; track: change');
    element.type = 'checkbox';
    element.checked = true;
    renderElementIntoDOM(element);
    await VisualLoggingTesting.LoggingDriver.startLogging();
    let logging = expectCall(recordChange);
    element.dispatchEvent(new Event('change'));
    let [event] = await logging;
    assert.strictEqual(event.context, 1530936795);

    element.checked = false;
    logging = expectCall(recordChange);
    element.dispatchEvent(new Event('change'));
    [event] = await logging;
    assert.strictEqual(event.context, 1936227034);
  });

  it('logs state with change of a radio', async () => {
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const element = document.createElement('input');
    element.setAttribute('jslog', 'TreeItem; track: change');
    element.type = 'radio';
    element.checked = true;
    renderElementIntoDOM(element);
    await VisualLoggingTesting.LoggingDriver.startLogging();
    let logging = expectCall(recordChange);
    element.dispatchEvent(new Event('change'));
    let [event] = await logging;
    assert.strictEqual(event.context, 1530936795);

    element.checked = false;
    logging = expectCall(recordChange);
    element.dispatchEvent(new Event('change'));
    [event] = await logging;
    assert.strictEqual(event.context, 1936227034);
  });

  it('logs hover', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({hoverLogThrottler: throttler});
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new MouseEvent('mouseover'));
    const [logging] = await expectCalled(throttle);
    assert.isFalse(recordHover.called);
    await logging();
    assert.isTrue(recordHover.calledOnce);
  });

  it('does not log hover if too short', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({hoverLogThrottler: throttler});
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new MouseEvent('mouseover'));
    await expectCalled(throttle);
    assert.isFalse(recordHover.called);
    element.dispatchEvent(new MouseEvent('mouseout'));
    await expectCalled(throttle).then(([work]) => work());
    assert.isFalse(recordHover.called);
  });

  it('does not log hover if in descendent', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({hoverLogThrottler: throttler});
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );

    const parent = document.getElementById('parent') as HTMLElement;
    const element = document.getElementById('element') as HTMLElement;
    parent.dispatchEvent(new MouseEvent('mouseover'));
    await expectCalled(throttle);

    throttle.resetHistory();
    element.dispatchEvent(new MouseEvent('mouseover'));
    await expectCalled(throttle).then(([work]) => work());
    assert.isTrue(recordHover.called);
    assert.deepStrictEqual(recordHover.firstCall.firstArg, {veid: getVeId(element)});
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
    assert.isTrue(recordDrag.called);
    assert.isTrue(recordDrag.calledOnce);
  });

  it('does not log drag if too short in time', async () => {
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

  it('logs drag if short in time but long in distance', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({dragLogThrottler: throttler});
    const recordDrag = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordDrag',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.dispatchEvent(new MouseEvent('pointerdown', {screenX: 0, screenY: 0}));

    await expectCalled(throttle);
    assert.isFalse(recordDrag.called);

    element.dispatchEvent(new MouseEvent('pointerup', {screenX: 100, screenY: 100}));

    await throttler.process?.();
    assert.isFalse(recordDrag.called);
  });

  it('logs resize', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    const element = document.getElementById('element') as HTMLElement;

    element.style.height = '400px';
    const [logging] = await expectCall(throttle, {callCount: 2});
    assert.isFalse(recordResize.called);
    await logging();
    assert.isTrue(recordResize.calledOnce);
  });

  it('does not log resize if too small', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    const element = document.getElementById('element') as HTMLElement;
    element.style.height = '301px';
    assert.isFalse(recordResize.called);
  });

  it('logs resize on visibility change', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    const element = document.getElementById('element') as HTMLElement;

    element.style.display = 'none';
    const [logging] = await expectCall(throttle, {callCount: 2});
    assert.isFalse(recordResize.called);

    logging();
    await expectCalled(recordResize);
    assert.isTrue(recordResize.calledOnce);
    assert.deepStrictEqual(recordResize.firstCall.firstArg, {veid: getVeId(element), width: 0, height: 0});

    recordResize.resetHistory();

    element.style.display = 'block';
    assert.isFalse(recordResize.called);
    throttle.callsArg(0);

    await expectCall(recordResize);
    assert.isTrue(recordResize.calledOnce);
    assert.deepStrictEqual(recordResize.firstCall.firstArg, {veid: getVeId(element), width: 300, height: 300});
  });

  it('throttles resize per element', async () => {
    addLoggableElements();
    const element1 = document.getElementById('element') as HTMLElement;
    const element2 = element1.cloneNode() as HTMLElement;
    document.getElementById('parent')?.appendChild(element2);
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    element1.style.height = '200px';
    await expectCall(throttle, {callCount: 2});
    element2.style.height = '200px';
    await expectCall(throttle, {callCount: 2});
    element1.style.height = '10px';
    await expectCall(throttle, {callCount: 2});
    element2.style.height = '10px';
    const [work] = await expectCall(throttle, {callCount: 2});

    assert.isFalse(recordResize.called);
    await work();
    assert.isTrue(recordResize.calledTwice);
    assert.strictEqual(recordResize.firstCall.firstArg.height, 10);
    assert.strictEqual(recordResize.lastCall.firstArg.height, 10);
    assert.notStrictEqual(recordResize.firstCall.firstArg.veid, recordResize.lastCall.firstArg.veid);
  });

  it('only logs resize of the outer element', async () => {
    addLoggableElements();
    const element = document.getElementById('element') as HTMLElement;
    const child = document.createElement('div');
    child.setAttribute('jslog', 'TreeItem; track: resize');
    child.style.width = '100%';
    child.style.height = '100%';
    element.appendChild(child);

    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    element.style.width = '400px';
    const [work] = await expectCall(throttle, {callCount: 2});

    assert.isFalse(recordResize.called);
    await work();
    await expectCalled(recordResize);
    assert.isTrue(recordResize.calledOnce);
    assert.deepStrictEqual(recordResize.firstCall.firstArg, {veid: getVeId(element), width: 400, height: 300});
  });

  it('does not log resize intial impressions due to visibility change', async () => {
    addLoggableElements();
    const element = document.getElementById('element') as HTMLElement;
    element.style.display = 'none';

    await VisualLoggingTesting.LoggingDriver.startLogging(
        {processingThrottler: throttler, resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );
    recordImpression.resetHistory();

    element.style.display = 'block';
    await expectCalled(throttle).then(([work]) => work());
    assert.isTrue(throttle.calledOnce);
    assert.isTrue(recordImpression.calledOnce);
    assert.isFalse(recordResize.called);

    await new Promise(resolve => setTimeout(resolve, 0));
    assert.isFalse(recordResize.called);
  });

  it('properly handles the switch between visible elements', async () => {
    addLoggableElements();
    const element1 = document.getElementById('element') as HTMLElement;
    const child = document.createElement('div');
    child.id = 'child';
    child.setAttribute('jslog', 'TreeItem; track: resize');
    child.style.width = '100%';
    child.style.height = '100%';
    element1.appendChild(child);

    const element2 = element1.cloneNode(/* deep=*/ true) as HTMLElement;
    element2.id = 'element2';
    document.getElementById('parent')?.appendChild(element2);

    // First ensure both top level elements have impressions logged
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    // Now hide one and wait for logging to finish
    throttle.callsArg(0);
    element2.style.display = 'none';
    await expectCalled(recordResize, {callCount: 1});
    throttle.reset();
    recordResize.reset();

    // Now the actual test: hiding one element and show the other one
    element1.style.display = 'none';
    element2.style.display = 'block';
    // Throttler is called by both resize and intersection observer for each element
    await expectCalled(throttle, {callCount: 4}).then(([work]) => work());

    assert.isTrue(recordResize.calledTwice);
    assert.sameDeepMembers(recordResize.getCalls().map(c => c.firstArg), [
      {veid: VisualLoggingTesting.LoggingState.getLoggingState(element1)?.veid, width: 0, height: 0},
      {veid: VisualLoggingTesting.LoggingState.getLoggingState(element2)?.veid, width: 300, height: 300},
    ]);
  });

  it('logs resize when removed from DOM', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    const element = document.getElementById('element') as HTMLElement;
    const parent = document.getElementById('parent') as HTMLElement;

    parent.removeChild(element);
    const [logging] = await expectCall(throttle, {callCount: 2});
    assert.isFalse(recordResize.called);

    await logging();
    assert.isTrue(recordResize.calledOnce);
    assert.deepStrictEqual(recordResize.firstCall.firstArg, {veid: getVeId(element), width: 0, height: 0});
  });

  it('logs click, then resize, then impressions', async () => {
    addLoggableElements();
    const processingThrottler = new Common.Throttler.Throttler(10);
    const clickLogThrottler = new Common.Throttler.Throttler(100);
    const keyboardLogThrottler = new Common.Throttler.Throttler(100);
    const resizeLogThrottler = new Common.Throttler.Throttler(100);
    await VisualLoggingTesting.LoggingDriver.startLogging({
      processingThrottler,
      clickLogThrottler,
      keyboardLogThrottler,
      resizeLogThrottler,
    });
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );
    recordImpression.resetHistory();

    const element = document.getElementById('element') as HTMLElement;
    const parent = document.getElementById('parent') as HTMLElement;

    parent.removeChild(element);
    parent.appendChild(element.cloneNode());
    element.click();

    await Promise.all([
      expectCalled(recordImpression),
      expectCalled(recordResize),
      expectCalled(recordClick),
    ]);
    assert.isTrue(recordClick.calledBefore(recordResize));
    assert.isTrue(recordResize.calledBefore(recordImpression));
  });

  it('logs keydown, then resize, then impressions', async () => {
    addLoggableElements();
    const element = document.getElementById('element') as HTMLElement;
    element.setAttribute('jslog', 'TreeItem; context:42; track: keydown: KeyA, resize');
    const keyboardLogThrottler = new Common.Throttler.Throttler(100);
    const resizeLogThrottler = new Common.Throttler.Throttler(100);
    await VisualLoggingTesting.LoggingDriver.startLogging({
      processingThrottler: throttler,
      keyboardLogThrottler,
      resizeLogThrottler,
    });
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );
    recordImpression.resetHistory();
    throttle.callsArg(0);

    const parent = document.getElementById('parent') as HTMLElement;

    parent.removeChild(element);
    parent.appendChild(element.cloneNode());
    element.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyA', key: 'a'}));

    await Promise.all([
      expectCalled(recordImpression),
      expectCalled(recordResize),
      expectCalled(recordKeyDown),
    ]);
    assert.isTrue(recordKeyDown.calledBefore(recordResize));
    assert.isTrue(recordResize.calledBefore(recordImpression));
  });

  it('logs non-DOM impressions', async () => {
    addLoggableElements();
    const loggable = {};
    const parent = document.getElementById('parent')!;
    VisualLoggingTesting.NonDomState.registerLoggable(loggable, {ve: 1, context: '123'}, parent);
    await VisualLoggingTesting.LoggingDriver.startLogging();
    assert.isTrue(recordImpression.calledOnce);

    assert.sameDeepMembers(recordImpression.firstCall.firstArg.impressions, [
      {id: getVeId(loggable), type: 1, context: 123, parent: getVeId(parent), width: 0, height: 0},
      {id: getVeId('#element'), type: 1, context: 42, parent: getVeId(parent), width: 300, height: 300},
      {id: getVeId(parent), type: 1, width: 300, height: 300},
    ]);
  });

  it('logs non-DOM impressions after parent was logged', async () => {
    addLoggableElements();
    const loggable1 = {};
    const parent = document.getElementById('parent')!;
    await VisualLoggingTesting.LoggingDriver.startLogging();
    assert.isTrue(recordImpression.calledOnce);
    VisualLoggingTesting.NonDomState.registerLoggable(loggable1, {ve: 1, context: '123'}, parent);
    recordImpression.resetHistory();
    await VisualLoggingTesting.LoggingDriver.scheduleProcessing();
    await expectCalled(recordImpression);

    assert.sameDeepMembers(recordImpression.lastCall.firstArg.impressions, [
      {id: getVeId(loggable1), type: 1, context: 123, parent: getVeId(parent), width: 0, height: 0},
    ]);
    recordImpression.resetHistory();

    const loggable2 = {};
    VisualLoggingTesting.NonDomState.registerLoggable(loggable2, {ve: 1, context: '345'}, parent);
    await VisualLoggingTesting.LoggingDriver.scheduleProcessing();
    await expectCalled(recordImpression);

    assert.sameDeepMembers(recordImpression.lastCall.firstArg.impressions, [
      {id: getVeId(loggable2), type: 1, context: 345, parent: getVeId(parent), width: 0, height: 0},
    ]);

  });

  it('logs root non-DOM impressions', async () => {
    addLoggableElements();
    const loggable = {};
    VisualLoggingTesting.NonDomState.registerLoggable(loggable, {ve: 1, context: '123'}, undefined);
    await VisualLoggingTesting.LoggingDriver.startLogging();
    assert.isTrue(recordImpression.calledOnce);

    assert.sameDeepMembers(recordImpression.firstCall.firstArg.impressions, [
      {id: getVeId(loggable), type: 1, context: 123, width: 0, height: 0},
      {id: getVeId('#element'), type: 1, context: 42, parent: getVeId('#parent'), width: 300, height: 300},
      {id: getVeId('#parent'), type: 1, width: 300, height: 300},
    ]);
    assert.isEmpty(VisualLoggingTesting.NonDomState.getNonDomLoggables());
  });

  it('postpones logging non-DOM impressions with detached parent', async () => {
    addLoggableElements();
    const loggable = {};
    const parent = document.createElement('div');
    VisualLoggingTesting.NonDomState.registerLoggable(loggable, {ve: 1, context: '123'}, parent);
    await VisualLoggingTesting.LoggingDriver.startLogging();
    assert.isTrue(recordImpression.calledOnce);

    assert.sameDeepMembers(recordImpression.firstCall.firstArg.impressions, [
      {id: getVeId('#element'), type: 1, context: 42, parent: getVeId('#parent'), width: 300, height: 300},
      {id: getVeId('#parent'), type: 1, width: 300, height: 300},
    ]);
    assert.deepInclude(
        VisualLoggingTesting.NonDomState.getNonDomLoggables(parent),
        {loggable, config: {ve: 1, context: '123'}, parent});
  });
});
