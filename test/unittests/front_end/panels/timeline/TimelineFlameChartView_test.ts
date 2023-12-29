// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

const {assert} = chai;

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  selection: Timeline.TimelineSelection.TimelineSelection|null = null;
  select(selection: Timeline.TimelineSelection.TimelineSelection|null): void {
    this.selection = selection;
  }
  selectEntryAtTime(_events: TraceEngine.Types.TraceEvents.TraceEventData[]|null, _time: number): void {
  }
  highlightEvent(_event: TraceEngine.Legacy.Event|null): void {
  }
}

describeWithEnvironment('TimelineFlameChartView', function() {
  it('Can search for events by name in the timeline', async function() {
    const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'lcp-images.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
    flameChartView.setSearchableView(searchableView);
    flameChartView.setModel(performanceModel, traceParsedData);

    const searchQuery = 'Paint';
    const searchConfig =
        new UI.SearchableView.SearchConfig(/* query */ searchQuery, /* caseSensitive */ false, /* isRegex */ false);
    flameChartView.performSearch(searchConfig, true);

    assert.strictEqual(flameChartView.getSearchResults()?.length, 15);
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
      if (!selection || !Timeline.TimelineSelection.TimelineSelection.isTraceEventSelection(selection.object)) {
        throw new Error('Selection is not present or not a Trace Event');
      }
      const object = selection.object;
      assert.strictEqual(object.name, name);
    }
  });

  // This test is still failing after bumping up the timeout to 20 seconds. So
  // skip it while we work on a fix for the trace load speed.
  it.skip('[crbug.com/1492405] Shows the network track correctly', async function() {
    const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'load-simple.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(performanceModel, traceParsedData);

    assert.isTrue(flameChartView.isNetworkTrackShownForTests());
  });

  it('Does not show the network track when there is no network request', async function() {
    const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'basic.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(performanceModel, traceParsedData);

    assert.isFalse(flameChartView.isNetworkTrackShownForTests());
  });

  it('Adds Hidden Ancestors Arrow as a decoration when TreeModified event is dispatched on a node', async function() {
    const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'load-simple.json.gz');
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(performanceModel, traceParsedData);

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
      const childrenAmount =
          traceParsedData.Renderer.entryToNode.get(node as TraceEngine.Types.TraceEvents.TraceEntry)?.children.length;
      if (!childrenAmount) {
        return false;
      }
      return childrenAmount > 0 && node.cat === 'devtools.timeline';
    });
    const node =
        traceParsedData.Renderer.entryToNode.get(firstNodeWithChildren as TraceEngine.Types.TraceEvents.TraceEntry);
    if (!node) {
      throw new Error('Could not find a visible node with children');
    }

    // Dispatch a TreeModified event that should apply COLLAPSE_FUNCTION action to the node.
    // This action will hide all the children of the passed node and add HIDDEN_ANCESTORS_ARROW decoration to it.
    flameChartView.getMainFlameChart().dispatchEventToListeners(PerfUI.FlameChart.Events.TreeModified, {
      group: mainTrack,
      node: node?.id,
      action: TraceEngine.EntriesFilter.FilterApplyAction.COLLAPSE_FUNCTION,
    });

    const decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
    assert.deepEqual(decorationsForEntry, [
      {
        type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_ANCESTORS_ARROW,
      },
    ]);
  });

  it('Removes Hidden Ancestors Arrow as a decoration when Reset Children event is dispatched on a node',
     async function() {
       const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'load-simple.json.gz');
       const mockViewDelegate = new MockViewDelegate();

       const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
       flameChartView.setModel(performanceModel, traceParsedData);

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
         const childrenAmount =
             traceParsedData.Renderer.entryToNode.get(node as TraceEngine.Types.TraceEvents.TraceEntry)
                 ?.children.length;
         if (!childrenAmount) {
           return false;
         }
         return childrenAmount > 0 && node.cat === 'devtools.timeline';
       });
       const node =
           traceParsedData.Renderer.entryToNode.get(firstNodeWithChildren as TraceEngine.Types.TraceEvents.TraceEntry);
       if (!node) {
         throw new Error('Could not find a visible node with children');
       }

       // Dispatch a TreeModified event that should apply COLLAPSE_FUNCTION action to the node.
       // This action will hide all the children of the passed node and add HIDDEN_ANCESTORS_ARROW decoration to it.
       flameChartView.getMainFlameChart().dispatchEventToListeners(PerfUI.FlameChart.Events.TreeModified, {
         group: mainTrack,
         node: node?.id,
         action: TraceEngine.EntriesFilter.FilterApplyAction.COLLAPSE_FUNCTION,
       });

       let decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
       assert.deepEqual(decorationsForEntry, [
         {
           type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_ANCESTORS_ARROW,
         },
       ]);

       mainTrack = flameChartView.getMainFlameChart().timelineData()?.groups.find(group => {
         return group.name === 'Main — http://localhost:8080/';
       });
       if (!mainTrack) {
         throw new Error('Could not find main track');
       }
       // Dispatch a TreeModified event that should apply RESET_CHILDREN action to the node.
       // This action will eveal all of the hidden children of the passed node and remove HIDDEN_ANCESTORS_ARROW decoration from it.
       flameChartView.getMainFlameChart().dispatchEventToListeners(PerfUI.FlameChart.Events.TreeModified, {
         group: mainTrack,
         node: node?.id,
         action: TraceEngine.EntriesFilter.FilterUndoAction.RESET_CHILDREN,
       });

       // No decorations should exist on the node
       decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
       assert.isUndefined(decorationsForEntry);
     });
});
