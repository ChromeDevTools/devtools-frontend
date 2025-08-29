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
    const parent = document.createElement('div');
    parent.id = 'parent';
    parent.setAttribute('jslog', 'TreeItem; track: hover');
    parent.style.width = '300px';
    parent.style.height = '300px';
    const element = document.createElement('div');
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
    sinon.assert.calledOnce(recordImpression);
    assert.sameDeepMembers(recordImpression.firstCall.firstArg.impressions, [
      {id: getVeId('#element'), type: 1, context: 42, parent: getVeId('#parent'), width: 300, height: 300},
      {id: getVeId('#parent'), type: 1, width: 300, height: 300},
    ]);
  });

  async function assertImpressionRecordedDeferred() {
    const [work] = await expectCalled(throttle);
    sinon.assert.notCalled(recordImpression);

    await work();
    sinon.assert.called(recordImpression);
  }

  it('does not log impressions when document hidden', async () => {
    addLoggableElements();
    sinon.stub(document, 'hidden').value(true);
    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    sinon.assert.notCalled(recordImpression);
  });

  it('does not log impressions when parent hidden', async () => {
    addLoggableElements();
    const parent = document.getElementById('parent')!;
    parent.style.height = '0';
    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    sinon.assert.notCalled(recordImpression);
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
    const parent = document.getElementById('parent')!;
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
    const parent = document.createElement('div');
    renderElementIntoDOM(parent);
    const shadow = parent.attachShadow({mode: 'open'});
    const shadowContent = document.createElement('div');
    shadow.appendChild(shadowContent);

    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    shadowContent.innerHTML = '<div jslog="TreeItem" style="width:300px;height:300px"></div>';
    await assertImpressionRecordedDeferred();
  });

  it('does not log impressions for content in closed details element but does when opened', async () => {
    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});

    const details = document.createElement('details');
    details.style.width = '100px';
    details.style.height = '100px';
    details.innerHTML = '<div id="details-content" jslog="TreeItem" style="width: 100px; height: 100px;"></div>';
    renderElementIntoDOM(details);

    let [work] = await expectCalled(throttle);
    await work();
    // This will fail with the bug, as an impression will be recorded.
    sinon.assert.notCalled(recordImpression);

    throttle.resetHistory();
    recordImpression.resetHistory();

    details.open = true;
    // Opening details will trigger mutation observer.
    [work] = await expectCalled(throttle);
    await work();
    sinon.assert.calledOnce(recordImpression);
    assert.sameDeepMembers(recordImpression.firstCall.firstArg.impressions, [{
                             id: getVeId('#details-content'),
                             type: 1,
                             width: 100,
                             height: 100,
                           }]);
  });

  it('logs impressions on mutation in additional document', async () => {
    const iframe = document.createElement('iframe');
    renderElementIntoDOM(iframe);

    await VisualLoggingTesting.LoggingDriver.startLogging({processingThrottler: throttler});
    const iframeDocument = iframe.contentDocument;
    assert.exists(iframeDocument);
    await VisualLoggingTesting.LoggingDriver.addDocument(iframeDocument);
    iframeDocument.body.innerHTML = '<div jslog="TreeItem" style="width:300px;height:300px"></div>';
    await assertImpressionRecordedDeferred();
  });

  it('correctly determines visibility in additional document', async () => {
    const iframe = document.createElement('iframe');
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
    sinon.assert.notCalled(recordImpression);
  });

  it('hashes a string context', async () => {
    const element = document.createElement('div');
    element.setAttribute('jslog', 'TreeItem; track: hover; context: foobar');
    element.style.width = '300px';
    element.style.height = '300px';
    renderElementIntoDOM(element);

    await VisualLoggingTesting.LoggingDriver.startLogging();
    sinon.assert.calledOnce(recordImpression);
    assert.strictEqual(recordImpression.firstCall.firstArg.impressions[0]?.context, -103332984);
  });

  it('logs clicks', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    const element = document.getElementById('element')!;
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

    const element = document.getElementById('element')!;
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

    const element = document.getElementById('element')!;
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

    const parent = document.getElementById('parent')!;
    parent.click();

    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.notCalled(recordClick);
  });

  it('does not log click on double click', async () => {
    addLoggableElements();
    const element = document.getElementById('element')!;
    element.setAttribute('jslog', 'TreeItem; context:42; track: click, dblclick');
    await VisualLoggingTesting.LoggingDriver.startLogging({clickLogThrottler: throttler});
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    element.dispatchEvent(new MouseEvent('click'));
    element.dispatchEvent(new MouseEvent('dblclick'));
    const [logging] = await expectCalled(throttle);
    sinon.assert.calledTwice(throttle);
    sinon.assert.notCalled(recordClick);

    await logging();
    sinon.assert.calledOnce(recordClick);
    assert.isTrue(recordClick.firstCall.firstArg.doubleClick);
  });

  it('does not log click on parent when clicked on child', async () => {
    addLoggableElements();
    const parent = document.getElementById('parent')!;
    parent.setAttribute('jslog', 'TreeItem; track: click');
    await VisualLoggingTesting.LoggingDriver.startLogging({clickLogThrottler: throttler});
    const recordClick = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordClick',
    );

    const element = document.getElementById('element')!;
    element.click();
    const [logging] = await expectCalled(throttle);
    sinon.assert.notCalled(recordClick);

    await logging();
    sinon.assert.calledOnce(recordClick);
    assert.strictEqual(recordClick.firstCall.firstArg.veid, getVeId(element));
  });

  const logsSelectOptions = (event: Event) => async () => {
    const parent = document.createElement('div');
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

    sinon.assert.calledOnce(recordImpression);
    const impressions = recordImpression.firstCall.firstArg.impressions;
    assert.sameDeepMembers(impressions, [
      {id: getVeId(select), type: 1, width: 30, height: 20, context: 0},
    ]);

    recordImpression.resetHistory();

    throttle.callsArg(0);
    select.dispatchEvent(event);

    await expectCalled(recordClick);
    sinon.assert.calledOnce(recordClick);
    assert.strictEqual(recordClick.firstCall.firstArg.veid, getVeId(select));

    await expectCalled(recordImpression);
    sinon.assert.calledOnce(recordImpression);
    assert.sameDeepMembers(recordImpression.firstCall.firstArg.impressions, [
      {id: getVeId('option:first-child'), type: 1, parent: getVeId(select), context: 1, width: 0, height: 0},
      {id: getVeId('option:last-child'), type: 1, parent: getVeId(select), context: 2, width: 0, height: 0},
    ]);
  };

  it('logs impressions on select options on click', logsSelectOptions(new MouseEvent('click')));
  it('logs impressions on select options on space press', logsSelectOptions(new KeyboardEvent('keypress', {key: ' '})));
  it('logs impressions on select options on F4', logsSelectOptions(new KeyboardEvent('keydown', {code: 'F4'})));

  it('logs option click on select change', async () => {
    const parent = document.createElement('div');
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

    sinon.assert.calledOnce(recordClick);
    assert.deepEqual(recordClick.firstCall.firstArg, {veid: getVeId(select.selectedOptions[0]), doubleClick: false});
  });

  it('logs keydown', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({keyboardLogThrottler: throttler});
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );

    const element = document.getElementById('element')!;
    element.dispatchEvent(new KeyboardEvent('keydown', {key: 'a'}));
    element.dispatchEvent(new KeyboardEvent('keydown', {key: 'b'}));
    const [logging] = await expectCalled(throttle);
    sinon.assert.calledTwice(throttle);
    sinon.assert.notCalled(recordKeyDown);

    await logging();
    sinon.assert.calledOnce(recordKeyDown);
  });

  it('logs keydown for specific codes', async () => {
    addLoggableElements();

    const element = document.getElementById('element')!;
    element.setAttribute('jslog', 'TreeItem; context:42; track: keydown: KeyA|KeyB');
    await VisualLoggingTesting.LoggingDriver.startLogging({keyboardLogThrottler: throttler});
    const recordKeyDown = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordKeyDown',
    );

    element.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyC'}));
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.notCalled(throttle);

    element.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyA'}));
    let [logging] = await expectCalled(throttle);
    sinon.assert.notCalled(recordKeyDown);
    await logging();
    sinon.assert.calledOnce(recordKeyDown);

    recordKeyDown.resetHistory();

    element.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyB'}));
    [logging] = await expectCalled(throttle);
    sinon.assert.notCalled(recordKeyDown);
    await logging();
    sinon.assert.calledOnce(recordKeyDown);
  });

  it('logs change', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const element = document.getElementById('element')!;
    element.dispatchEvent(new Event('change'));
    sinon.assert.calledOnce(recordChange);
  });

  it('logs change for each input type', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging();
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const element = document.getElementById('element')!;
    element.dispatchEvent(new InputEvent('input', {inputType: 'insertText'}));
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.notCalled(recordChange);
    element.dispatchEvent(new InputEvent('input', {inputType: 'insertText'}));
    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.notCalled(recordChange);

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

    const element = document.getElementById('element')!;
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

    const element = document.getElementById('element')!;
    const parent = document.getElementById('parent')!;
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

    const element = document.getElementById('element')!;
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

    const element = document.getElementById('element')!;
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

  it('logs state with change of a label`s control', async () => {
    const recordChange = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordChange',
    );

    const label = document.createElement('label');
    label.setAttribute('jslog', 'TreeItem; track: change');
    const input = document.createElement('input');
    input.type = 'radio';
    input.checked = true;
    input.style.display = 'none';
    label.appendChild(input);
    renderElementIntoDOM(label);
    await VisualLoggingTesting.LoggingDriver.startLogging();
    let logging = expectCall(recordChange);
    input.dispatchEvent(new Event('change'));
    let [event] = await logging;
    assert.strictEqual(event.context, 1530936795);

    input.checked = false;
    logging = expectCall(recordChange);
    input.dispatchEvent(new Event('change'));
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

    const element = document.getElementById('element')!;
    element.dispatchEvent(new MouseEvent('mouseover'));
    const [logging] = await expectCalled(throttle);
    sinon.assert.notCalled(recordHover);
    await logging();
    sinon.assert.calledOnce(recordHover);
  });

  it('does not log hover if too short', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({hoverLogThrottler: throttler});
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );

    const element = document.getElementById('element')!;
    element.dispatchEvent(new MouseEvent('mouseover'));
    await expectCalled(throttle);
    sinon.assert.notCalled(recordHover);
    element.dispatchEvent(new MouseEvent('mouseout'));
    await expectCalled(throttle).then(([work]) => work());
    sinon.assert.notCalled(recordHover);
  });

  it('does not log hover if in descendent', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({hoverLogThrottler: throttler});
    const recordHover = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordHover',
    );

    const parent = document.getElementById('parent')!;
    const element = document.getElementById('element')!;
    parent.dispatchEvent(new MouseEvent('mouseover'));
    await expectCalled(throttle);

    throttle.resetHistory();
    element.dispatchEvent(new MouseEvent('mouseover'));
    await expectCalled(throttle).then(([work]) => work());
    sinon.assert.called(recordHover);
    assert.deepEqual(recordHover.firstCall.firstArg, {veid: getVeId(element)});
  });

  it('logs drag', async () => {
    const dragLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({dragLogThrottler});
    const recordDrag = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordDrag',
    );

    const element = document.getElementById('element')!;
    element.dispatchEvent(new MouseEvent('pointerdown'));
    assert.exists(dragLogThrottler.process);
    sinon.assert.notCalled(recordDrag);

    await dragLogThrottler.process?.();
    sinon.assert.called(recordDrag);
    sinon.assert.calledOnce(recordDrag);
  });

  it('does not log drag if too short in time', async () => {
    const dragLogThrottler = new Common.Throttler.Throttler(1000000000);
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({dragLogThrottler});
    const recordDrag = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordDrag',
    );

    const element = document.getElementById('element')!;
    element.dispatchEvent(new MouseEvent('pointerdown'));
    assert.exists(dragLogThrottler.process);
    sinon.assert.notCalled(recordDrag);

    element.dispatchEvent(new MouseEvent('pointerup'));

    await dragLogThrottler.process?.();
    sinon.assert.notCalled(recordDrag);
  });

  it('logs drag if short in time but long in distance', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({dragLogThrottler: throttler});
    const recordDrag = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordDrag',
    );

    const element = document.getElementById('element')!;
    element.dispatchEvent(new MouseEvent('pointerdown', {screenX: 0, screenY: 0}));

    await expectCalled(throttle);
    sinon.assert.notCalled(recordDrag);

    element.dispatchEvent(new MouseEvent('pointerup', {screenX: 100, screenY: 100}));

    await throttler.process?.();
    sinon.assert.notCalled(recordDrag);
  });

  it('logs resize', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    const element = document.getElementById('element')!;

    element.style.height = '400px';
    const [logging] = await expectCall(throttle, {callCount: 2});
    sinon.assert.notCalled(recordResize);
    await logging();
    sinon.assert.calledOnce(recordResize);
  });

  it('does not log resize if too small', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    const element = document.getElementById('element')!;
    element.style.height = '301px';
    sinon.assert.notCalled(recordResize);
  });

  it('logs resize on visibility change', async () => {
    addLoggableElements();
    await VisualLoggingTesting.LoggingDriver.startLogging({resizeLogThrottler: throttler});
    const recordResize = sinon.stub(
        Host.InspectorFrontendHost.InspectorFrontendHostInstance,
        'recordResize',
    );

    const element = document.getElementById('element')!;

    element.style.display = 'none';
    const [logging] = await expectCall(throttle, {callCount: 2});
    sinon.assert.notCalled(recordResize);

    logging();
    await expectCalled(recordResize);
    sinon.assert.calledOnce(recordResize);
    assert.deepEqual(recordResize.firstCall.firstArg, {veid: getVeId(element), width: 0, height: 0});

    recordResize.resetHistory();

    element.style.display = 'block';
    sinon.assert.notCalled(recordResize);
    throttle.callsArg(0);

    await expectCall(recordResize);
    sinon.assert.calledOnce(recordResize);
    assert.deepEqual(recordResize.firstCall.firstArg, {veid: getVeId(element), width: 300, height: 300});
  });

  it('throttles resize per element', async () => {
    addLoggableElements();
    const element1 = document.getElementById('element')!;
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

    sinon.assert.notCalled(recordResize);
    await work();
    sinon.assert.calledTwice(recordResize);
    assert.strictEqual(recordResize.firstCall.firstArg.height, 10);
    assert.strictEqual(recordResize.lastCall.firstArg.height, 10);
    assert.notStrictEqual(recordResize.firstCall.firstArg.veid, recordResize.lastCall.firstArg.veid);
  });

  it('only logs resize of the outer element', async () => {
    addLoggableElements();
    const element = document.getElementById('element')!;
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

    sinon.assert.notCalled(recordResize);
    await work();
    await expectCalled(recordResize);
    sinon.assert.calledOnce(recordResize);
    assert.deepEqual(recordResize.firstCall.firstArg, {veid: getVeId(element), width: 400, height: 300});
  });

  it('does not log resize intial impressions due to visibility change', async () => {
    addLoggableElements();
    const element = document.getElementById('element')!;
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
    sinon.assert.calledOnce(throttle);
    sinon.assert.calledOnce(recordImpression);
    sinon.assert.notCalled(recordResize);

    await new Promise(resolve => setTimeout(resolve, 0));
    sinon.assert.notCalled(recordResize);
  });

  it('properly handles the switch between visible elements', async () => {
    addLoggableElements();
    const element1 = document.getElementById('element')!;
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

    sinon.assert.calledTwice(recordResize);
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

    const element = document.getElementById('element')!;
    const parent = document.getElementById('parent')!;

    parent.removeChild(element);
    const [logging] = await expectCall(throttle, {callCount: 2});
    sinon.assert.notCalled(recordResize);

    await logging();
    sinon.assert.calledOnce(recordResize);
    assert.deepEqual(recordResize.firstCall.firstArg, {veid: getVeId(element), width: 0, height: 0});
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

    const element = document.getElementById('element')!;
    const parent = document.getElementById('parent')!;

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
    const element = document.getElementById('element')!;
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

    const parent = document.getElementById('parent')!;

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
    sinon.assert.calledOnce(recordImpression);

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
    sinon.assert.calledOnce(recordImpression);
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
    sinon.assert.calledOnce(recordImpression);

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
    sinon.assert.calledOnce(recordImpression);

    assert.sameDeepMembers(recordImpression.firstCall.firstArg.impressions, [
      {id: getVeId('#element'), type: 1, context: 42, parent: getVeId('#parent'), width: 300, height: 300},
      {id: getVeId('#parent'), type: 1, width: 300, height: 300},
    ]);
    assert.deepInclude(
        VisualLoggingTesting.NonDomState.getNonDomLoggables(parent),
        {loggable, config: {ve: 1, context: '123'}, parent, size: undefined});
  });
});
