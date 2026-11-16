// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Trace from '../../../../models/trace/trace.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';
import * as UI from '../../legacy.js';

import * as PerfUI from './perf_ui.js';

const {Milli, Micro} = Trace.Types.Timing;
const {TimelineOverviewPane, DEFAULT_VIEW, OverviewInfo} = PerfUI.TimelineOverviewPane;
type ViewInput = PerfUI.TimelineOverviewPane.ViewInput;
type ViewOutput = PerfUI.TimelineOverviewPane.ViewOutput;

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

  it('dispatches OVERVIEW_PANE_MOUSE_MOVE when moving pointer over the cursor area', async () => {
    const pane = new TimelineOverviewPane('network');
    renderElementIntoDOM(pane, {width: 100});
    pane.overviewCalculator.setDisplayWidth(100);
    pane.setBounds(Milli(0), Milli(200));

    const cursorArea = pane.contentElement.querySelector<HTMLElement>('.overview-grid-cursor-area')!;
    const {left} = cursorArea.getBoundingClientRect();
    const onMove = sinon.stub();
    pane.addEventListener(PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_MOVE, onMove);
    cursorArea.dispatchEvent(new PointerEvent('pointermove', {clientX: left + 25}));
    await pane.updateComplete;
    sinon.assert.calledOnce(onMove);
    assert.deepEqual(onMove.firstCall.args[0].data, {timeInMicroSeconds: Micro(50_000)});
  });

  describe('presenter', () => {
    function createPane(output?: ViewOutput) {
      const view = createViewFunctionStub(TimelineOverviewPane, output);
      const pane = new TimelineOverviewPane('timeline', view);
      pane.contentElement.appendChild(view.input.overviewGrid.element);
      renderElementIntoDOM(pane, {width: 100});
      pane.overviewCalculator.setDisplayWidth(100);
      pane.setBounds(Milli(0), Milli(200));
      return {view, pane};
    }

    it('renders synchronously on construction with the provided prefix', () => {
      const view = createViewFunctionStub(TimelineOverviewPane);
      void new TimelineOverviewPane('network', view);
      sinon.assert.calledOnce(view);
      assert.deepInclude(view.input, {prefix: 'network', cursorVisible: false, highlight: null});
    });

    it('defaults element host to timeline prefix when instantiated with an element', () => {
      const elView = createViewFunctionStub(TimelineOverviewPane);
      const el = document.createElement('div');
      assert.strictEqual(new TimelineOverviewPane(el, elView).element, el);
      assert.strictEqual(elView.input.prefix, 'timeline');
    });

    it('shows cursor, dispatches time under cursor, projects overview info elements, and hides on leave', async () => {
      UI.GlassPane.GlassPane.setContainer(document.body);
      const {view, pane} = createPane({cursorAnchorBox: () => new AnchorBox(10, 10, 1, 20)});
      const control = new FakeOverview();
      const infoEl = document.createElement('span');
      infoEl.textContent = 'frame info';
      const infoStub = sinon.stub(control, 'overviewInfoPromise').resolves(infoEl);
      pane.setOverviewControls([control]);
      const onMove = sinon.stub(), onLeave = sinon.stub();
      pane.addEventListener(PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_MOVE, onMove);
      pane.addEventListener(PerfUI.TimelineOverviewPane.Events.OVERVIEW_PANE_MOUSE_LEAVE, onLeave);
      view.input.onCursorMove(25);
      const moved = await view.nextInput;
      assert.deepInclude(moved, {cursorVisible: true, cursorPosition: 25, overviewInfoElements: [infoEl]});
      assert.deepEqual(onMove.firstCall.args[0].data, {timeInMicroSeconds: Micro(50_000)});
      sinon.assert.calledOnceWithExactly(infoStub, 25);
      view.input.onCursorLeave();
      const left = await view.nextInput;
      assert.isFalse(left.cursorVisible);
      assert.deepEqual(left.overviewInfoElements, []);
      sinon.assert.calledOnce(onLeave);
      pane.detach();
    });

    it('does not project overview info that resolves after cursor leaves', async () => {
      const {view, pane} = createPane();
      const control = new FakeOverview();
      const {promise, resolve} = Promise.withResolvers<Element|null>();
      sinon.stub(control, 'overviewInfoPromise').returns(promise);
      pane.setOverviewControls([control]);

      view.input.onCursorMove(25);
      await view.nextInput;
      view.input.onCursorLeave();
      await view.nextInput;

      const lateEl = document.createElement('span');
      resolve(lateEl);
      await promise;
      assert.deepEqual(view.input.overviewInfoElements, []);
    });

    it('projects highlighted bounds to view input and dims markers outside range', async () => {
      const {view, pane} = createPane();
      const inside = document.createElement('div'), outside = document.createElement('div');
      pane.setMarkers(new Map([[50, inside], [150, outside]]));
      pane.highlightBounds(Trace.Helpers.Timing.traceWindowFromMilliSeconds(Milli(20), Milli(100)), true);
      assert.deepEqual((await view.nextInput).highlight, {left: 10, right: 50, withBracket: true});
      assert.strictEqual(inside.style.filter, 'grayscale(0)');
      assert.strictEqual(outside.style.filter, 'grayscale(1)');
      pane.clearBoundsHighlight();
      assert.isNull((await view.nextInput).highlight);
      assert.strictEqual(outside.style.filter, 'grayscale(0)');
    });
  });

  describe('view', () => {
    function renderView(overrides: Partial<ViewInput> = {}) {
      const overviewGrid = new PerfUI.OverviewGrid.OverviewGrid('network');
      const overviewInfo = new OverviewInfo();
      const input: ViewInput = {
        prefix: 'network',
        overviewGrid,
        overviewInfo,
        overviewInfoElements: [],
        cursorPosition: 0,
        cursorVisible: false,
        highlight: null,
        highlightBackgroundColor: 'rgb(255, 255, 255)',
        highlightBracketColor: 'rgb(0, 0, 255)',
        onPointerDown: sinon.stub(),
        onPointerUp: sinon.stub(),
        onCursorMove: sinon.stub(),
        onCursorLeave: sinon.stub(),
        ...overrides,
      };
      const output: ViewOutput = {};
      const target = renderElementIntoDOM(document.createElement('div'), {allowMultipleChildren: true});
      DEFAULT_VIEW(input, output, target);
      return {input, output, target, gridEl: overviewGrid.element, infoRoot: overviewInfo.contentRoot};
    }

    it('renders overview grid, cursor state, overview info, and prefix-scoped highlight SVG', () => {
      const infoEl = document.createElement('span');
      infoEl.textContent = 'frame info';
      const {target, gridEl, infoRoot, output} = renderView({
        cursorPosition: 42,
        cursorVisible: true,
        overviewInfoElements: [infoEl],
        highlight: {left: 10, right: 50, withBracket: true},
      });
      assert.strictEqual(target.id, 'network-overview-pane');
      assert.strictEqual(target.firstElementChild, gridEl);
      const cursor = gridEl.querySelector<HTMLElement>(':scope > .overview-grid-cursor-position')!;
      assert.strictEqual(cursor.style.left, '42px');
      assert.strictEqual(cursor.style.visibility, 'visible');
      assert.isFunction(output.cursorAreaLeft);
      assert.isFunction(output.cursorAnchorBox);
      const infoContainer = infoRoot.querySelector('.overview-info');
      assert.instanceOf(infoContainer, HTMLElement);
      assert.strictEqual(infoContainer.textContent, 'frame info');
      const svg = target.querySelector('svg.timeline-minimap-dim-highlight-svg')!;
      assert.isFalse(svg.hasAttribute('hidden'));
      assert.strictEqual(svg.querySelector('rect.background')?.getAttribute('mask'),
                         'url(#network-dim-highlight-cutouts)');
      assert.strictEqual(svg.querySelector('polygon')?.getAttribute('points'), '10,0 10,5 14,1 44,1 50,5 50,0');
      assert.isTrue(renderView({
                      highlight: {left: 10, right: 50, withBracket: false},
                    }).target.querySelector('polygon')!.hasAttribute('hidden'));
      assert.isTrue(renderView({
                      highlight: null,
                    }).target.querySelector('svg.timeline-minimap-dim-highlight-svg')!.hasAttribute('hidden'));
    });

    it('captures pointer and forwards cursor area events', () => {
      const onPointerDown = sinon.stub(), onPointerUp = sinon.stub();
      const onCursorMove = sinon.stub<[number], void>(), onCursorLeave = sinon.stub();
      const {gridEl} = renderView({onPointerDown, onPointerUp, onCursorMove, onCursorLeave});
      const area = gridEl.querySelector<HTMLElement>(':scope > .overview-grid-cursor-area')!;
      const capture = sinon.stub(area, 'setPointerCapture');
      sinon.stub(area, 'hasPointerCapture').withArgs(3).returns(true);
      const release = sinon.stub(area, 'releasePointerCapture');
      area.dispatchEvent(new PointerEvent('pointerdown', {pointerId: 3}));
      sinon.assert.calledOnceWithExactly(capture, 3);
      sinon.assert.calledOnce(onPointerDown);
      const {left} = area.getBoundingClientRect();
      area.dispatchEvent(new PointerEvent('pointermove', {clientX: left + 25}));
      assert.closeTo(onCursorMove.firstCall.args[0], 25, 1);
      area.dispatchEvent(new PointerEvent('pointerup', {pointerId: 3}));
      sinon.assert.calledOnceWithExactly(release, 3);
      sinon.assert.calledOnce(onPointerUp);
      area.dispatchEvent(new PointerEvent('pointerleave'));
      sinon.assert.calledOnce(onCursorLeave);
    });
  });
});
