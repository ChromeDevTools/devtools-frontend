// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TraceEngine from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {setupIgnoreListManagerEnvironment} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  selection: Timeline.TimelineSelection.TimelineSelection|null = null;
  select(selection: Timeline.TimelineSelection.TimelineSelection|null): void {
    this.selection = selection;
  }
  selectEntryAtTime(_events: TraceEngine.Types.TraceEvents.TraceEventData[]|null, _time: number): void {
  }
  highlightEvent(_event: TraceEngine.Types.TraceEvents.TraceEventData|null): void {
  }
  element = document.createElement('div');
}

describeWithEnvironment('TimelineFlameChartView', function() {
  beforeEach(() => {
    setupIgnoreListManagerEnvironment();
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
    const {traceData} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
    flameChartView.setSearchableView(searchableView);
    flameChartView.setModel(traceData);

    const searchQuery = 'Paint';
    const searchConfig =
        new UI.SearchableView.SearchConfig(/* query */ searchQuery, /* caseSensitive */ false, /* isRegex */ false);
    flameChartView.performSearch(searchConfig, true);

    assert.strictEqual(flameChartView.getSearchResults()?.length, 17);
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
    const {traceData} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(traceData);

    assert.isTrue(flameChartView.isNetworkTrackShownForTests());
  });

  it('Does not show the network track when there is no network request', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'basic.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(traceData);

    assert.isFalse(flameChartView.isNetworkTrackShownForTests());
  });

  it('Adds Hidden Descendants Arrow as a decoration when a Context Menu action is applied on a node', async function() {
    const {traceData} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(traceData);

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
          traceData.Renderer.entryToNode.get(node as TraceEngine.Types.TraceEvents.SyntheticTraceEntry)
              ?.children.length;
      if (!childrenAmount) {
        return false;
      }
      return childrenAmount > 0 && node.cat === 'devtools.timeline';
    });
    const node =
        traceData.Renderer.entryToNode.get(firstNodeWithChildren as TraceEngine.Types.TraceEvents.SyntheticTraceEntry);
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

  it('Adds Hidden Descendants Arrow as a decoration when a Context Menu action is applied on a selected node with a key shortcut event',
     async function() {
       const {traceData} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
       const mockViewDelegate = new MockViewDelegate();

       const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
       flameChartView.setModel(traceData);

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
             traceData.Renderer.entryToNode.get(node as TraceEngine.Types.TraceEvents.SyntheticTraceEntry)
                 ?.children.length;
         if (!childrenAmount) {
           return false;
         }
         return childrenAmount > 0 && node.cat === 'devtools.timeline';
       });
       const node = traceData.Renderer.entryToNode.get(
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
       const {traceData} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
       const mockViewDelegate = new MockViewDelegate();

       const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
       flameChartView.setModel(traceData);
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
         const childrenAmount =
             traceData.Renderer.entryToNode.get(node as TraceEngine.Types.TraceEvents.SyntheticTraceEntry)
                 ?.children.length;
         if (!childrenAmount) {
           return false;
         }
         return childrenAmount > 0 && node.cat === 'devtools.timeline';
       });
       const node = traceData.Renderer.entryToNode.get(
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

  describe('Context Menu', function() {
    let flameChartView: Timeline.TimelineFlameChartView.TimelineFlameChartView;
    let traceData: TraceEngine.Handlers.Types.TraceParseData;

    this.beforeEach(async () => {
      ({traceData} = await TraceLoader.traceEngine(this, 'recursive-blocking-js.json.gz'));
      const mockViewDelegate = new MockViewDelegate();

      flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      flameChartView.setModel(traceData);
      Timeline.ModificationsManager.ModificationsManager.activeManager();
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
          'Configure tracks…');
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

      function getMainThread(data: TraceEngine.Handlers.ModelHandlers.Renderer.RendererHandlerData):
          TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread {
        let mainThread: TraceEngine.Handlers.ModelHandlers.Renderer.RendererThread|null = null;
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
          allEntries: readonly TraceEngine.Types.TraceEvents.SyntheticTraceEntry[],
          predicate: (entry: TraceEngine.Types.TraceEvents.SyntheticTraceEntry) =>
              boolean): TraceEngine.Types.TraceEvents.SyntheticTraceEntry {
        const entry = allEntries.find(entry => predicate(entry));
        if (!entry) {
          throw new Error('Could not find expected entry.');
        }
        return entry;
      }

      function generateContextMenuForNodeId(nodeId: number): void {
        // Highlight the node to make the Context Menu dispatch on this node
        flameChartView.getMainFlameChart().highlightEntry(nodeId);

        // The mouse event passed to the Context Menu is used to indicate where the menu should appear. Since we don't
        // need it to actually appear for this test, pass an empty event.
        flameChartView.getMainFlameChart().onContextMenu(new MouseEvent(''));
      }

      function generateContextMenuForNode(node: TraceEngine.Types.TraceEvents.TraceEventData): void {
        const nodeId = flameChartView.getMainDataProvider().indexForEvent(node);
        assert.isNotNull(nodeId);
        generateContextMenuForNodeId(nodeId);
      }

      it('When an entry has no children, correctly make only Hide Entry enabled in the Context Menu action',
         async function() {
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
            * To achieve that, we will dispatch the context menu on the 'updateCounters' function that does not have
            * children.
            * The ID of 'updateCounters' is 245.
            **/

           const nodeIdWithNoChildren = 245;
           generateContextMenuForNodeId(nodeIdWithNoChildren);

           assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 5);
           // Hide function enabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(0)
                   ?.buildDescriptor()
                   .enabled,
               true);
           // Rest of the actions disabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(1)
                   ?.buildDescriptor()
                   .enabled,
               false);
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(2)
                   ?.buildDescriptor()
                   .enabled,
               false);
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(3)
                   ?.buildDescriptor()
                   .enabled,
               false);
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(4)
                   ?.buildDescriptor()
                   .enabled,
               false);
         });

      it('When an entry has children, correctly make only Hide Entry and Hide Children enabled in the Context Menu action',
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
            * To achieve that, we will dispatch the context menu on the 'wait' function that has only non-repeating
            * children.
            * The ID of the first 'wait' is 204.
            **/

           const nodeIdWithNoChildren = 204;
           generateContextMenuForNodeId(nodeIdWithNoChildren);

           // This entry has URL, so there are 5 always-shown actions, and one to add script to ignore list.
           assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 6);
           // Hide function enabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(0)
                   ?.buildDescriptor()
                   .enabled,
               true);
           // Hide children enabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(1)
                   ?.buildDescriptor()
                   .enabled,
               true);
           // Rest of the actions disabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(2)
                   ?.buildDescriptor()
                   .enabled,
               false);
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(3)
                   ?.buildDescriptor()
                   .enabled,
               false);
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(4)
                   ?.buildDescriptor()
                   .enabled,
               false);
         });

      it('When an entry has repeating children, correctly make only Hide Entry, Hide Children and Hide repeating children enabled in the Context Menu action',
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
            * for an entry with children repeating children and a parent is to hide given entry, hide children and hide
            * repeating children.
            *
            * To achieve that, we will dispatch the context menu on the 'foo' function that has child 'foo' calls.
            * The ID of the a matching 'foo' is 200.
            **/

           const nodeIdWithNoChildren = 200;
           generateContextMenuForNodeId(nodeIdWithNoChildren);

           // This entry has URL, so there are 5 always-shown actions, and one to add script to ignore list.
           assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 6);
           // Hide function enabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(0)
                   ?.buildDescriptor()
                   .enabled,
               true);
           // Hide children enabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(1)
                   ?.buildDescriptor()
                   .enabled,
               true);
           // Hide repeating children enabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(2)
                   ?.buildDescriptor()
                   .enabled,
               true);
           // Rest of the actions disabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(3)
                   ?.buildDescriptor()
                   .enabled,
               false);
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(4)
                   ?.buildDescriptor()
                   .enabled,
               false);
         });

      it('When an entry has no parent and has children, correctly make only Hide Children enabled in the Context Menu action',
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
            * In this test we want to test that the Context Menu option available for an entry with no parent is only to
            * hide children.
            * If an entry has no parent, we don't want to show an option to hide the entry since when an entry is hidden,
            * it is indicated by adding a decoration to the parent and if there is no parent, there is no way to show it
            * is hidden.
            *
            * To achieve that, we will dispatch the context menu on the 'Task' function that is on the top of the stack
            * and has no parent.
            * The ID of the a matching 'Task' is 62.
            **/

           const nodeIdWithNoChildren = 62;
           generateContextMenuForNodeId(nodeIdWithNoChildren);

           // Hide function disabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(0)
                   ?.buildDescriptor()
                   .enabled,
               false);
           // Hide children enabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(1)
                   ?.buildDescriptor()
                   .enabled,
               true);
           // Rest of the actions disabled
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(2)
                   ?.buildDescriptor()
                   .enabled,
               false);
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(3)
                   ?.buildDescriptor()
                   .enabled,
               false);
           assert.strictEqual(
               flameChartView.getMainFlameChart()
                   .getContextMenu()
                   ?.defaultSection()
                   .items.at(4)
                   ?.buildDescriptor()
                   .enabled,
               false);
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
         * In this test we want to test that the Reset Trace Context Menu option is disabled by default and enabled after
         * some action has been applied.
         *
         * To achieve that, we will first check if Reset Trace is disabled and then dispatch a Context Menu action on
         * "Task" entry and then check if Reset Trace is enabled.
         * The ID of the a matching 'Task' is 62.
         **/

        const nodeId = 62;
        generateContextMenuForNodeId(nodeId);
        assert.strictEqual(flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.length, 5);
        assert.strictEqual(
            flameChartView.getMainFlameChart().getContextMenu()?.defaultSection().items.at(4)?.buildDescriptor().label,
            'Reset trace');
        // Check that Reset Trace is disabled
        assert.strictEqual(
            flameChartView.getMainFlameChart()
                .getContextMenu()
                ?.defaultSection()
                .items.at(4)
                ?.buildDescriptor()
                .enabled,
            false);

        flameChartView.getMainFlameChart().modifyTree(TraceEngine.EntriesFilter.FilterAction.MERGE_FUNCTION, nodeId);
        generateContextMenuForNodeId(nodeId);

        // Check that Reset Trace is enabled
        assert.strictEqual(
            flameChartView.getMainFlameChart()
                .getContextMenu()
                ?.defaultSection()
                .items.at(4)
                ?.buildDescriptor()
                .enabled,
            true);
      });

      it('When an entry has URL and is not ignored, correctly show the Add script to ignore list in the Context Menu action',
         async function() {
           const mainThread = getMainThread(traceData.Renderer);
           const entryWithUrl = findFirstEntry(mainThread.entries, entry => {
             // Let's find the first entry with URL.
             return TraceEngine.Types.TraceEvents.isProfileCall(entry) && Boolean(entry.callFrame.url);
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
           const mainThread = getMainThread(traceData.Renderer);
           const entryWithIgnoredUrl = findFirstEntry(mainThread.entries, entry => {
             // Let's find the first entry with URL.
             return TraceEngine.Types.TraceEvents.isProfileCall(entry) && Boolean(entry.callFrame.url);
           });
           Bindings.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(
               (entryWithIgnoredUrl as TraceEngine.Types.TraceEvents.SyntheticProfileCall).callFrame.url as
               Platform.DevToolsPath.UrlString);

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
});
