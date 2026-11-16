// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Trace from '../../../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import * as UI from '../../legacy.js';

import * as PerfUI from './perf_ui.js';

const {Milli, Micro} = Trace.Types.Timing;
const {TimelineOverviewPane} = PerfUI.TimelineOverviewPane;

class FakeOverview extends PerfUI.TimelineOverviewPane.TimelineOverviewBase {
  override update(): void {
  }
}

describe('TimelineOverviewPane', () => {
  setupLocaleHooks();

  it('renders the overview grid and scoped highlight mask', async () => {
    const pane = new TimelineOverviewPane('network');
    renderElementIntoDOM(pane, {width: 100});
    pane.overviewCalculator.setDisplayWidth(100);
    pane.setBounds(Milli(0), Milli(200));
    assert.strictEqual(pane.contentElement.id, 'network-overview-pane');

    const svg = pane.contentElement.querySelector('svg.timeline-minimap-dim-highlight-svg')!;
    assert.isTrue(svg.hasAttribute('hidden'));

    pane.highlightBounds(Trace.Helpers.Timing.traceWindowFromMilliSeconds(Milli(20), Milli(100)), true);
    await pane.updateComplete;
    assert.isFalse(svg.hasAttribute('hidden'));
    assert.exists(svg.querySelector('mask#network-dim-highlight-cutouts'));
    assert.isFalse(svg.querySelector('polygon')!.hasAttribute('hidden'));
  });

  it('dispatches OVERVIEW_PANE_MOUSE_MOVE and requests overview info on pointer move', async () => {
    UI.GlassPane.GlassPane.setContainer(document.body);
    const pane = new TimelineOverviewPane('network');
    renderElementIntoDOM(pane, {width: 100});
    pane.overviewCalculator.setDisplayWidth(100);
    pane.setBounds(Milli(0), Milli(200));

    const control = new FakeOverview();
    const infoEl = document.createElement('span');
    infoEl.textContent = 'frame info';
    const overviewInfoPromise = sinon.stub(control, 'overviewInfoPromise').resolves(infoEl);
    pane.setOverviewControls([control]);

    const cursorArea = pane.contentElement.querySelector<HTMLElement>('.overview-grid-cursor-area')!;
    const {left} = cursorArea.getBoundingClientRect();
    const onMove = sinon.stub();
    pane.addEventListener(PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_MOVE, onMove);
    cursorArea.dispatchEvent(new PointerEvent('pointermove', {clientX: left + 25}));
    await pane.updateComplete;
    sinon.assert.calledOnce(onMove);
    assert.deepEqual(onMove.firstCall.args[0].data, {timeInMicroSeconds: Micro(50_000)});
    sinon.assert.calledOnceWithExactly(overviewInfoPromise, 25);
    pane.detach();
  });
});
