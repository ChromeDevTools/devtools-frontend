// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Trace from '../../models/trace/trace.js';
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
  selectEntryAtTime(_events: Trace.Types.Events.Event[]|null, _time: number): void {
  }
  highlightEvent(_event: Trace.Types.Events.Event|null): void {
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
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
    flameChartView.setSearchableView(searchableView);
    flameChartView.setModel(parsedTrace);

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
      if (!selection || !Timeline.TimelineSelection.selectionIsEvent(selection)) {
        throw new Error('Selection is not present or not a Trace Event');
      }
      assert.strictEqual(selection.event.name, name);
    }
  });

  it('can search across both flame charts for events', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
    flameChartView.setSearchableView(searchableView);
    flameChartView.setModel(parsedTrace);

    const searchQuery = 'app.js';
    const searchConfig =
        new UI.SearchableView.SearchConfig(/* query */ searchQuery, /* caseSensitive */ false, /* isRegex */ false);
    flameChartView.performSearch(searchConfig, true);

    const results = flameChartView.getSearchResults();
    assert.isOk(results);
    assert.lengthOf(results, 6);
    // We should have 5 results from the main provider, and 1 from the network
    assert.lengthOf(results.filter(r => r.provider === 'main'), 5);
    assert.lengthOf(results.filter(r => r.provider === 'network'), 1);
  });

  // This test is still failing after bumping up the timeout to 20 seconds. So
  // skip it while we work on a fix for the trace load speed.
  it.skip('[crbug.com/1492405] Shows the network track correctly', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(parsedTrace);

    assert.isTrue(flameChartView.isNetworkTrackShownForTests());
  });

  it('Does not show the network track when there is no network request', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'basic.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(parsedTrace);

    assert.isFalse(flameChartView.isNetworkTrackShownForTests());
  });

  it('Adds Hidden Descendants Arrow as a decoration when a Context Menu action is applied on a node', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(parsedTrace);

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
      const childrenAmount = parsedTrace.Renderer.entryToNode.get(node as Trace.Types.Events.Event)?.children.length;
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
  });

  it('Adds Hidden Descendants Arrow as a decoration when a Context Menu action is applied on a selected node with a key shortcut event',
     async function() {
       const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
       const mockViewDelegate = new MockViewDelegate();

       const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
       flameChartView.setModel(parsedTrace);

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
         const childrenAmount = parsedTrace.Renderer.entryToNode.get(node as Trace.Types.Events.Event)?.children.length;
         if (!childrenAmount) {
           return false;
         }
         return childrenAmount > 0 && node.cat === 'devtools.timeline';
       });
       const node = parsedTrace.Renderer.entryToNode.get(firstNodeWithChildren as Trace.Types.Events.Event);
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
       const {parsedTrace} = await TraceLoader.traceEngine(this, 'load-simple.json.gz');
       const mockViewDelegate = new MockViewDelegate();

       const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
       flameChartView.setModel(parsedTrace);
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
         const childrenAmount = parsedTrace.Renderer.entryToNode.get(node as Trace.Types.Events.Event)?.children.length;
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
     });

  describe('Context Menu', function() {
    let flameChartView: Timeline.TimelineFlameChartView.TimelineFlameChartView;
    let parsedTrace: Trace.Handlers.Types.ParsedTrace;

    this.beforeEach(async () => {
      ({parsedTrace} = await TraceLoader.traceEngine(this, 'recursive-blocking-js.json.gz'));
      const mockViewDelegate = new MockViewDelegate();

      flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      flameChartView.setModel(parsedTrace);
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

        flameChartView.getMainFlameChart().modifyTree(PerfUI.FlameChart.FilterAction.MERGE_FUNCTION, nodeId);
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
           Bindings.IgnoreListManager.IgnoreListManager.instance().ignoreListURL(
               (entryWithIgnoredUrl as Trace.Types.Events.SyntheticProfileCall).callFrame.url as
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

  describe('Link between entries annotation in progress', function() {
    let flameChartView: Timeline.TimelineFlameChartView.TimelineFlameChartView;
    let parsedTrace: Trace.Handlers.Types.ParsedTrace;

    this.beforeEach(async () => {
      ({parsedTrace} = await TraceLoader.traceEngine(this, 'recursive-blocking-js.json.gz'));
      const mockViewDelegate = new MockViewDelegate();

      flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
      flameChartView.setModel(parsedTrace);
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
