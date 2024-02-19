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

  it('Adds Hidden Descendants Arrow as a decoration when a Context Menu action is applied on a node', async function() {
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
          traceParsedData.Renderer.entryToNode.get(node as TraceEngine.Types.TraceEvents.SyntheticTraceEntry)
              ?.children.length;
      if (!childrenAmount) {
        return false;
      }
      return childrenAmount > 0 && node.cat === 'devtools.timeline';
    });
    const node = traceParsedData.Renderer.entryToNode.get(
        firstNodeWithChildren as TraceEngine.Types.TraceEvents.SyntheticTraceEntry);
    if (!node) {
      throw new Error('Could not find a visible node with children');
    }

    // Apply COLLAPSE_FUNCTION action to the node. This action will hide all the children of the passed node and add HIDDEN_DESCENDANTS_ARROW decoration to it.
    flameChartView.getMainFlameChart().modifyTree(TraceEngine.EntriesFilter.FilterAction.COLLAPSE_FUNCTION, node?.id);

    const decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
    assert.deepEqual(decorationsForEntry, [
      {
        type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW,
      },
    ]);
  });

  it('Adds Hidden Descendants Arrow as a decoration when a Context Menu action is applied on a selected node with a key shorcut event',
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
             traceParsedData.Renderer.entryToNode.get(node as TraceEngine.Types.TraceEvents.SyntheticTraceEntry)
                 ?.children.length;
         if (!childrenAmount) {
           return false;
         }
         return childrenAmount > 0 && node.cat === 'devtools.timeline';
       });
       const node = traceParsedData.Renderer.entryToNode.get(
           firstNodeWithChildren as TraceEngine.Types.TraceEvents.SyntheticTraceEntry);
       if (!node) {
         throw new Error('Could not find a visible node with children');
       }

       flameChartView.getMainFlameChart().setSelectedEntry(node?.id);

       // Dispatch a shortcut keydown event that applies 'Hide Children' Context menu action
       const event = new KeyboardEvent('keydown', {code: 'KeyC'});
       flameChartView.getMainFlameChart().getCanvas().dispatchEvent(event);

       const decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
       assert.deepEqual(decorationsForEntry, [
         {
           type: PerfUI.FlameChart.FlameChartDecorationType.HIDDEN_DESCENDANTS_ARROW,
         },
       ]);
     });

  it('Removes Hidden Descendants Arrow as a decoration when Reset Children action is applied on a node',
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
             traceParsedData.Renderer.entryToNode.get(node as TraceEngine.Types.TraceEvents.SyntheticTraceEntry)
                 ?.children.length;
         if (!childrenAmount) {
           return false;
         }
         return childrenAmount > 0 && node.cat === 'devtools.timeline';
       });
       const node = traceParsedData.Renderer.entryToNode.get(
           firstNodeWithChildren as TraceEngine.Types.TraceEvents.SyntheticTraceEntry);
       if (!node) {
         throw new Error('Could not find a visible node with children');
       }

       // Apply COLLAPSE_FUNCTION Context Menu action to the node.
       // This action will hide all the children of the passed node and add HIDDEN_DESCENDANTS_ARROW decoration to it.
       flameChartView.getMainFlameChart().modifyTree(
           TraceEngine.EntriesFilter.FilterAction.COLLAPSE_FUNCTION, node?.id);

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
       flameChartView.getMainFlameChart().modifyTree(TraceEngine.EntriesFilter.FilterAction.RESET_CHILDREN, node?.id);

       // No decorations should exist on the node
       decorationsForEntry = flameChartView.getMainFlameChart().timelineData()?.entryDecorations[node?.id];
       assert.isUndefined(decorationsForEntry);
     });

  describe('Context Menu Actions', async function() {
    let flameChartView: Timeline.TimelineFlameChartView.TimelineFlameChartView;

    this.beforeEach(async () => {
      const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'recursive-blocking-js.json.gz');
      const mockViewDelegate = new MockViewDelegate();

      flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      flameChartView.setModel(performanceModel, traceParsedData);

      // Find the Main track to later collapse entries of
      const mainTrack = flameChartView.getMainFlameChart().timelineData()?.groups.find(group => {
        return group.name === 'Main — http://127.0.0.1:8080/';
      });
      if (!mainTrack) {
        throw new Error('Could not find main track');
      }
    });

    it('When an entry has no children, correctly show only Hide as a possible Context Menu action', async function() {
      /** Part of this stack looks roughly like so (with some events omitted):
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
       * To chieve that, we will dispatch the context menu on the 'updateCounters' function that does not have children.
       * The ID of 'updateCounters' is 245.
       **/

      const iDOfNodeWithNoChildren = 245;
      // Highlight the node to make the Context Menu dispatch on this node
      flameChartView.getMainFlameChart().highlightEntry(iDOfNodeWithNoChildren);

      // The mouse event passed to the Context Menu is used to indicate where the menu should appear. Since we don't need it to actually appear for this test, pass an empty event.
      flameChartView.getMainFlameChart().onContextMenu(new Event(''));

      assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 2);
      assert.strictEqual(
          flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(0)?.buildDescriptor().label,
          'Hide function');
      assert.strictEqual(
          flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(1)?.buildDescriptor().label,
          'Reset trace');
    });

    it('When an entry has children, correctly show only Hide and Hide Children as possible Context Menu actions',
       async function() {
         /** Part of this stack looks roughly like so (with some events omitted):
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * ===== wait =====   ===== wait =====  <-- ID=204
          * = now =  = now =   = now =  = now =
          *
          * In this test we want to test that the Context Menu option available
          * for an entry with children and a parent is to hide given entry, and hide children only.
          * Since there are no repeating children to hide, we don't want to show 'hide repeating children' option.
          *
          * To chieve that, we will dispatch the context menu on the 'wait' function that has only non-repeating children.
          * The ID of the first 'wait' is 204.
          **/

         const iDOfNodeWithNoChildren = 204;
         // Highlight the node to make the Context Menu dispatch on this node
         flameChartView.getMainFlameChart().highlightEntry(iDOfNodeWithNoChildren);

         // The mouse event passed to the Context Menu is used to indicate where the menu should appear. Since we don't need it to actually appear for this test, pass an empty event.
         flameChartView.getMainFlameChart().onContextMenu(new Event(''));

         assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 3);
         assert.strictEqual(
             flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(0)?.buildDescriptor().label,
             'Hide function');
         assert.strictEqual(
             flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(1)?.buildDescriptor().label,
             'Hide children');
         assert.strictEqual(
             flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(2)?.buildDescriptor().label,
             'Reset trace');
       });

    it('When an entry has repeating children, correctly show only Hide, Hide Children and Hide repeating children as possible Context Menu actions',
       async function() {
         /** Part of this stack looks roughly like so (with some events omitted):
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo =============== <-- ID=200
          * =============== foo ===============
          * =============== foo ===============
          * ===== wait =====   ===== wait =====
          * = now =  = now =   = now =  = now =
          *
          * In this test we want to test that the Context Menu option available
          * for an entry with children repeating children and a parent is to hide given entry, hide children and hide repeating children.
          *
          * To chieve that, we will dispatch the context menu on the 'foo' function that has child 'foo' calls.
          * The ID of the a matching 'foo' is 200.
          **/

         const iDOfNodeWithNoChildren = 200;
         // Highlight the node to make the Context Menu dispatch on this node
         flameChartView.getMainFlameChart().highlightEntry(iDOfNodeWithNoChildren);

         // The mouse event passed to the Context Menu is used to indicate where the menu should appear. Since we don't need it to actually appear for this test, pass an empty event.
         flameChartView.getMainFlameChart().onContextMenu(new Event(''));

         assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 4);
         assert.strictEqual(
             flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(0)?.buildDescriptor().label,
             'Hide function');
         assert.strictEqual(
             flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(1)?.buildDescriptor().label,
             'Hide children');
         assert.strictEqual(
             flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(2)?.buildDescriptor().label,
             'Hide repeating children');
         assert.strictEqual(
             flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(3)?.buildDescriptor().label,
             'Reset trace');
       });

    it('When an entry does not have a parent and has children, correctly show only Hide Children as a possible Context Menu action',
       async function() {
         /** Part of this stack looks roughly like so (with some events omitted):
          * =============== Task ============== <-- ID=62
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * =============== foo ===============
          * ===== wait =====   ===== wait =====
          * = now =  = now =   = now =  = now =
          *
          * In this test we want to test that the Context Menu option available for an entry with no parent is only to hide children.
          * If an entry has no parent, we don't want to show an option to hide the entry since when an entry is hidden,
          * it is indicated by adding a decoration to the parent and if there is no parent, there is no way to show it is hidden.
          *
          * To chieve that, we will dispatch the context menu on the 'Task' function that is on the top of the stack and has no parent.
          * The ID of the a matching 'Task' is 62.
          **/

         const iDOfNodeWithNoChildren = 62;
         // Highlight the node to make the Context Menu dispatch on this node
         flameChartView.getMainFlameChart().highlightEntry(iDOfNodeWithNoChildren);

         // The mouse event passed to the Context Menu is used to indicate where the menu should appear. Since we don't need it to actually appear for this test, pass an empty event.
         flameChartView.getMainFlameChart().onContextMenu(new Event(''));

         assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 2);
         assert.strictEqual(
             flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(0)?.buildDescriptor().label,
             'Hide children');
         assert.strictEqual(
             flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(1)?.buildDescriptor().label,
             'Reset trace');
       });

    it('Reset Trace Context Menu action is disabled before some action has been applied', async function() {
      /** Part of this stack looks roughly like so (with some events omitted):
       * =============== Task ============== <-- ID=62
       * =============== foo ===============
       * =============== foo ===============
       * =============== foo ===============
       * =============== foo ===============
       * =============== foo ===============
       * =============== foo ===============
       * ===== wait =====   ===== wait =====
       * = now =  = now =   = now =  = now =
       *
       * In this test we want to test that the Reset Trace Context Menu option is disabled by default and enabled after some action has been applied.
       *
       * To chieve that, we will first check if Reset Trace is disabled and then dispatch a Context Menu action on "Task" entry and then check if Reset Trace is enabled.
       * The ID of the a matching 'Task' is 62.
       **/

      const iDOfNode = 62;
      // Highlight the node to make the Context Menu dispatch on this node
      flameChartView.getMainFlameChart().highlightEntry(iDOfNode);

      // The mouse event passed to the Context Menu is used to indicate where the menu should appear. Since we don't need it to actually appear for this test, pass an empty event.
      flameChartView.getMainFlameChart().onContextMenu(new Event(''));

      assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 2);
      assert.strictEqual(
          flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(1)?.buildDescriptor().label,
          'Reset trace');
      // Check that Reset Trace is disabled
      assert.strictEqual(
          flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(1)?.buildDescriptor().enabled,
          false);

      flameChartView.getMainFlameChart().modifyTree(TraceEngine.EntriesFilter.FilterAction.MERGE_FUNCTION, iDOfNode);
      flameChartView.getMainFlameChart().highlightEntry(iDOfNode);
      flameChartView.getMainFlameChart().onContextMenu(new Event(''));

      // Check that Reset Trace is enabled
      assert.strictEqual(
          flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(1)?.buildDescriptor().enabled,
          true);
    });
  });
});
