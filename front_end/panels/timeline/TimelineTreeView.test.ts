// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  select(_selection: Timeline.TimelineSelection.TimelineSelection|null): void {
  }
  selectEntryAtTime(_events: Trace.Types.Events.Event[]|null, _time: number): void {
  }
  highlightEvent(_event: Trace.Types.Events.Event|null): void {
  }
  element = document.createElement('div');
}

describeWithEnvironment('TimelineTreeView', function() {
  const mockViewDelegate = new MockViewDelegate();

  describe('EventsTimelineTreeView', function() {
    afterEach(() => {
      // One of the unit tests changes this, so ensure it gets set back after the test.
      Timeline.TimelineUIUtils.TimelineUIUtils.categories().scripting.hidden = false;
    });

    it('Creates a tree from nestable async events', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'sync-like-timings.json.gz');
      const eventTreeView = new Timeline.EventsTimelineTreeView.EventsTimelineTreeView(mockViewDelegate);
      const consoleTimings = [...parsedTrace.UserTimings.consoleTimings];
      eventTreeView.setModelWithEvents(consoleTimings, parsedTrace);
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
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const eventTreeView = new Timeline.EventsTimelineTreeView.EventsTimelineTreeView(mockViewDelegate);
      const consoleTimings = [...parsedTrace.UserTimings.performanceMarks];
      eventTreeView.setModelWithEvents(consoleTimings, parsedTrace);
      const tree = eventTreeView.buildTree();
      const topNodesIterator = tree.children().values();
      const firstNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(firstNode.event?.name, 'mark1');

      const secondNode = topNodesIterator.next().value as TimelineModel.TimelineProfileTree.Node;
      assert.strictEqual(secondNode.event?.name, 'mark3');
    });

    it('can filter events by text', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const eventTreeView = new Timeline.EventsTimelineTreeView.EventsTimelineTreeView(mockViewDelegate);
      const consoleTimings = [...parsedTrace.UserTimings.performanceMarks];
      eventTreeView.setModelWithEvents(consoleTimings, parsedTrace);
      let tree = eventTreeView.buildTree();
      const topLevelChildren = Array.from(tree.children().values(), childNode => {
        return childNode.event?.name || 'NO_EVENT_FOR_NODE';
      });
      assert.deepEqual(topLevelChildren, ['mark1', 'mark3']);
      eventTreeView.textFilterUI?.setValue('mark1', true);
      tree = eventTreeView.buildTree();
      const newTopLevelChildren = Array.from(tree.children().values(), childNode => {
        return childNode.event?.name || 'NO_EVENT_FOR_NODE';
      });
      assert.deepEqual(newTopLevelChildren, ['mark1']);
    });

    it('can filter and hide entire categories', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const eventTreeView = new Timeline.EventsTimelineTreeView.EventsTimelineTreeView(mockViewDelegate);
      const performanceTimingEvents = [...parsedTrace.UserTimings.performanceMeasures];
      eventTreeView.setModelWithEvents(performanceTimingEvents, parsedTrace);
      let tree = eventTreeView.buildTree();
      const topLevelChildren = Array.from(tree.children().values(), childNode => {
        return childNode.event?.name || 'NO_EVENT_FOR_NODE';
      });
      assert.deepEqual(topLevelChildren, ['second measure', 'third measure']);
      // Now make the scripting category hidden and tell the treeview to re-render.
      Timeline.TimelineUIUtils.TimelineUIUtils.categories().scripting.hidden = true;
      eventTreeView.refreshTree();
      tree = eventTreeView.buildTree();
      const newTopLevelChildren = Array.from(tree.children().values(), childNode => {
        return childNode.event?.name || 'NO_EVENT_FOR_NODE';
      });
      assert.deepEqual(newTopLevelChildren, []);
    });
  });

  describe('BottomUpTimelineTreeView', function() {
    it('Creates a bottom up tree from nestable events', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'sync-like-timings.json.gz');
      const bottomUpTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const consoleTimings = [...parsedTrace.UserTimings.consoleTimings];
      const startTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);
      bottomUpTreeView.setRange(startTime, endTime);
      bottomUpTreeView.setModelWithEvents(consoleTimings, parsedTrace);

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
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'sync-like-timings.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.CallTreeTimelineTreeView();
      const consoleTimings = [...parsedTrace.UserTimings.consoleTimings];
      const startTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);
      callTreeView.setRange(startTime, endTime);
      callTreeView.setModelWithEvents(consoleTimings, parsedTrace);

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

  describe('event grouping', function() {
    it('groups events by category in the Call Tree view', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'sync-like-timings.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.CallTreeTimelineTreeView();
      const consoleTimings = [...parsedTrace.UserTimings.consoleTimings];
      const startTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);
      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySettingForTests(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.Category);
      callTreeView.setModelWithEvents(consoleTimings, parsedTrace);
      const tree = callTreeView.buildTree();
      const treeEntries = tree.children().entries();
      const groupEntry = treeEntries.next();
      const nodeName = groupEntry.value[0];
      const node = groupEntry.value[1];
      assert.strictEqual(nodeName, 'scripting');
      assert.strictEqual(callTreeView.displayInfoForGroupNode(node).color, 'rgb(250 204 21 / 100%)');

      assert.isTrue(node.isGroupNode());
      const children = node.children().values();
      assert.strictEqual(children.next().value.event.name, 'first console time');
      assert.strictEqual(children.next().value.event.name, 'third console time');
    });
    it('groups events by category in the Bottom up Tree view', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'sync-like-timings.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const consoleTimings = [...parsedTrace.UserTimings.consoleTimings];
      const startTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);
      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySettingForTests(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.Category);
      callTreeView.setModelWithEvents(consoleTimings, parsedTrace);
      const tree = callTreeView.buildTree();
      const treeEntries = tree.children().entries();
      const groupEntry = treeEntries.next();
      const nodeName = groupEntry.value[0];
      const node = groupEntry.value[1];
      assert.strictEqual(nodeName, 'scripting');
      assert.strictEqual(callTreeView.displayInfoForGroupNode(node).color, 'rgb(250 204 21 / 100%)');

      assert.isTrue(node.isGroupNode());
      const children = node.children().values();
      assert.strictEqual(children.next().value.event.name, 'second console time');
      assert.strictEqual(children.next().value.event.name, 'first console time');
      assert.strictEqual(children.next().value.event.name, 'third console time');
    });

    it('can group entries by domain', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const startTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);

      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySettingForTests(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.Domain);
      callTreeView.setModelWithEvents(parsedTrace.Renderer.allTraceEntries, parsedTrace);

      const tree = callTreeView.buildTree();
      const topLevelGroupNodes = Array.from(tree.children().entries());

      assert.deepEqual(topLevelGroupNodes.map(node => node[0]), [
        '',
        'web.dev',
        'extensions::',
        'chrome-extension://noondiphcddnnabmjcihcjfbhfklnnep',
        'imgix.net',
        'googletagmanager.com',
        'google-analytics.com',
        'web.app',
      ]);
    });

    it('can group entries by third parties', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const startTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);

      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySettingForTests(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.ThirdParties);
      callTreeView.setModelWithEvents(parsedTrace.Renderer.allTraceEntries, parsedTrace);

      const tree = callTreeView.buildTree();
      const topLevelGroupNodes = Array.from(tree.children().entries());

      assert.deepEqual(topLevelGroupNodes.map(node => node[0]), [
        '',
        'web.dev',
        'extensions::',
        'chrome-extension://noondiphcddnnabmjcihcjfbhfklnnep',
        'imgix',
        'Google Tag Manager',
        'Google Analytics',
        'shared-storage-demo-content-producer.web.app',
      ]);
    });

    it('can group entries by frame', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const startTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);

      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySettingForTests(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.Frame);
      callTreeView.setModelWithEvents(parsedTrace.Renderer.allTraceEntries, parsedTrace);

      const tree = callTreeView.buildTree();
      const topLevelGroupNodes = Array.from(tree.children().entries());

      assert.deepEqual(topLevelGroupNodes.map(node => node[0]), [
        '25D2F12F1818C70B5BD4325CC9ACD8FF',
        '1094B71EC09B8BD3DD48B77D091D6024',
      ]);
    });

    it('can group entries by URL', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const startTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.max);

      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySettingForTests(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.URL);
      callTreeView.setModelWithEvents(parsedTrace.Renderer.allTraceEntries, parsedTrace);

      const tree = callTreeView.buildTree();
      const topLevelGroupNodes = Array.from(tree.children().entries());

      assert.deepEqual(topLevelGroupNodes.map(node => node[0]), [
        '',  // Represents "Unattributed" in the UI
        'https://web.dev/',
        'extensions::SafeBuiltins',
        'chrome-extension://noondiphcddnnabmjcihcjfbhfklnnep/content_script_compiled.js',
        'https://web-dev.imgix.net/image/kheDArv5csY6rvQUJDbWRscckLr1/4i7JstVZvgTFk9dxCe4a.svg',
        'https://web.dev/js/home.js?v=73b0d143',
        'https://web.dev/js/actions-f0eb5c8e.js',
        'https://web.dev/js/app.js?v=fedf5fbe',
        'https://web.dev/js/index-f45448ab.js',
        'https://web.dev/js/index-7e29abb6.js',
        'https://www.googletagmanager.com/gtm.js?id=GTM-MZWCJPP',
        'https://www.google-analytics.com/analytics.js',
        'https://www.googletagmanager.com/gtag/js?id=G-18JR3Q8PJ8&l=dataLayer&cx=c',
        'https://www.google-analytics.com/j/collect?v=1&_v=j101&a=68725886&t=event&ni=1&_s=1&dl=https%3A%2F%2Fweb.dev%2F&ul=en-gb&de=UTF-8&dt=web.dev&sd=24-bit&sr=3360x1890&vp=1665x846&je=0&ec=Web%20Vitals&ea=FCP&el=v3-1696581005645-6472407333688&ev=129&_u=QACAAEABAAAAACAAIg~&jid=&gjid=&cid=1874137241.1685438100&tid=UA-126406676-2&_gid=656288571.1696581004&_slc=1&gtm=45He3a40n81MZWCJPP&cd5=15&cd6=navigate&cd7=light&cd8=dom-content-loaded&cd9=8&z=54974500',
        'https://shared-storage-demo-content-producer.web.app/paa/scripts/private-aggregation-test.js',
        'https://shared-storage-demo-content-producer.web.app/paa/scripts/private-aggregation-test.html',
        'https://web-dev.imgix.net/image/SZHNhsfjU9RbCestTGZU6N7JEWs1/VwL892KEz6bakZMlq10D.png?auto=format&w=740',
      ]);
    });
  });
});
