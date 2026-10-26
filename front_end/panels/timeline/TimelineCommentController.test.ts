// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as CommentManager from '../../models/comment_manager/comment_manager.js';
import * as Trace from '../../models/trace/trace.js';
import {raf} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {renderWidgetInVbox, setupIgnoreListManagerEnvironment} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as Comments from '../../ui/comments/comments.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as Timeline from './timeline.js';

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  select(_selection: Timeline.TimelineSelection.TimelineSelection|null): void {
  }
  set3PCheckboxDisabled(_disabled: boolean): void {
  }
  selectEntryAtTime(_events: Trace.Types.Events.Event[]|null, _time: number): void {
  }
  zoomEvent(_event: Trace.Types.Events.Event): void {
  }
  highlightEvent(_event: Trace.Types.Events.Event|null): void {
  }
  element = document.createElement('div');
}

interface Setup {
  commentManager: CommentManager.CommentManager.CommentManager;
  flameChartView: Timeline.TimelineFlameChartView.TimelineFlameChartView;
  traceId: string;
}

async function setupFlameChartView(context: Mocha.Context): Promise<Setup> {
  const parsedTrace =
      await TraceLoader.traceEngine(context, 'web-dev-with-commit.json.gz', {withModificationsManager: true});
  const commentManager = new CommentManager.CommentManager.CommentManager();
  const flameChartView =
      new Timeline.TimelineFlameChartView.TimelineFlameChartView(new MockViewDelegate(), commentManager);
  renderWidgetInVbox(flameChartView, {width: 1500, height: 2000});
  flameChartView.setModel(parsedTrace, new Map());
  // Matches the trace ID format that TimelineCommentController stores on anchors.
  const {min, max} = parsedTrace.data.Meta.traceBounds;
  return {commentManager, flameChartView, traceId: `trace-${min}-${max}`};
}

/**
 * Returns client coordinates two pixels inside the top-left corner of the
 * entry at `entryIndex`.
 */
function clientCoordinatesForEntry(flameChart: PerfUI.FlameChart.FlameChart, entryIndex: number): {
  clientX: number,
  clientY: number,
} {
  const dims = flameChart.getEntryDimensions(entryIndex);
  assert.isNotNull(dims);
  const canvasRect = flameChart.getCanvas().getBoundingClientRect();
  return {clientX: canvasRect.left + dims.x + 2, clientY: canvasRect.top + dims.y + 2};
}

function resolverFor(canvas: HTMLCanvasElement): Comments.CommentAnchorResolver.CustomAnchorResolver {
  const resolver = Comments.CommentAnchorResolver.getCustomAnchorResolverForElement(canvas);
  assert.isNotNull(resolver);
  return resolver;
}

/**
 * Builds a timeline anchor for the main flame chart entry at `entryIndex`,
 * keyed with the entry's EventsSerializer key.
 */
function anchorForMainEntry(setup: Setup, entryIndex: number,
                            traceId = setup.traceId): CommentManager.CommentManager.CommentAnchorSignature {
  const dataProvider = setup.flameChartView.getMainDataProvider();
  const event = dataProvider.eventByIndex(entryIndex);
  assert.isOk(event);
  const traceEventKey = new Trace.EventsSerializer.EventsSerializer().keyForEvent(event);
  assert.isNotNull(traceEventKey);
  const timelineData = dataProvider.timelineData();
  assert.isOk(timelineData);
  const entryName = dataProvider.entryTitle(entryIndex) ?? '';
  const totalTime = timelineData.entryTotalTimes[entryIndex];
  return {
    vePath: 'Panel: timeline > FlameChart: main',
    textSignature: entryName,
    timeline: {
      traceId,
      traceEventKey,
      entryName,
      startTimeMicro:
          Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(timelineData.entryStartTimes[entryIndex])),
      durationMicro: totalTime > 0 ? Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(totalTime)) : undefined,
      chartLocation: 'main',
    },
  };
}

/**
 * Builds a timeline anchor with the start time and title of the main flame
 * chart entry at `entryIndex`, and a synthetic key that encodes
 * `encodedIndex`.
 */
function syntheticAnchorForMainEntry(setup: Setup, entryIndex: number,
                                     encodedIndex: number): CommentManager.CommentManager.CommentAnchorSignature {
  const anchor = anchorForMainEntry(setup, entryIndex);
  assert.isOk(anchor.timeline);
  return {...anchor, timeline: {...anchor.timeline, traceEventKey: `fc-main-${encodedIndex}`}};
}

function commentPins(flameChartView: Timeline.TimelineFlameChartView.TimelineFlameChartView):
    Trace.Types.Overlays.CommentPin[] {
  return flameChartView.overlays().overlaysOfType<Trace.Types.Overlays.CommentPin>('COMMENT_PIN');
}

describe('TimelineCommentController', function() {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let movedListener: sinon.SinonSpy;

  beforeEach(() => {
    const universe = new TestUniverse();
    UI.ZoomManager.ZoomManager.instance({
      forceNew: true,
      win: window,
      frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
    });
    sinon.stub(Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding, 'instance')
        .returns(universe.debuggerWorkspaceBinding);
    sinon.stub(Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding, 'instance').returns(universe.cssWorkspaceBinding);
    setupIgnoreListManagerEnvironment();
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
    movedListener = sinon.spy();
    Comments.CommentAnchorResolver.addCustomAnchorsMovedListener(movedListener);
  });

  afterEach(() => {
    // The browser autofocuses the flame chart canvas, which scrolls <body> (the
    // scroll container in tests). Reset it while the test container is still
    // in the DOM; otherwise the offset leaks into later screenshot tests.
    document.body.scrollTop = 0;
    Comments.CommentAnchorResolver.removeCustomAnchorsMovedListener(movedListener);
    Comments.CommentAnchorResolver.clearCustomAnchorResolversForTest();
    Common.Settings.Settings.instance()
        .createSetting<PerfUI.FlameChart.PersistedGroupConfig[]|null>('timeline-persisted-main-flamechart-track-config',
                                                                      null)
        .set(null);
    Common.Settings.Settings.instance()
        .createSetting<PerfUI.FlameChart.PersistedGroupConfig[]|null>(
            'timeline-persisted-network-flamechart-track-config', null)
        .set(null);
    UI.ZoomManager.ZoomManager.removeInstance();
  });

  describe('anchor resolution', () => {
    it('uses one anchor resolver for the main and network flame chart canvases', async function() {
      const {flameChartView} = await setupFlameChartView(this);

      const mainResolver = resolverFor(flameChartView.getMainFlameChart().getCanvas());
      const networkResolver = resolverFor(flameChartView.getNetworkFlameChart().getCanvas());

      assert.strictEqual(mainResolver, networkResolver);
    });

    it('resolves a timeline anchor for an entry on the main flame chart', async function() {
      const {flameChartView, traceId} = await setupFlameChartView(this);
      const flameChart = flameChartView.getMainFlameChart();
      const dataProvider = flameChartView.getMainDataProvider();
      const canvas = flameChart.getCanvas();
      const event = dataProvider.eventByIndex(0);
      assert.isOk(event);
      const traceEventKey = new Trace.EventsSerializer.EventsSerializer().keyForEvent(event);
      assert.isNotNull(traceEventKey);
      const timelineData = dataProvider.timelineData();
      assert.isOk(timelineData);

      const result = resolverFor(canvas).resolve(canvas, clientCoordinatesForEntry(flameChart, 0));

      assert.isNotNull(result);
      assert.deepEqual(result.anchor.timeline, {
        traceId,
        traceEventKey,
        entryName: dataProvider.entryTitle(0) ?? '',
        startTimeMicro: Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(timelineData.entryStartTimes[0])),
        durationMicro: Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(timelineData.entryTotalTimes[0])),
        chartLocation: 'main',
      });
      assert.strictEqual(result.anchor.vePath, VisualLogging.getVePath(canvas));
      assert.strictEqual(result.anchorElement, canvas);
      assert.isTrue(result.highlightRect?.visible);
    });

    it('adds the entry\'s event name and track to the agent context', async function() {
      const {flameChartView} = await setupFlameChartView(this);
      const flameChart = flameChartView.getMainFlameChart();
      const canvas = flameChart.getCanvas();

      // Entry 0 is a frame in the Frames track. The data provider's
      // groupForEvent() does not know that track, so this also checks that the
      // track name comes from the flame chart groups.
      const result = resolverFor(canvas).resolve(canvas, clientCoordinatesForEntry(flameChart, 0));

      assert.isNotNull(result);
      const {agentContext} = result.anchor;
      assert.isOk(agentContext);
      assert.include(agentContext, 'Trace event: frame');
      assert.include(agentContext, 'Track: Frames');
    });

    it('resolves a timeline anchor for an entry on the network flame chart', async function() {
      const {flameChartView} = await setupFlameChartView(this);
      const flameChart = flameChartView.getNetworkFlameChart();
      // The network track is collapsed by default, which leaves its entries off screen.
      flameChart.toggleGroupExpand(0);
      await raf();
      const canvas = flameChart.getCanvas();

      const result = resolverFor(canvas).resolve(canvas, clientCoordinatesForEntry(flameChart, 0));

      assert.isNotNull(result);
      assert.strictEqual(result.anchor.timeline?.chartLocation, 'network');
      assert.strictEqual(result.anchor.timeline?.entryName, flameChartView.getNetworkDataProvider().entryTitle(0));
      assert.strictEqual(result.anchorElement, canvas);
    });

    it('returns only the highlight rect when resolving for hover', async function() {
      const {flameChartView} = await setupFlameChartView(this);
      const flameChart = flameChartView.getMainFlameChart();
      const canvas = flameChart.getCanvas();
      const coordinates = clientCoordinatesForEntry(flameChart, 0);

      const hoverResult = resolverFor(canvas).resolve(canvas, {...coordinates, forHover: true});
      const clickResult = resolverFor(canvas).resolve(canvas, coordinates);

      assert.isNotNull(hoverResult);
      assert.isNotNull(clickResult);
      assert.isUndefined(hoverResult.anchor.timeline);
      assert.deepEqual(hoverResult.highlightRect, clickResult.highlightRect);
    });

    it('does not resolve an anchor for screenshot entries', async function() {
      const {flameChartView} = await setupFlameChartView(this);
      const flameChart = flameChartView.getMainFlameChart();
      const dataProvider = flameChartView.getMainDataProvider();
      const timelineData = dataProvider.timelineData();
      assert.isOk(timelineData);
      // Screenshot entries have an empty title and are nested under the Frames
      // group, which is collapsed by default.
      flameChart.toggleGroupExpand(0);
      await raf();
      const screenshotIndex = Array.from({length: timelineData.entryStartTimes.length}, (_, i) => i).find(i => {
        return dataProvider.entryTitle(i) === '' && flameChart.getEntryDimensions(i)?.visible === true;
      });
      assert.isDefined(screenshotIndex);
      assert.isNull(dataProvider.eventByIndex(screenshotIndex));
      const canvas = flameChart.getCanvas();
      const coordinates = clientCoordinatesForEntry(flameChart, screenshotIndex);
      // Confirms the coordinates hit the screenshot entry, so a null result is
      // caused by the missing event rather than a miss.
      const canvasRect = canvas.getBoundingClientRect();
      assert.strictEqual(flameChart.coordinatesToEntryIndex(coordinates.clientX - canvasRect.left,
                                                            coordinates.clientY - canvasRect.top),
                         screenshotIndex);

      assert.isNull(resolverFor(canvas).resolve(canvas, coordinates));
      assert.isNull(resolverFor(canvas).resolve(canvas, {...coordinates, forHover: true}));
    });

    it('does not resolve an anchor for empty canvas space', async function() {
      const {flameChartView} = await setupFlameChartView(this);
      const flameChart = flameChartView.getMainFlameChart();
      const canvas = flameChart.getCanvas();
      const canvasRect = canvas.getBoundingClientRect();
      const offsetX = 1;
      const offsetY = canvasRect.height - 2;
      // Confirms the coordinates hit no entry.
      assert.strictEqual(flameChart.coordinatesToEntryIndex(offsetX, offsetY), -1);

      assert.isNull(
          resolverFor(canvas).resolve(canvas, {clientX: canvasRect.left + offsetX, clientY: canvasRect.top + offsetY}));
    });

    it('resolves a synthetic key for entries that EventsSerializer cannot key', async function() {
      const {flameChartView} = await setupFlameChartView(this);
      const flameChart = flameChartView.getMainFlameChart();
      const canvas = flameChart.getCanvas();
      sinon.stub(Trace.EventsSerializer.EventsSerializer.prototype, 'keyForEvent').returns(null);

      const result = resolverFor(canvas).resolve(canvas, clientCoordinatesForEntry(flameChart, 0));

      assert.isNotNull(result);
      assert.strictEqual(result.anchor.timeline?.traceEventKey, 'fc-main-0');
    });
  });

  describe('COMMENT_PIN overlays', () => {
    it('adds a COMMENT_PIN overlay for the entry of a new thread', async function() {
      const setup = await setupFlameChartView(this);

      setup.commentManager.createCommentThread(anchorForMainEntry(setup, 0), 'Comment');

      const pins = commentPins(setup.flameChartView);
      assert.lengthOf(pins, 1);
      assert.strictEqual(pins[0].entry, setup.flameChartView.getMainDataProvider().eventByIndex(0));
    });

    it('removes the COMMENT_PIN overlay when its thread is removed', async function() {
      const setup = await setupFlameChartView(this);
      const thread = setup.commentManager.createCommentThread(anchorForMainEntry(setup, 0), 'Comment');
      assert.lengthOf(commentPins(setup.flameChartView), 1);

      setup.commentManager.removeCommentThread(thread.id);

      assert.isEmpty(commentPins(setup.flameChartView));
    });

    it('does not add COMMENT_PIN overlays for generated comments', async function() {
      const setup = await setupFlameChartView(this);

      setup.commentManager.createCommentThread(anchorForMainEntry(setup, 0), 'Generated', 'AGENT', true);

      assert.isEmpty(commentPins(setup.flameChartView));
    });

    it('does not add COMMENT_PIN overlays for threads from a different trace', async function() {
      const setup = await setupFlameChartView(this);

      setup.commentManager.createCommentThread(anchorForMainEntry(setup, 0, 'trace-different-bounds'), 'Comment');

      assert.isEmpty(commentPins(setup.flameChartView));
    });

    it('returns the COMMENT_PIN element as the anchor element for a thread', async function() {
      const setup = await setupFlameChartView(this);
      const thread = setup.commentManager.createCommentThread(anchorForMainEntry(setup, 0), 'Comment');
      const [pin] = commentPins(setup.flameChartView);
      assert.isOk(pin);

      const anchorElement = Comments.CommentAnchorResolver.getCustomAnchorElement(thread.anchor);

      assert.isNotNull(anchorElement);
      assert.strictEqual(anchorElement, setup.flameChartView.overlays().elementForOverlay(pin));
    });

    it('returns no anchor element for an entry without a thread', async function() {
      const setup = await setupFlameChartView(this);
      setup.commentManager.createCommentThread(anchorForMainEntry(setup, 0), 'Comment');
      assert.lengthOf(commentPins(setup.flameChartView), 1);

      assert.isNull(Comments.CommentAnchorResolver.getCustomAnchorElement(anchorForMainEntry(setup, 1)));
    });

    it('adds a COMMENT_PIN overlay for a thread with a synthetic key', async function() {
      const setup = await setupFlameChartView(this);
      const flameChart = setup.flameChartView.getMainFlameChart();
      const canvas = flameChart.getCanvas();
      sinon.stub(Trace.EventsSerializer.EventsSerializer.prototype, 'keyForEvent').returns(null);
      const result = resolverFor(canvas).resolve(canvas, clientCoordinatesForEntry(flameChart, 0));
      assert.isNotNull(result);

      setup.commentManager.createCommentThread(result.anchor, 'Comment');

      const pins = commentPins(setup.flameChartView);
      assert.lengthOf(pins, 1);
      assert.strictEqual(pins[0].entry, setup.flameChartView.getMainDataProvider().eventByIndex(0));
    });

    it('finds the entry by start time and title when the synthetic key index is stale', async function() {
      const setup = await setupFlameChartView(this);
      const dataProvider = setup.flameChartView.getMainDataProvider();
      // Confirms the encoded entry does not match, so the pin can only come
      // from the scan.
      assert.notStrictEqual(dataProvider.entryTitle(0), dataProvider.entryTitle(5));

      setup.commentManager.createCommentThread(syntheticAnchorForMainEntry(setup, 5, 0), 'Comment');

      const pins = commentPins(setup.flameChartView);
      assert.lengthOf(pins, 1);
      assert.strictEqual(pins[0].entry, dataProvider.eventByIndex(5));
    });

    it('does not add a COMMENT_PIN overlay when no entry matches a synthetic key', async function() {
      const setup = await setupFlameChartView(this);
      const anchor = syntheticAnchorForMainEntry(setup, 0, 0);
      assert.isOk(anchor.timeline);

      setup.commentManager.createCommentThread(
          {...anchor, timeline: {...anchor.timeline, entryName: 'Not an entry title'}}, 'Comment');

      assert.isEmpty(commentPins(setup.flameChartView));
    });

    it('does not add a COMMENT_PIN overlay when only the duration differs from a synthetic key', async function() {
      const setup = await setupFlameChartView(this);
      const anchor = syntheticAnchorForMainEntry(setup, 0, 0);
      assert.isOk(anchor.timeline);
      assert.isDefined(anchor.timeline.durationMicro);

      setup.commentManager.createCommentThread(
          {...anchor, timeline: {...anchor.timeline, durationMicro: anchor.timeline.durationMicro + 1}}, 'Comment');

      assert.isEmpty(commentPins(setup.flameChartView));
    });

    it('adds the COMMENT_PIN overlay for a synthetic key when its hidden entry is shown again', async function() {
      const setup = await setupFlameChartView(this);
      const dataProvider = setup.flameChartView.getMainDataProvider();
      const timelineData = dataProvider.timelineData();
      const entryIndexes = Array.from({length: timelineData.entryStartTimes.length}, (_, i) => i);
      const parentIndex = entryIndexes.find(i => {
        return dataProvider.findPossibleContextMenuActions(i)?.[PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION];
      });
      assert.isDefined(parentIndex);
      const parentStart = timelineData.entryStartTimes[parentIndex];
      const parentEnd = parentStart + timelineData.entryTotalTimes[parentIndex];
      const childIndex = entryIndexes.find(i => {
        return timelineData.entryLevels[i] === timelineData.entryLevels[parentIndex] + 1 &&
            timelineData.entryStartTimes[i] >= parentStart && timelineData.entryStartTimes[i] < parentEnd;
      });
      assert.isDefined(childIndex);
      const parentEvent = dataProvider.eventByIndex(parentIndex);
      const childEvent = dataProvider.eventByIndex(childIndex);
      assert.isOk(parentEvent);
      assert.isOk(childEvent);
      const anchor = syntheticAnchorForMainEntry(setup, childIndex, childIndex);

      dataProvider.modifyTree(PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION, parentIndex);
      setup.commentManager.createCommentThread(anchor, 'Comment');
      assert.isEmpty(commentPins(setup.flameChartView));

      const parentIndexAfterCollapse = dataProvider.indexForEvent(parentEvent);
      assert.isNotNull(parentIndexAfterCollapse);
      dataProvider.modifyTree(PerfUI.FlameChart.FilterAction.RESET_CHILDREN, parentIndexAfterCollapse);

      const pins = commentPins(setup.flameChartView);
      assert.lengthOf(pins, 1);
      assert.strictEqual(pins[0].entry, childEvent);
    });
  });

  describe('moved notifications', () => {
    it('notifies after Overlays updates only while COMMENT_PIN overlays exist', async function() {
      const setup = await setupFlameChartView(this);
      const overlays = setup.flameChartView.overlays();
      movedListener.resetHistory();

      void overlays.update();
      sinon.assert.notCalled(movedListener);

      const thread = setup.commentManager.createCommentThread(anchorForMainEntry(setup, 0), 'Comment');
      movedListener.resetHistory();
      void overlays.update();
      sinon.assert.calledOnce(movedListener);

      // Removing the last COMMENT_PIN overlay sends one more notification so
      // the shared overlay removes its pin.
      movedListener.resetHistory();
      setup.commentManager.removeCommentThread(thread.id);
      sinon.assert.calledOnce(movedListener);

      movedListener.resetHistory();
      void overlays.update();
      sinon.assert.notCalled(movedListener);
    });

    it('notifies once after COMMENT_PIN overlays that survived hiding are reset', async function() {
      const setup = await setupFlameChartView(this);
      const overlays = setup.flameChartView.overlays();
      setup.commentManager.createCommentThread(anchorForMainEntry(setup, 0), 'Comment');
      const parent = setup.flameChartView.element.parentElement;
      assert.isOk(parent);
      setup.flameChartView.detach();
      // Showing the view again keeps the existing COMMENT_PIN overlay, so the
      // controller makes no overlay changes.
      setup.flameChartView.show(parent);
      assert.lengthOf(commentPins(setup.flameChartView), 1);
      movedListener.resetHistory();

      // Loading a new trace resets Overlays, which removes the COMMENT_PIN
      // overlay without the controller removing it.
      overlays.reset();
      void overlays.update();

      sinon.assert.calledOnce(movedListener);
    });

    it('unregisters the resolver, stops syncing and notifies when hidden', async function() {
      const setup = await setupFlameChartView(this);
      const canvas = setup.flameChartView.getMainFlameChart().getCanvas();
      movedListener.resetHistory();

      setup.flameChartView.detach();

      sinon.assert.calledOnce(movedListener);
      assert.isNull(Comments.CommentAnchorResolver.getCustomAnchorResolverForElement(canvas));
      setup.commentManager.createCommentThread(anchorForMainEntry(setup, 0), 'Comment added while hidden');
      assert.isEmpty(commentPins(setup.flameChartView));
    });
  });
});
