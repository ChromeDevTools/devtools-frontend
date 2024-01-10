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

  it('Adds Hidden Ancestors Arrow as a decoration when a Context Menu action is applied on a node', async function() {
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

    // Apply COLLAPSE_FUNCTION action to the node. This action will hide all the children of the passed node and add HIDDEN_ANCESTORS_ARROW decoration to it.
    flameChartView.getMainFlameChart().modifyTree(
        TraceEngine.EntriesFilter.FilterApplyAction.COLLAPSE_FUNCTION, node?.id);

    const decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
    assert.deepEqual(decorationsForEntry, [
      {
        type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_ANCESTORS_ARROW,
      },
    ]);
  });

  it('Adds Hidden Ancestors Arrow as a decoration when a Context Menu action is applied on a selected node with a key shorcut event',
     async function() {
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

       flameChartView.getMainFlameChart().setSelectedEntry(node?.id);

       // Dispatch a shortcut keydown event that applies 'Hide Children' Context menu action
       const event = new KeyboardEvent('keydown', {key: 'c'});
       flameChartView.getMainFlameChart().getCanvas().dispatchEvent(event);

       const decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
       assert.deepEqual(decorationsForEntry, [
         {
           type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_ANCESTORS_ARROW,
         },
       ]);
     });

  it('Removes Hidden Ancestors Arrow as a decoration when Reset Children action is applied on a node',
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

       // Apply COLLAPSE_FUNCTION Context Menu action to the node.
       // This action will hide all the children of the passed node and add HIDDEN_ANCESTORS_ARROW decoration to it.
       flameChartView.getMainFlameChart().modifyTree(
           TraceEngine.EntriesFilter.FilterApplyAction.COLLAPSE_FUNCTION, node?.id);

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
       // Apply a RESET_CHILDREN action that will reveal all of the hidden children of the passed node and remove HIDDEN_ANCESTORS_ARROW decoration from it.
       flameChartView.getMainFlameChart().modifyTree(
           TraceEngine.EntriesFilter.FilterUndoAction.RESET_CHILDREN, node?.id);

       // No decorations should exist on the node
       decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
       assert.isUndefined(decorationsForEntry);
     });

  it('When an entry has no children, correctly show only Hide as a possible Context Menu action', async function() {
    const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'recursive-blocking-js.json.gz');
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(performanceModel, traceParsedData);

    // Find the Main track to later collapse entries of
    const mainTrack = flameChartView.getMainFlameChart().timelineData()?.groups.find(group => {
      return group.name === 'Main — http://127.0.0.1:8080/';
    });
    if (!mainTrack) {
      throw new Error('Could not find main track');
    }

    // Find the first node that has no children and is visible in the timeline
    const nodeOfGroup = flameChartView.getMainDataProvider().groupTreeEvents(mainTrack);
    const firstNodeWithoutChildren = nodeOfGroup?.find(node => {
      const childrenAmount =
          traceParsedData.Renderer.entryToNode.get(node as TraceEngine.Types.TraceEvents.TraceEntry)?.children.length;
      return childrenAmount === 0 && node.cat === 'devtools.timeline';
    });
    const node =
        traceParsedData.Renderer.entryToNode.get(firstNodeWithoutChildren as TraceEngine.Types.TraceEvents.TraceEntry);
    if (!node) {
      throw new Error('Could not find a visible node without children');
    }

    // Highlight the node to make the Context Menu dispatch on this node
    flameChartView.getMainFlameChart().highlightEntry(node?.id);
    // The mouse event passed to the Context Menu is used to indicate where the menu should appear. Since we don't need it to actually appear for this test, pass an empty event.
    flameChartView.getMainFlameChart().onContextMenu(new Event(''));

    assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.headerSection().items.length, 2);
    assert.strictEqual(
        flameChartView.getMainFlameChart().getContextMenu()?.headerSection().items.at(0)?.buildDescriptor().label,
        'Hide function');
    assert.strictEqual(
        flameChartView.getMainFlameChart().getContextMenu()?.headerSection().items.at(1)?.buildDescriptor().label,
        'Reset trace');
  });

  it('When an entry has children, correctly show only Hide and Hide Children as possible Context Menu actions',
     async function() {
       const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'recursive-blocking-js.json.gz');
       const mockViewDelegate = new MockViewDelegate();

       const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
       flameChartView.setModel(performanceModel, traceParsedData);

       // Find the Main track to later collapse entries of
       const mainTrack = flameChartView.getMainFlameChart().timelineData()?.groups.find(group => {
         return group.name === 'Main — http://127.0.0.1:8080/';
       });
       if (!mainTrack) {
         throw new Error('Could not find main track');
       }

       // Find the first node that has some children to collapse and is visible in the timeline
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

       // Highlight the node to make the Context Menu dispatch on this node
       flameChartView.getMainFlameChart().highlightEntry(node?.id);
       // The mouse event passed to the Context Menu is used to indicate where the menu should appear. Since we don't need it to actually appear for this test, pass an empty event.
       flameChartView.getMainFlameChart().onContextMenu(new Event(''));

       assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.headerSection().items.length, 3);
       assert.strictEqual(
           flameChartView.getMainFlameChart().getContextMenu()?.headerSection().items.at(0)?.buildDescriptor().label,
           'Hide function');
       assert.strictEqual(
           flameChartView.getMainFlameChart().getContextMenu()?.headerSection().items.at(1)?.buildDescriptor().label,
           'Hide children');
       assert.strictEqual(
           flameChartView.getMainFlameChart().getContextMenu()?.headerSection().items.at(2)?.buildDescriptor().label,
           'Reset trace');
     });
});
