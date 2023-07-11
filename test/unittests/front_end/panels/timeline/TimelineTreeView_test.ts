// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

const {assert} = chai;

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  select(_selection: Timeline.TimelineSelection.TimelineSelection|null): void {
  }
  selectEntryAtTime(_events: TraceEngine.Legacy.CompatibleTraceEvent[]|null, _time: number): void {
  }
  highlightEvent(_event: TraceEngine.Legacy.CompatibleTraceEvent|null): void {
  }
}

describeWithEnvironment('TimelineTreeView', function() {
  const mockViewDelegate = new MockViewDelegate();
  describe('EventsTimelineTreeView', function() {
    it('Creates a tree from nestable async events', async function() {
      const data = await TraceLoader.allModels(this, 'sync-like-timings.json.gz');
      const eventTreeView = new Timeline.EventsTimelineTreeView.EventsTimelineTreeView(mockViewDelegate);
      const consoleTimings = [...data.traceParsedData.UserTimings.consoleTimings];
      eventTreeView.setModelWithEvents(data.performanceModel, consoleTimings, data.traceParsedData);
      const tree = eventTreeView.buildTree();
      const topNodesIterator = tree.children().values();
      const firstNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(firstNode.event?.name, 'first console time');

      const secondNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(secondNode.event?.name, 'third console time');

      const bottomNode = firstNode.children().values().next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(bottomNode.event?.name, 'second console time');
    });
    it('shows instant events as nodes', async function() {
      const data = await TraceLoader.allModels(this, 'user-timings.json.gz');
      const eventTreeView = new Timeline.EventsTimelineTreeView.EventsTimelineTreeView(mockViewDelegate);
      const consoleTimings = [...data.traceParsedData.UserTimings.performanceMarks];
      eventTreeView.setModelWithEvents(data.performanceModel, consoleTimings, data.traceParsedData);
      const tree = eventTreeView.buildTree();
      const topNodesIterator = tree.children().values();
      const firstNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(firstNode.event?.name, 'mark1');

      const secondNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(secondNode.event?.name, 'mark3');
    });
  });
  describe('BottomUpTimelineTreeView', function() {
    it('Creates a bottom up tree from nestable events', async function() {
      const data = await TraceLoader.allModels(this, 'sync-like-timings.json.gz');
      const bottomUpTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const consoleTimings = [...data.traceParsedData.UserTimings.consoleTimings];
      const startTime =
          TraceEngine.Helpers.Timing.microSecondsToMilliseconds(data.traceParsedData.Meta.traceBounds.min);
      const endTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(data.traceParsedData.Meta.traceBounds.max);
      bottomUpTreeView.setRange(startTime, endTime);
      bottomUpTreeView.setModelWithEvents(data.performanceModel, consoleTimings, data.traceParsedData);

      const tree = bottomUpTreeView.buildTree();
      const topNodesIterator = tree.children().values();
      const firstNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(firstNode.event?.name, 'second console time');

      const secondNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(secondNode.event?.name, 'first console time');

      const thirdNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(thirdNode.event?.name, 'third console time');

      const childNode = firstNode.children().values().next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(childNode.event?.name, 'first console time');
    });
  });
  describe('CallTreeTimelineTreeView', function() {
    it('Creates a call tree from nestable events', async function() {
      const data = await TraceLoader.allModels(this, 'sync-like-timings.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.CallTreeTimelineTreeView();
      const consoleTimings = [...data.traceParsedData.UserTimings.consoleTimings];
      const startTime =
          TraceEngine.Helpers.Timing.microSecondsToMilliseconds(data.traceParsedData.Meta.traceBounds.min);
      const endTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(data.traceParsedData.Meta.traceBounds.max);
      callTreeView.setRange(startTime, endTime);
      callTreeView.setModelWithEvents(data.performanceModel, consoleTimings, data.traceParsedData);

      const tree = callTreeView.buildTree();
      const topNodesIterator = tree.children().values();
      const firstNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(firstNode.event?.name, 'first console time');

      const secondNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(secondNode.event?.name, 'third console time');

      const childNode = firstNode.children().values().next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(childNode.event?.name, 'second console time');
    });
  });
  describe('event groupping', function() {
    it('groups events by category in the Call Tree view', async function() {
      const data = await TraceLoader.allModels(this, 'sync-like-timings.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.CallTreeTimelineTreeView();
      const consoleTimings = [...data.traceParsedData.UserTimings.consoleTimings];
      const startTime =
          TraceEngine.Helpers.Timing.microSecondsToMilliseconds(data.traceParsedData.Meta.traceBounds.min);
      const endTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(data.traceParsedData.Meta.traceBounds.max);
      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySettingForTests(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.Category);
      callTreeView.setModelWithEvents(data.performanceModel, consoleTimings, data.traceParsedData);
      const tree = callTreeView.buildTree();
      const treeEntries = tree.children().entries();
      const groupEntry = treeEntries.next();
      assert.strictEqual(groupEntry.value[0], 'scripting');
      assert.isTrue(groupEntry.value[1].isGroupNode());
      const children = groupEntry.value[1].children().values();
      assert.strictEqual(children.next().value.event.name, 'first console time');
      assert.strictEqual(children.next().value.event.name, 'third console time');
    });
    it('groups events by category in the Call Tree view', async function() {
      const data = await TraceLoader.allModels(this, 'sync-like-timings.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const consoleTimings = [...data.traceParsedData.UserTimings.consoleTimings];
      const startTime =
          TraceEngine.Helpers.Timing.microSecondsToMilliseconds(data.traceParsedData.Meta.traceBounds.min);
      const endTime = TraceEngine.Helpers.Timing.microSecondsToMilliseconds(data.traceParsedData.Meta.traceBounds.max);
      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySettingForTests(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.Category);
      callTreeView.setModelWithEvents(data.performanceModel, consoleTimings, data.traceParsedData);
      const tree = callTreeView.buildTree();
      const treeEntries = tree.children().entries();
      const groupEntry = treeEntries.next();
      assert.strictEqual(groupEntry.value[0], 'scripting');
      assert.isTrue(groupEntry.value[1].isGroupNode());
      const children = groupEntry.value[1].children().values();
      assert.strictEqual(children.next().value.event.name, 'second console time');
      assert.strictEqual(children.next().value.event.name, 'first console time');
      assert.strictEqual(children.next().value.event.name, 'third console time');
    });
  });
});
