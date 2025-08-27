// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import {assertScreenshot, dispatchClickEvent, doubleRaf, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {
  allThreadEntriesInTrace,
  microsecondsTraceWindow,
  renderWidgetInVbox,
  setupIgnoreListManagerEnvironment
} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';
import * as Utils from './utils/utils.js';

const {urlString} = Platform.DevToolsPath;

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  selection: Timeline.TimelineSelection.TimelineSelection|null = null;
  select(selection: Timeline.TimelineSelection.TimelineSelection|null): void {
    this.selection = selection;
  }
  set3PCheckboxDisabled(_disabled: boolean): void {
  }
  selectEntryAtTime(_events: Trace.Types.Events.Event[]|null, _time: number): void {
  }
  highlightEvent(_event: Trace.Types.Events.Event|null): void {
  }
  element = document.createElement('div');
}

function clearPersistTrackConfigSettings() {
  const mainGroupSetting =
      Common.Settings.Settings.instance().createSetting<PerfUI.FlameChart.PersistedGroupConfig[]|null>(
          'timeline-persisted-main-flamechart-track-config', null);
  const networkGroupSetting =
      Common.Settings.Settings.instance().createSetting<PerfUI.FlameChart.PersistedGroupConfig[]|null>(
          'timeline-persisted-network-flamechart-track-config', null);

  // In case they already existed and need clearing out.
  mainGroupSetting.set(null);
  networkGroupSetting.set(null);
}

describeWithEnvironment('TimelineFlameChartView', function() {
  before(() => {
    // In case any previous test suite set this.
    clearPersistTrackConfigSettings();
  });

  beforeEach(() => {
    setupIgnoreListManagerEnvironment();
    const actionRegistryInstance = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry: actionRegistryInstance});
  });

  afterEach(() => {
    // Avoid any group expansion state leaking across tests.
    clearPersistTrackConfigSettings();
  });

  describe('rendering', () => {
    beforeEach(() => {
      // We persist collapsed/expanded states across sessions, but we want to
      // make sure each test here does not impact others.
      Common.Settings.Settings.instance().createSetting('timeline-flamechart-network-view-group-expansion', {}).set({});
    });

    it('renders the network and other tracks in collapsed and expanded modes', async function() {
      const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const mockViewDelegate = new MockViewDelegate();

      const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      flameChartView.updateCountersGraphToggle(false);  // don't care about the memory view in this test
      renderWidgetInVbox(flameChartView);
      // IMPORTANT: order is important; for the flame chart view to render properly
      // it must be in the DOM before we set the model, so it can calculate and
      // set heights.
      flameChartView.setModel(parsedTrace, metadata);

      // Most of the network content is in the first ~700ms of this trace
      const {min} = parsedTrace.Meta.traceBounds;
      const interestingRange = Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(700));
      const max = Trace.Types.Timing.Micro(min + interestingRange);
      const newBounds = microsecondsTraceWindow(min, max);
      TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(newBounds);
      await raf();

      await assertScreenshot('timeline/flamechart_view_network_collapsed.png');
      flameChartView.getNetworkFlameChart().toggleGroupExpand(0);
      await raf();
      await assertScreenshot('timeline/flamechart_view_network_expanded.png');
    });

    it('does not show the network track when there is no network request', async function() {
      const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'slow-interaction-keydown.json.gz');
      const mockViewDelegate = new MockViewDelegate();
      const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      flameChartView.updateCountersGraphToggle(false);
      renderWidgetInVbox(flameChartView);
      flameChartView.setModel(parsedTrace, metadata);
      await assertScreenshot('timeline/flamechart_view_no_network_events.png');
    });

    it('shows the details for a selected network event', async function() {
      const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const mockViewDelegate = new MockViewDelegate();

      const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
      searchableView.setMinimumSize(0, 100);
      searchableView.hideWidget();
      flameChartView.setSearchableView(searchableView);
      flameChartView.updateCountersGraphToggle(false);  // don't care about the memory view in this test
      renderWidgetInVbox(searchableView);
      // IMPORTANT: order is important; for the flame chart view to render properly
      // it must be in the DOM before we set the model, so it can calculate and
      // set heights.
      flameChartView.show(searchableView.element);
      flameChartView.setModel(parsedTrace, metadata);
      flameChartView.getNetworkFlameChart().toggleGroupExpand(0);

      // Most of the network content is in the first ~700ms of this trace
      const {min} = parsedTrace.Meta.traceBounds;
      const interestingRange = Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(700));
      const max = Trace.Types.Timing.Micro(min + interestingRange);
      const newBounds = microsecondsTraceWindow(min, max);
      TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(newBounds);
      await raf();

      const networkRequest = parsedTrace.NetworkRequests.byTime.find(req => {
        return req.args.data.url === 'https://web.dev/js/app.js?v=fedf5fbe';
      });
      assert.isOk(networkRequest);
      const selection = Timeline.TimelineSelection.selectionFromEvent(networkRequest);
      flameChartView.setSelectionAndReveal(selection);
      await raf();
      await assertScreenshot('timeline/timeline_with_network_selection.png');
    });

    it('shows the details for a selected main thread event', async function() {
      const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const mockViewDelegate = new MockViewDelegate();

      const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
      searchableView.setMinimumSize(0, 100);
      searchableView.hideWidget();
      flameChartView.setSearchableView(searchableView);
      flameChartView.updateCountersGraphToggle(false);  // don't care about the memory view in this test
      renderWidgetInVbox(searchableView);
      // IMPORTANT: order is important; for the flame chart view to render properly
      // it must be in the DOM before we set the model, so it can calculate and
      // set heights.
      flameChartView.show(searchableView.element);
      flameChartView.setModel(parsedTrace, metadata);
      flameChartView.getNetworkFlameChart().toggleGroupExpand(0);

      // Most of the network content is in the first ~700ms of this trace
      const {min} = parsedTrace.Meta.traceBounds;
      const interestingRange = Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(700));
      const max = Trace.Types.Timing.Micro(min + interestingRange);
      const newBounds = microsecondsTraceWindow(min, max);
      TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(newBounds);
      await raf();

      // No particular reason to pick this event; it's just an event in the
      // main thread within the time bounds.
      const event = allThreadEntriesInTrace(parsedTrace).find(event => {
        return Trace.Types.Events.isTimerFire(event) && event.ts === 122411157276;
      });
      assert.isOk(event);
      const selection = Timeline.TimelineSelection.selectionFromEvent(event);
      flameChartView.setSelectionAndReveal(selection);
      await raf();
      await assertScreenshot('timeline/timeline_with_main_thread_selection.png');
    });
  });

  it('knows if the current trace has got hidden tracks', async function() {
    const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const mockViewDelegate = new MockViewDelegate();
    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    renderElementIntoDOM(flameChartView);
    flameChartView.setModel(parsedTrace, metadata);

    assert.isFalse(flameChartView.hasHiddenTracks());
    // Ensure it is true when something in the main flame chart is hidden
    flameChartView.getMainFlameChart().hideGroup(0);
    assert.isTrue(flameChartView.hasHiddenTracks());
    flameChartView.getMainFlameChart().showGroup(0);
    assert.isFalse(flameChartView.hasHiddenTracks());
    // Ensure it is true when something in the network chart is hidden
    // (users cannot technically achieve this via the UI, but in case they can
    // in the future let's explicitly check!)
    flameChartView.getNetworkFlameChart().hideGroup(0);
    assert.isTrue(flameChartView.hasHiddenTracks());
  });

  it('can gather the visual track config to store as metadata', async function() {
    const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const mockViewDelegate = new MockViewDelegate();
    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    renderElementIntoDOM(flameChartView);
    flameChartView.setModel(parsedTrace, metadata);

    const mainChart = flameChartView.getMainFlameChart();
    mainChart.hideGroup(0);
    // Can't do group one as that is the screenshots, which are nested under
    // "Frames", so we pick Group 2 (which is animations).
    mainChart.moveGroupDown(2);

    const networkChart = flameChartView.getNetworkFlameChart();
    networkChart.toggleGroupExpand(0);

    const visualMetadata = flameChartView.getPersistedConfigMetadata();

    assert.deepEqual(
        visualMetadata.network,
        [{expanded: true, hidden: false, originalIndex: 0, visualIndex: 0, trackName: 'Network'}]);

    assert.deepEqual(visualMetadata.main, [
      {expanded: false, hidden: true, originalIndex: 0, visualIndex: 0, trackName: 'Frames'}, {
        expanded: false,
        hidden: false,
        originalIndex: 1,
        visualIndex: 1,
        // screenshots but it has no visible title
        trackName: ''
      },
      {expanded: false, hidden: false, originalIndex: 2, visualIndex: 3, trackName: 'Animations'},
      {expanded: true, hidden: false, originalIndex: 3, visualIndex: 2, trackName: 'Main — https://web.dev/'}, {
        expanded: false,
        hidden: false,
        originalIndex: 4,
        visualIndex: 4,
        trackName:
            'Frame — https://shared-storage-demo-content-producer.web.app/paa/scripts/private-aggregation-test.html'
      },
      {expanded: false, hidden: false, originalIndex: 5, visualIndex: 5, trackName: 'Thread pool'},
      {expanded: false, hidden: false, originalIndex: 6, visualIndex: 6, trackName: 'Thread pool worker 1'},
      {expanded: false, hidden: false, originalIndex: 7, visualIndex: 7, trackName: 'Thread pool worker 2'},
      {expanded: false, hidden: false, originalIndex: 8, visualIndex: 8, trackName: 'Thread pool worker 3'},
      {expanded: false, hidden: false, originalIndex: 9, visualIndex: 9, trackName: 'Thread pool worker 4'},
      {expanded: false, hidden: false, originalIndex: 10, visualIndex: 10, trackName: 'Thread pool worker 5'},
      {expanded: false, hidden: false, originalIndex: 11, visualIndex: 11, trackName: 'StackSamplingProfiler'},
      {expanded: false, hidden: false, originalIndex: 12, visualIndex: 12, trackName: 'GPU'}
    ]);
  });

  it('does not apply visual config from a file', async function() {
    const {parsedTrace, metadata: originalMetadata} =
        await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

    const FROM_FILE_VISUAL_CONFIG_NETWORK: Trace.Types.File.TrackVisualConfig[] =
        [{expanded: true, hidden: false, originalIndex: 0, visualIndex: 0, trackName: 'Network'}];

    // Populate the in-memory setting to pretend the user has already modified
    // this trace's visual config.
    // Importantly for this test, this is a different setting to FAKE_VISUAL_CONFIG_NETWORK above.
    const networkGroupSetting =
        Common.Settings.Settings.instance().createSetting<PerfUI.FlameChart.PersistedGroupConfig[]|null>(
            'timeline-persisted-network-flamechart-track-config', null);
    const USER_VISUAL_CONFIG_NETWORK =
        {hidden: true, expanded: true, originalIndex: 0, visualIndex: 0, trackName: 'Network'};
    networkGroupSetting.set([USER_VISUAL_CONFIG_NETWORK]);

    // Now add network configuration to the metadata that we get from the trace file itself.
    const metadata: Trace.Types.File.MetaData = {
      ...originalMetadata,
      visualTrackConfig: {
        main: null,
        network: FROM_FILE_VISUAL_CONFIG_NETWORK,
      }
    };
    const mockViewDelegate = new MockViewDelegate();
    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(parsedTrace, metadata);

    const metadataInSetting = flameChartView.getPersistedConfigMetadata();
    assert.deepEqual(metadataInSetting, {main: null, network: [USER_VISUAL_CONFIG_NETWORK]});
  });

  it('creates an entry label annotation when the data provider sends an entry label annotation created event',
     async function() {
       const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-modifications.json.gz');
       const mockViewDelegate = new MockViewDelegate();

       const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
       flameChartView.setModel(parsedTrace, metadata);
       const modifications = Timeline.ModificationsManager.ModificationsManager.activeManager();
       assert.exists(modifications);
       const stub = sinon.stub(modifications, 'createAnnotation');

       flameChartView.getMainDataProvider().dispatchEventToListeners(
           Timeline.TimelineFlameChartDataProvider.Events.ENTRY_LABEL_ANNOTATION_ADDED,
           {entryIndex: 0, withLinkCreationButton: false});
       sinon.assert.calledOnce(stub);
     });

  it('fires an event when an entry label overlay is clicked', async function() {
    const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-modifications.json.gz');
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
    searchableView.setMinimumSize(0, 100);
    searchableView.hideWidget();
    flameChartView.setSearchableView(searchableView);
    flameChartView.updateCountersGraphToggle(false);  // don't care about the memory view in this test
    renderWidgetInVbox(searchableView);
    // IMPORTANT: order is important; for the flame chart view to render properly
    // it must be in the DOM before we set the model, so it can calculate and
    // set heights.
    flameChartView.show(searchableView.element);
    flameChartView.setModel(parsedTrace, metadata);
    const modifications = Timeline.ModificationsManager.ModificationsManager.activeManager();
    assert.isOk(modifications);
    const labelAnnotation = modifications.getAnnotations().find(a => a.type === 'ENTRY_LABEL');
    assert.isOk(labelAnnotation);
    // This creates an active annotation in the UI and creates the overlay.
    const overlay = modifications.createAnnotation(labelAnnotation, {
      loadedFromFile: false,
      muteAriaNotifications: false,
    });
    flameChartView.addOverlay(overlay);
    await raf();
    const overlayElement = flameChartView.overlays().elementForOverlay(overlay);
    assert.isOk(overlayElement);
    const labelAnnotationClickedStub = sinon.stub();
    flameChartView.addEventListener(Timeline.TimelineFlameChartView.Events.ENTRY_LABEL_ANNOTATION_CLICKED, event => {
      labelAnnotationClickedStub(event.data.entry);
    });
    dispatchClickEvent(overlayElement);
    sinon.assert.calledOnceWithExactly(labelAnnotationClickedStub, labelAnnotation.entry);
  });

  describe('groupForLevel', () => {
    const {groupForLevel} = Timeline.TimelineFlameChartView;

    it('finds the right group for the given level', async () => {
      const groups: PerfUI.FlameChart.Group[] = [
        {
          name: 'group-1' as Common.UIString.LocalizedString,
          startLevel: 0,
          style: {} as PerfUI.FlameChart.GroupStyle,
        },
        {
          name: 'group-2' as Common.UIString.LocalizedString,
          startLevel: 10,
          style: {} as PerfUI.FlameChart.GroupStyle,
        },
        {
          name: 'group-3' as Common.UIString.LocalizedString,
          startLevel: 12,
          style: {} as PerfUI.FlameChart.GroupStyle,
        },
      ];

      assert.strictEqual(groupForLevel(groups, 1), groups[0]);
      assert.strictEqual(groupForLevel(groups, 10), groups[1]);
      assert.strictEqual(groupForLevel(groups, 11), groups[1]);
      assert.strictEqual(groupForLevel(groups, 12), groups[2]);
      assert.strictEqual(groupForLevel(groups, 999), groups[2]);
    });
  });

  it('Can search for events by name in the timeline', async function() {
    const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
    flameChartView.setSearchableView(searchableView);
    flameChartView.setModel(parsedTrace, metadata);

    const searchQuery = 'Paint';
    const searchConfig =
        new UI.SearchableView.SearchConfig(/* query */ searchQuery, /* caseSensitive */ false, /* isRegex */ false);
    flameChartView.performSearch(searchConfig, true);

    assert.strictEqual(flameChartView.getSearchResults()?.length, 14);
    assertSelectionName('PrePaint');

    flameChartView.jumpToNextSearchResult();
    assertSelectionName('Paint');

    flameChartView.jumpToNextSearchResult();
    assertSelectionName('Paint');

    flameChartView.jumpToPreviousSearchResult();
    assertSelectionName('Paint');
    flameChartView.jumpToPreviousSearchResult();
    assertSelectionName('PrePaint');

    function assertSelectionName(name: string) {
      const selection = mockViewDelegate.selection;
      if (!selection || !Timeline.TimelineSelection.selectionIsEvent(selection)) {
        throw new Error('Selection is not present or not a Trace Event');
      }
      assert.strictEqual(selection.event.name, name);
    }
    flameChartView.detach();
  });

  it('can search across both flame charts for events', async function() {
    const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
    flameChartView.setSearchableView(searchableView);
    flameChartView.setModel(parsedTrace, metadata);

    const searchQuery = 'app.js';
    const searchConfig =
        new UI.SearchableView.SearchConfig(/* query */ searchQuery, /* caseSensitive */ false, /* isRegex */ false);
    flameChartView.performSearch(searchConfig, true);

    const results = flameChartView.getSearchResults();
    assert.isOk(results);
    assert.lengthOf(results, 9);
    assert.lengthOf(results.filter(r => r.provider === 'main'), 8);
    assert.lengthOf(results.filter(r => r.provider === 'network'), 1);
    flameChartView.detach();
  });

  it('Adds Hidden Descendants Arrow as a decoration when a Context Menu action is applied on a node', async function() {
    const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(parsedTrace, metadata);

    // Find the main track to later collapse entries of
    const mainTrack = flameChartView.getMainFlameChart().timelineData()?.groups.find(group => {
      return group.name === 'Main — http://localhost:8080/';
    });
    if (!mainTrack) {
      throw new Error('Could not find main track');
    }

    // Find the first node that has children to collapse and is visible in the timeline
    const nodeOfGroup = flameChartView.getMainDataProvider().groupTreeEvents(mainTrack);
    const firstNodeWithChildren = nodeOfGroup?.find(node => {
      const childrenAmount = parsedTrace.Renderer.entryToNode.get(node)?.children.length;
      if (!childrenAmount) {
        return false;
      }
      return childrenAmount > 0 && node.cat === 'devtools.timeline';
    });
    const node = parsedTrace.Renderer.entryToNode.get(firstNodeWithChildren as Trace.Types.Events.Event);
    if (!node) {
      throw new Error('Could not find a visible node with children');
    }

    // Apply COLLAPSE_FUNCTION action to the node. This action will hide all the children of the passed node and add HIDDEN_DESCENDANTS_ARROW decoration to it.
    flameChartView.getMainFlameChart().modifyTree(PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION, node?.id);

    const decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
    assert.deepEqual(decorationsForEntry, [
      {
        type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW,
      },
    ]);
    flameChartView.detach();
  });

  it('Adds Hidden Descendants Arrow as a decoration when a Context Menu action is applied on a selected node with a key shortcut event',
     async function() {
       const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
       const mockViewDelegate = new MockViewDelegate();

       const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
       flameChartView.setModel(parsedTrace, metadata);

       // Find the main track to later collapse entries of
       const mainTrack = flameChartView.getMainFlameChart().timelineData()?.groups.find(group => {
         return group.name === 'Main — http://localhost:8080/';
       });
       if (!mainTrack) {
         throw new Error('Could not find main track');
       }

       // Find the first node that has children to collapse and is visible in the timeline
       const groupTreeEvents = flameChartView.getMainDataProvider().groupTreeEvents(mainTrack);
       const firstEventWithChildren = groupTreeEvents?.find(node => {
         const childrenAmount = parsedTrace.Renderer.entryToNode.get(node)?.children.length;
         if (!childrenAmount) {
           return false;
         }
         return childrenAmount > 0 && node.cat === 'devtools.timeline';
       });
       assert.exists(firstEventWithChildren);

       const nodeId = flameChartView.getMainDataProvider().indexForEvent(firstEventWithChildren);
       assert.exists(nodeId);

       flameChartView.getMainFlameChart().setSelectedEntry(nodeId);

       // Dispatch a shortcut keydown event that applies 'Hide Children' Context menu action
       const event = new KeyboardEvent('keydown', {code: 'KeyC'});
       flameChartView.getMainFlameChart().getCanvas().dispatchEvent(event);

       const decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[nodeId];
       assert.deepEqual(decorationsForEntry, [
         {
           type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW,
         },
       ]);
       flameChartView.detach();
     });

  it('Removes Hidden Descendants Arrow as a decoration when Reset Children action is applied on a node',
     async function() {
       const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
       const mockViewDelegate = new MockViewDelegate();

       const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
       flameChartView.setModel(parsedTrace, metadata);
       Timeline.ModificationsManager.ModificationsManager.activeManager();

       // Find the main track to later collapse entries of
       let mainTrack = flameChartView.getMainFlameChart().timelineData()?.groups.find(group => {
         return group.name === 'Main — http://localhost:8080/';
       });
       if (!mainTrack) {
         throw new Error('Could not find main track');
       }

       // Find the first node that has children to collapse and is visible in the timeline
       const nodeOfGroup = flameChartView.getMainDataProvider().groupTreeEvents(mainTrack);
       const firstNodeWithChildren = nodeOfGroup?.find(node => {
         const childrenAmount = parsedTrace.Renderer.entryToNode.get(node)?.children.length;
         if (!childrenAmount) {
           return false;
         }
         return childrenAmount > 0 && node.cat === 'devtools.timeline';
       });
       const node = parsedTrace.Renderer.entryToNode.get(firstNodeWithChildren as Trace.Types.Events.Event);
       if (!node) {
         throw new Error('Could not find a visible node with children');
       }

       // Apply COLLAPSE_FUNCTION Context Menu action to the node.
       // This action will hide all the children of the passed node and add HIDDEN_DESCENDANTS_ARROW decoration to it.
       flameChartView.getMainFlameChart().modifyTree(PerfUI.FlameChart.FilterAction.COLLAPSE_FUNCTION, node?.id);

       let decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
       assert.deepEqual(decorationsForEntry, [
         {
           type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW,
         },
       ]);

       mainTrack = flameChartView.getMainFlameChart().timelineData()?.groups.find(group => {
         return group.name === 'Main — http://localhost:8080/';
       });
       if (!mainTrack) {
         throw new Error('Could not find main track');
       }
       // Apply a RESET_CHILDREN action that will reveal all of the hidden children of the passed node and remove HIDDEN_DESCENDANTS_ARROW decoration from it.
       flameChartView.getMainFlameChart().modifyTree(PerfUI.FlameChart.FilterAction.RESET_CHILDREN, node?.id);

       // No decorations should exist on the node
       decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
       assert.isUndefined(decorationsForEntry);
       flameChartView.detach();
     });

  it('renders metrics as marker overlays w/ tooltips', async function() {
    const {parsedTrace, metadata, insights} = await TraceLoader.traceEngine(this, 'crux.json.gz');
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setInsights(insights, new Map());
    flameChartView.setModel(parsedTrace, metadata);

    const tooltips =
        [...flameChartView.element.querySelectorAll('.overlay-type-TIMINGS_MARKER .marker-title')].map(el => {
          el?.dispatchEvent(new MouseEvent('mousemove', {
            clientX: 0,
            clientY: 0,
          }));
          return flameChartView.element.querySelector('.timeline-entry-tooltip-element')
              ?.textContent?.replaceAll('\xa0', ' ');
        });

    assert.deepEqual(tooltips, [
      '0 μsNav',
      '43.98 msL',
      '75.90 msFCP - Local939.00 msFCP - Field (URL)',
      '75.90 msLCP - Local936.00 msLCP - Field (URL)',
      '43.75 msDCL',
    ]);
    flameChartView.detach();
  });

  describe('Context Menu', function() {
    let flameChartView: Timeline.TimelineFlameChartView.TimelineFlameChartView;
    let parsedTrace: Trace.Handlers.Types.ParsedTrace;
    let metadata: Trace.Types.File.MetaData|null;
    const flameChartContainer = document.createElement('div');

    this.beforeEach(async () => {
      ({parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'recursive-blocking-js.json.gz'));
      const mockViewDelegate = new MockViewDelegate();

      flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      // If we run these tests with animations disabled, they hide some flakes
      // where the animations are not correctly cancelled when the component is
      // destroyed.
      flameChartView.forceAnimationsForTest();
      flameChartView.setModel(parsedTrace, metadata);
      flameChartView.markAsRoot();
      // IMPORTANT: we show the widget within the div, but the div is never
      // added to the DOM.
      // Adding the div to the DOM means that the tests below become flakey as
      // they rely on X/Y coordinates and assume a top left point of (0, 0); if
      // we mount the component to the DOM and another test mounts a component
      // and doesn't tidy it up, the flamechart can end up not at (0, 0) and
      // that breaks the context menu tests.
      flameChartView.show(flameChartContainer);

      Timeline.ModificationsManager.ModificationsManager.activeManager();
      sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    });

    this.afterEach(() => {
      flameChartView.detach();
    });

    it('Does not create customized Context Menu for network track', async function() {
      // The mouse event passed to the Context Menu is used to indicate where the menu should appear. Since we don't
      // need it to actually appear for this test, pass an event with coordinates that is not in the track header.
      flameChartView.getNetworkFlameChart().onContextMenu(new MouseEvent('contextmenu', {clientX: 100, clientY: 100}));
      assert.isUndefined(flameChartView.getNetworkFlameChart().getContextMenu());
    });

    it('Does not create Context Menu for Network track header', async function() {
      // So for the first track header, its x will start from beginning.
      // And its y will start after the ruler (ruler's height is 17).
      flameChartView.getNetworkFlameChart().onContextMenu(new MouseEvent('contextmenu', {clientX: 0, clientY: 17}));
      assert.isUndefined(flameChartView.getNetworkFlameChart().getContextMenu());
    });

    it('Create correct Context Menu for track headers in main flame chart', async function() {
      // So for the first track header, its x will start from beginning.
      // And its y will start after the ruler (ruler's height is 17).
      flameChartView.getMainFlameChart().onContextMenu(new MouseEvent('contextmenu', {clientX: 0, clientY: 17}));

      assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 1);
      assert.strictEqual(
          flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(0)?.buildDescriptor().label,
          'Configure tracks');
    });

    describe('Context Menu Actions For Thread tracks', function() {
      this.beforeEach(async () => {
        // Find the Main track to later collapse entries of
        const mainTrack = flameChartView.getMainFlameChart().timelineData()?.groups.find(group => {
          return group.name === 'Main — http://127.0.0.1:8080/';
        });
        if (!mainTrack) {
          throw new Error('Could not find main track');
        }
      });

      function getMainThread(data: Trace.Handlers.ModelHandlers.Renderer.RendererHandlerData):
          Trace.Handlers.ModelHandlers.Renderer.RendererThread {
        let mainThread: Trace.Handlers.ModelHandlers.Renderer.RendererThread|null = null;
        for (const [, process] of data.processes) {
          for (const [, thread] of process.threads) {
            if (thread.name === 'CrRendererMain') {
              mainThread = thread;
              break;
            }
          }
        }
        if (!mainThread) {
          throw new Error('Could not find main thread.');
        }
        return mainThread;
      }

      function findFirstEntry(
          allEntries: readonly Trace.Types.Events.Event[],
          predicate: (entry: Trace.Types.Events.Event) => boolean): Trace.Types.Events.Event {
        const entry = allEntries.find(entry => predicate(entry));
        if (!entry) {
          throw new Error('Could not find expected entry.');
        }
        return entry;
      }

      function generateContextMenuForNodeId(nodeId: number): void {
        // Highlight the node to make the Context Menu dispatch on this node
        flameChartView.getMainFlameChart().highlightEntry(nodeId);

        const eventCoordinates = flameChartView.getMainFlameChart().entryIndexToCoordinates(nodeId);
        if (!eventCoordinates) {
          throw new Error('Coordinates were not found');
        }

        // The mouse event passed to the Context Menu is used to indicate where the menu should appear. So just simply
        // use the pixels of top left corner of the event.
        flameChartView.getMainFlameChart().onContextMenu(
            new MouseEvent('contextmenu', {clientX: eventCoordinates.x, clientY: eventCoordinates.y}));
      }

      function generateContextMenuForNode(node: Trace.Types.Events.Event): void {
        const nodeId = flameChartView.getMainDataProvider().indexForEvent(node);
        assert.isNotNull(nodeId);
        generateContextMenuForNodeId(nodeId);
      }

      it('When an entry has no children, correctly make only Hide Entry enabled in the Context Menu action',
         async function() {
           /**
            * Part of this stack looks roughly like so (with some events omitted):
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * == now ==      == updateCounters ==  <-- ID=245
            *
            * In this test we want to test that the Context Menu option available
            * for an entry with no children and a parent is to hide given entry only.
            * Since there are no children to hide, we don't want to show 'hide children' option.
            *
            * To achieve that, we will dispatch the context menu on the 'updateCounters' function that does not have
            * children.
            * The ID of 'updateCounters' is 245.
            **/

           const nodeIdWithNoChildren = 245;
           generateContextMenuForNodeId(nodeIdWithNoChildren);

           assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 5);
           // Hide function enabled
           assert.isTrue(flameChartView.getMainFlameChart()
                             .getContextMenu()
                             ?.defaultSection()
                             .items.at(0)
                             ?.buildDescriptor()
                             .enabled);
           // Rest of the actions disabled
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(1)
                              ?.buildDescriptor()
                              .enabled);
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(2)
                              ?.buildDescriptor()
                              .enabled);
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(3)
                              ?.buildDescriptor()
                              .enabled);
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(4)
                              ?.buildDescriptor()
                              .enabled);
         });

      it('When an entry has children, correctly make only Hide Entry and Hide Children enabled in the Context Menu action',
         async function() {
           /**
            * Part of this stack looks roughly like so (with some events omitted):
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * ===== wait =====   ===== wait =====
            * = now =  = now =   = now =  = now =
            *
            * In this test we want to test that the Context Menu option available
            * for an entry with children and a parent is to hide given entry, and hide children only.
            * Since there are no repeating children to hide, we don't want to show 'hide repeating children' option.
            *
            * To achieve that, we will dispatch the context menu on the 'wait' function that has only non-repeating
            * children.
            **/
           const mainThread = getMainThread(parsedTrace.Renderer);
           const entry = findFirstEntry(mainThread.entries, entry => {
             return Trace.Types.Events.isProfileCall(entry) && entry.callFrame.functionName === 'wait';
           });
           const nodeIdWithNoChildren = flameChartView.getMainDataProvider().indexForEvent(entry);
           assert.exists(nodeIdWithNoChildren);
           generateContextMenuForNodeId(nodeIdWithNoChildren);

           // This entry has URL, so there are 5 always-shown actions, and one to add script to ignore list.
           assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 6);
           // Hide function enabled
           assert.isTrue(flameChartView.getMainFlameChart()
                             .getContextMenu()
                             ?.defaultSection()
                             .items.at(0)
                             ?.buildDescriptor()
                             .enabled);
           // Hide children enabled
           assert.isTrue(flameChartView.getMainFlameChart()
                             .getContextMenu()
                             ?.defaultSection()
                             .items.at(1)
                             ?.buildDescriptor()
                             .enabled);
           // Rest of the actions disabled
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(2)
                              ?.buildDescriptor()
                              .enabled);
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(3)
                              ?.buildDescriptor()
                              .enabled);
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(4)
                              ?.buildDescriptor()
                              .enabled);
         });

      it('When an entry has repeating children, correctly make only Hide Entry, Hide Children and Hide repeating children enabled in the Context Menu action',
         async function() {
           /**
            * Part of this stack looks roughly like so (with some events omitted):
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * ===== wait =====   ===== wait =====
            * = now =  = now =   = now =  = now =
            *
            * In this test we want to test that the Context Menu option available
            * for an entry with children repeating children and a parent is to hide given entry, hide children and hide
            * repeating children.
            *
            * To achieve that, we will dispatch the context menu on the 'foo' function that has child 'foo' calls.
            **/

           const mainThread = getMainThread(parsedTrace.Renderer);
           const entry = findFirstEntry(mainThread.entries, entry => {
             return Trace.Types.Events.isProfileCall(entry) && entry.callFrame.functionName === 'foo';
           });

           const nodeId = flameChartView.getMainDataProvider().indexForEvent(entry);
           assert.exists(nodeId);

           generateContextMenuForNodeId(nodeId);

           // This entry has URL, so there are 5 always-shown actions, and one to add script to ignore list.
           assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 6);
           // Hide function enabled
           assert.isTrue(flameChartView.getMainFlameChart()
                             .getContextMenu()
                             ?.defaultSection()
                             .items.at(0)
                             ?.buildDescriptor()
                             .enabled);
           // Hide children enabled
           assert.isTrue(flameChartView.getMainFlameChart()
                             .getContextMenu()
                             ?.defaultSection()
                             .items.at(1)
                             ?.buildDescriptor()
                             .enabled);
           // Hide repeating children enabled
           assert.isTrue(flameChartView.getMainFlameChart()
                             .getContextMenu()
                             ?.defaultSection()
                             .items.at(2)
                             ?.buildDescriptor()
                             .enabled);
           // Rest of the actions disabled
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(3)
                              ?.buildDescriptor()
                              .enabled);
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(4)
                              ?.buildDescriptor()
                              .enabled);
         });

      it('When an entry has no parent and has children, correctly make only Hide Children enabled in the Context Menu action',
         async function() {
           /**
            * Part of this stack looks roughly like so (with some events omitted):
            * =============== Task ==============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * =============== foo ===============
            * ===== wait =====   ===== wait =====
            * = now =  = now =   = now =  = now =
            *
            * In this test we want to test that the Context Menu option available for an entry with no parent is only to
            * hide children.
            * If an entry has no parent, we don't want to show an option to hide the entry since when an entry is hidden,
            * it is indicated by adding a decoration to the parent and if there is no parent, there is no way to show it
            * is hidden.
            *
            * To achieve that, we will dispatch the context menu on the 'Task' function that is on the top of the stack
            * and has no parent.
            **/

           const mainThread = getMainThread(parsedTrace.Renderer);
           const entry = findFirstEntry(mainThread.entries, entry => {
             const childrenAmount = parsedTrace.Renderer.entryToNode.get(entry)?.children.length;
             if (!childrenAmount) {
               return false;
             }
             return Trace.Types.Events.isRunTask(entry);
           });

           const nodeId = flameChartView.getMainDataProvider().indexForEvent(entry);
           assert.exists(nodeId);

           generateContextMenuForNodeId(nodeId);

           // Hide function disabled
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(0)
                              ?.buildDescriptor()
                              .enabled);
           // Hide children enabled
           assert.isTrue(flameChartView.getMainFlameChart()
                             .getContextMenu()
                             ?.defaultSection()
                             .items.at(1)
                             ?.buildDescriptor()
                             .enabled);
           // Rest of the actions disabled
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(2)
                              ?.buildDescriptor()
                              .enabled);
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(3)
                              ?.buildDescriptor()
                              .enabled);
           assert.isFalse(flameChartView.getMainFlameChart()
                              .getContextMenu()
                              ?.defaultSection()
                              .items.at(4)
                              ?.buildDescriptor()
                              .enabled);
         });

      it('Reset Trace Context Menu action is disabled before some action has been applied', async function() {
        /**
         * Part of this stack looks roughly like so (with some events omitted):
         * =============== Task ==============
         * =============== foo ===============
         * =============== foo ===============
         * =============== foo ===============
         * =============== foo ===============
         * =============== foo ===============
         * =============== foo ===============
         * ===== wait =====   ===== wait =====
         * = now =  = now =   = now =  = now =
         *
         * In this test we want to test that the Reset Trace Context Menu option is disabled by default and enabled after
         * some action has been applied.
         *
         * To achieve that, we will first check if Reset Trace is disabled and then dispatch a Context Menu action on
         * "Task" entry and then check if Reset Trace is enabled.
         **/

        const mainThread = getMainThread(parsedTrace.Renderer);
        const entry = findFirstEntry(mainThread.entries, entry => Trace.Types.Events.isRunTask(entry));
        const nodeId = flameChartView.getMainDataProvider().indexForEvent(entry);
        assert.exists(nodeId);

        generateContextMenuForNodeId(nodeId);
        assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 5);
        assert.strictEqual(
            flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(4)?.buildDescriptor().label,
            'Reset trace');
        // Check that Reset Trace is disabled
        assert.isFalse(flameChartView.getMainFlameChart()
                           .getContextMenu()
                           ?.defaultSection()
                           .items.at(4)
                           ?.buildDescriptor()
                           .enabled);

        flameChartView.getMainFlameChart().modifyTree(PerfUI.FlameChart.FilterAction.MERGE_FUNCTION, nodeId);
        generateContextMenuForNodeId(nodeId);

        // Check that Reset Trace is enabled
        assert.isTrue(flameChartView.getMainFlameChart()
                          .getContextMenu()
                          ?.defaultSection()
                          .items.at(4)
                          ?.buildDescriptor()
                          .enabled);
      });

      it('When an entry has URL and is not ignored, correctly show the Add script to ignore list in the Context Menu action',
         async function() {
           const mainThread = getMainThread(parsedTrace.Renderer);
           const entryWithUrl = findFirstEntry(mainThread.entries, entry => {
             // Let's find the first entry with URL.
             return Trace.Types.Events.isProfileCall(entry) && Boolean(entry.callFrame.url);
           });
           generateContextMenuForNode(entryWithUrl);

           assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 6);

           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(5)
                   ?.buildDescriptor()
                   .label,
               'Add script to ignore list');
         });

      it('When an entry has URL and is ignored, correctly show the Remove script from ignore list in the Context Menu action',
         async function() {
           const mainThread = getMainThread(parsedTrace.Renderer);
           const entryWithIgnoredUrl = findFirstEntry(mainThread.entries, entry => {
             // Let's find the first entry with URL.
             return Trace.Types.Events.isProfileCall(entry) && Boolean(entry.callFrame.url);
           });
           Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(
               urlString`${(entryWithIgnoredUrl as Trace.Types.Events.SyntheticProfileCall).callFrame.url}`);

           generateContextMenuForNode(entryWithIgnoredUrl);

           assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 6);

           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(5)
                   ?.buildDescriptor()
                   .label,
               'Remove script from ignore list');
         });
    });
  });

  describe('updating the active AI focus', () => {
    it('updates the UI Context with the active AI Call tree for the selected event', async function() {
      const {parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const mockViewDelegate = new MockViewDelegate();
      const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      flameChartView.setModel(parsedTrace, metadata);
      // Find some task in the main thread that we can build an AI Call Tree from
      const task = allThreadEntriesInTrace(parsedTrace).find(event => {
        return Trace.Types.Events.isRunTask(event) && event.dur > 5_000 &&
            Utils.AICallTree.AICallTree.fromEvent(event, parsedTrace) !== null;
      });

      assert.isOk(task);
      UI.Context.Context.instance().setFlavor(Utils.AIContext.AgentFocus, null);
      const selection = Timeline.TimelineSelection.selectionFromEvent(task);
      flameChartView.setSelectionAndReveal(selection);
      await doubleRaf();  // the updating of the AI Call Tree is done in a rAF to not block.
      const flavor = UI.Context.Context.instance().flavor(Utils.AIContext.AgentFocus);
      assert.instanceOf(flavor, Utils.AIContext.AgentFocus);
      assert.strictEqual(flavor.data.type, 'call-tree');
    });
  });

  describe('Link between entries annotation in progress', function() {
    let flameChartView: Timeline.TimelineFlameChartView.TimelineFlameChartView;
    let parsedTrace: Trace.Handlers.Types.ParsedTrace;
    let metadata: Trace.Types.File.MetaData|null;

    this.beforeEach(async () => {
      ({parsedTrace, metadata} = await TraceLoader.traceEngine(this, 'recursive-blocking-js.json.gz'));
      const mockViewDelegate = new MockViewDelegate();

      flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      flameChartView.setModel(parsedTrace, metadata);
      Timeline.ModificationsManager.ModificationsManager.activeManager();
    });

    it('Creates a `link between entries Annotation in progress` tracking object', async function() {
      // Make sure the link annotation in the progress of creation does not exist
      assert.isNull(flameChartView.getLinkSelectionAnnotation());

      // Start creating a link between entries from an entry with ID 204
      flameChartView.onEntriesLinkAnnotationCreate(flameChartView.getMainDataProvider(), 204);

      // Make sure the link is started and only has 'from' entry set
      assert.isNotNull(flameChartView.getLinkSelectionAnnotation());
      assert.isNotNull(flameChartView.getLinkSelectionAnnotation()?.entryFrom);
      assert.isUndefined(flameChartView.getLinkSelectionAnnotation()?.entryTo);

      // Make sure the annotation exists in the ModificationsManager
      const annotations = Timeline.ModificationsManager.ModificationsManager.activeManager()?.getAnnotations();
      assert.exists(annotations);
      assert.strictEqual(annotations?.length, 1);
      assert.strictEqual(annotations[0].type, 'ENTRIES_LINK');
    });

    it('Sets the link between entries annotation in progress to null when the second entry is selected',
       async function() {
         // Make sure the link annotation in the progress of creation does not exist
         assert.isNull(flameChartView.getLinkSelectionAnnotation());

         // Start creating a link between entries from an entry with ID 204
         flameChartView.onEntriesLinkAnnotationCreate(flameChartView.getMainDataProvider(), 204);
         const entryFrom = flameChartView.getMainDataProvider().eventByIndex(204);

         // Hover on another entry to complete the link
         flameChartView.updateLinkSelectionAnnotationWithToEntry(flameChartView.getMainDataProvider(), 245);
         const entryTo = flameChartView.getMainDataProvider().eventByIndex(245);
         // Make sure the entry 'to' is set
         assert.exists(flameChartView.getLinkSelectionAnnotation()?.entryTo);

         // Select the other entry to complete the link and set the one in progress to null
         flameChartView.handleToEntryOfLinkBetweenEntriesSelection(245);
         // Make sure the link annotation in progress is set to null
         assert.isNull(flameChartView.getLinkSelectionAnnotation());

         // Make sure the annotation exists in the ModificationsManager
         const annotations = Timeline.ModificationsManager.ModificationsManager.activeManager()?.getAnnotations();
         assert.exists(annotations);
         assert.strictEqual(annotations?.length, 1);
         assert.strictEqual(annotations[0].type, 'ENTRIES_LINK');
         const entriesLink = annotations[0] as Trace.Types.File.EntriesLinkAnnotation;

         assert.strictEqual(entriesLink.entryFrom, entryFrom);
         assert.strictEqual(entriesLink.entryTo, entryTo);
       });

    it('Reverses entries in the link if `to` entry timestamp is earlier than `from` entry timestamo', async function() {
      // Make sure the link annotation in the progress of creation does not exist
      assert.isNull(flameChartView.getLinkSelectionAnnotation());

      // Start creating a link between entries from an entry with ID 245
      flameChartView.onEntriesLinkAnnotationCreate(flameChartView.getMainDataProvider(), 245);
      const entryFrom = flameChartView.getMainDataProvider().eventByIndex(245);

      // Hover on another entry that starts before the entry that the link is being created from
      flameChartView.updateLinkSelectionAnnotationWithToEntry(flameChartView.getMainDataProvider(), 204);
      const entryTo = flameChartView.getMainDataProvider().eventByIndex(204);

      // Select the other entry to complete the link and set the one in progress to null
      flameChartView.handleToEntryOfLinkBetweenEntriesSelection(204);

      // Make sure the annotation exists in the ModificationsManager
      const annotations = Timeline.ModificationsManager.ModificationsManager.activeManager()?.getAnnotations();
      assert.exists(annotations);
      assert.strictEqual(annotations?.length, 1);
      assert.strictEqual(annotations[0].type, 'ENTRIES_LINK');
      const entriesLink = annotations[0] as Trace.Types.File.EntriesLinkAnnotation;

      // Make 'entryFrom' has an earlier timestamp and the entries `to` and `from` got switched up
      assert.strictEqual(entriesLink.entryFrom, entryTo);
      assert.strictEqual(entriesLink.entryTo, entryFrom);
    });
  });
});
