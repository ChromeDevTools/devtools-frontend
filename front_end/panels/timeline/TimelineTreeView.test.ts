// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import {assertScreenshot} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {allThreadEntriesInTrace, renderWidgetInVbox} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';

import * as Timeline from './timeline.js';
import * as Utils from './utils/utils.js';

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  select(_selection: Timeline.TimelineSelection.TimelineSelection|null): void {
  }
  set3PCheckboxDisabled(_disabled: boolean): void {
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
      const firstNode = topNodesIterator.next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(firstNode.event?.name, 'first console time');

      const secondNode = topNodesIterator.next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(secondNode.event?.name, 'third console time');

      const bottomNode = firstNode.children().values().next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(bottomNode.event?.name, 'second console time');
    });

    it('shows instant events as nodes', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const eventTreeView = new Timeline.EventsTimelineTreeView.EventsTimelineTreeView(mockViewDelegate);
      const consoleTimings = [...parsedTrace.UserTimings.performanceMarks];
      eventTreeView.setModelWithEvents(consoleTimings, parsedTrace);
      const tree = eventTreeView.buildTree();
      const topNodesIterator = tree.children().values();
      const firstNode = topNodesIterator.next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(firstNode.event?.name, 'mark1');

      const secondNode = topNodesIterator.next().value as Trace.Extras.TraceTree.Node;
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
      const mapper = new Utils.EntityMapper.EntityMapper(parsedTrace);
      const bottomUpTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const consoleTimings = [...parsedTrace.UserTimings.consoleTimings];
      const startTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);

      // Note: order is important here. The BottomUp view skips updating if it
      // has no parent element (because in the UI it is one of many components
      // in tabs, so we only update it if its visible), so it must be put into
      // the DOM before we set the model.
      renderWidgetInVbox(bottomUpTreeView, {flexAuto: true});
      bottomUpTreeView.setRange(startTime, endTime);
      bottomUpTreeView.setModelWithEvents(consoleTimings, parsedTrace, mapper);

      await RenderCoordinator.done();
      await assertScreenshot('timeline/bottom_up_tree_view.png');

      const tree = bottomUpTreeView.buildTree();
      const topNodesIterator = tree.children().values();
      const firstNode = topNodesIterator.next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(firstNode.event?.name, 'second console time');

      const secondNode = topNodesIterator.next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(secondNode.event?.name, 'first console time');

      const thirdNode = topNodesIterator.next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(thirdNode.event?.name, 'third console time');

      const childNode = firstNode.children().values().next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(childNode.event?.name, 'first console time');
    });
  });

  describe('CallTreeTimelineTreeView', function() {
    it('Creates a call tree from nestable events', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'sync-like-timings.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.CallTreeTimelineTreeView();
      const consoleTimings = [...parsedTrace.UserTimings.consoleTimings];
      const startTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);

      renderWidgetInVbox(callTreeView, {flexAuto: true});
      callTreeView.setRange(startTime, endTime);
      callTreeView.setModelWithEvents(consoleTimings, parsedTrace);

      await RenderCoordinator.done();
      await assertScreenshot('timeline/call_tree_view.png');

      const tree = callTreeView.buildTree();
      const topNodesIterator = tree.children().values();
      const firstNode = topNodesIterator.next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(firstNode.event?.name, 'first console time');

      const secondNode = topNodesIterator.next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(secondNode.event?.name, 'third console time');

      const childNode = firstNode.children().values().next().value as Trace.Extras.TraceTree.Node;
      assert.strictEqual(childNode.event?.name, 'second console time');
    });
  });

  describe('event grouping', function() {
    it('groups events by category in the Call Tree view', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'sync-like-timings.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.CallTreeTimelineTreeView();
      const consoleTimings = [...parsedTrace.UserTimings.consoleTimings];
      const startTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);
      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySetting(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.Category);
      callTreeView.setModelWithEvents(consoleTimings, parsedTrace);
      const tree = callTreeView.buildTree();
      const treeEntries = tree.children().entries();
      const groupEntry = treeEntries.next();
      const nodeName = groupEntry.value![0];
      const node = groupEntry.value![1];
      assert.strictEqual(nodeName, 'scripting');
      assert.strictEqual(callTreeView.displayInfoForGroupNode(node).color, 'rgb(250 204 21 / 100%)');

      assert.isTrue(node.isGroupNode());
      const children = node.children().values();
      assert.strictEqual(children.next().value!.event.name, 'first console time');
      assert.strictEqual(children.next().value!.event.name, 'third console time');
    });
    it('groups events by category in the Bottom up Tree view', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'sync-like-timings.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const consoleTimings = [...parsedTrace.UserTimings.consoleTimings];
      const startTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);
      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySetting(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.Category);
      callTreeView.setModelWithEvents(consoleTimings, parsedTrace);
      const tree = callTreeView.buildTree();
      const treeEntries = tree.children().entries();
      const groupEntry = treeEntries.next();
      const nodeName = groupEntry.value![0];
      const node = groupEntry.value![1];
      assert.strictEqual(nodeName, 'scripting');
      assert.strictEqual(callTreeView.displayInfoForGroupNode(node).color, 'rgb(250 204 21 / 100%)');

      assert.isTrue(node.isGroupNode());
      const children = node.children().values();
      assert.strictEqual(children.next().value!.event.name, 'second console time');
      assert.strictEqual(children.next().value!.event.name, 'first console time');
      assert.strictEqual(children.next().value!.event.name, 'third console time');
    });

    it('can group entries by domain', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const startTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);

      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySetting(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.Domain);
      callTreeView.setModelWithEvents(allThreadEntriesInTrace(parsedTrace), parsedTrace);

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
      const mapper = new Utils.EntityMapper.EntityMapper(parsedTrace);
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const startTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);

      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySetting(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.ThirdParties);
      callTreeView.setModelWithEvents(allThreadEntriesInTrace(parsedTrace), parsedTrace, mapper);

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
        // This is not 'shared-storage-demo-web.app' because the entity is based on the site, the full domain.
        'web.app',
      ]);
    });

    it('can group entries by frame', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const startTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);

      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySetting(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.Frame);
      callTreeView.setModelWithEvents(allThreadEntriesInTrace(parsedTrace), parsedTrace);

      const tree = callTreeView.buildTree();
      const topLevelGroupNodes = Array.from(tree.children().entries());

      assert.deepEqual(topLevelGroupNodes.map(node => node[0]), [
        '25D2F12F1818C70B5BD4325CC9ACD8FF',
        '1094B71EC09B8BD3DD48B77D091D6024',
        '75599398D66E8FE7AAD92D418D92FCE1',
      ]);
    });

    it('can group entries by URL', async function() {
      const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
      const callTreeView = new Timeline.TimelineTreeView.BottomUpTimelineTreeView();
      const startTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
      const endTime = Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.max);

      callTreeView.setRange(startTime, endTime);
      callTreeView.setGroupBySetting(Timeline.TimelineTreeView.AggregatedTimelineTreeView.GroupBy.URL);
      callTreeView.setModelWithEvents(allThreadEntriesInTrace(parsedTrace), parsedTrace);

      const tree = callTreeView.buildTree();
      const topLevelGroupNodes = Array.from(tree.children().entries());

      assert.deepEqual(topLevelGroupNodes.map(node => node[0]), [
        '',
        'https://web.dev/',
        'extensions::SafeBuiltins',
        'chrome-extension://noondiphcddnnabmjcihcjfbhfklnnep/content_script_compiled.js',
        'https://web.dev/css/next.css?v=013a61aa',
        'https://web.dev/fonts/material-icons/regular.woff2',
        'https://web.dev/fonts/google-sans/bold/latin.woff2',
        'https://web.dev/fonts/google-sans/regular/latin.woff2',
        'https://web-dev.imgix.net/image/kheDArv5csY6rvQUJDbWRscckLr1/4i7JstVZvgTFk9dxCe4a.svg',
        'https://web-dev.imgix.net/image/jxu1OdD7LKOGIDU7jURMpSH2lyK2/zrBPJq27O4Hs8haszVnK.svg',
        'https://web-dev.imgix.net/image/jL3OLOhcWUQDnR4XjewLBx4e3PC3/3164So5aDk7vKTkhx9Vm.png?auto=format&w=1140',
        'https://web.dev/js/app.js?v=fedf5fbe',
        'https://web.dev/js/home.js?v=73b0d143',
        'https://web.dev/js/index-7e29abb6.js',
        'https://web.dev/js/index-578d2db7.js',
        'https://web.dev/js/actions-f0eb5c8e.js',
        'https://web.dev/js/index-f45448ab.js',
        'https://www.googletagmanager.com/gtm.js?id=GTM-MZWCJPP',
        'https://www.google-analytics.com/analytics.js',
        'https://www.googletagmanager.com/gtag/js?id=G-18JR3Q8PJ8&l=dataLayer&cx=c',
        'https://www.google-analytics.com/j/collect?v=1&_v=j101&a=68725886&t=event&ni=1&_s=1&dl=https%3A%2F%2Fweb.dev%2F&ul=en-gb&de=UTF-8&dt=web.dev&sd=24-bit&sr=3360x1890&vp=1665x846&je=0&ec=Web%20Vitals&ea=FCP&el=v3-1696581005645-6472407333688&ev=129&_u=QACAAEABAAAAACAAIg~&jid=&gjid=&cid=1874137241.1685438100&tid=UA-126406676-2&_gid=656288571.1696581004&_slc=1&gtm=45He3a40n81MZWCJPP&cd5=15&cd6=navigate&cd7=light&cd8=dom-content-loaded&cd9=8&z=54974500',
        'https://shared-storage-demo-content-producer.web.app/paa/scripts/private-aggregation-test.js',
        'https://shared-storage-demo-content-producer.web.app/paa/scripts/private-aggregation-test.html',
        'https://web.dev/manifest.webmanifest',
        'https://web-dev.imgix.net/image/kheDArv5csY6rvQUJDbWRscckLr1/j1MZvXQ8fY232Q1z5El0.png?auto=format&w=1140',
        'https://web-dev.imgix.net/image/vS06HQ1YTsbMKSFTIPl2iogUQP73/rDnxcd4Rfi3IshxgycTI.jpg?auto=format&w=740',
        'https://web-dev.imgix.net/image/kheDArv5csY6rvQUJDbWRscckLr1/ozivqeizYMb6e6KTwiob.jpg?auto=format&w=1140',
        'https://www.google-analytics.com/collect?v=1&_v=j101&a=68725886&t=event&ni=1&_s=1&dl=https%3A%2F%2Fweb.dev%2F&ul=en-gb&de=UTF-8&dt=web.dev&sd=24-bit&sr=3360x1890&vp=1665x846&je=0&ec=Web%20Vitals&ea=TTFB&el=v3-1696581005645-5774353252376&ev=8&_u=SACAAEABAAAAACAAIg~&jid=&gjid=&cid=1874137241.1685438100&tid=UA-126406676-2&_gid=656288571.1696581004&gtm=45He3a40n81MZWCJPP&cd5=15&cd6=navigate&cd7=light&cd9=8&z=1711200070',
        'https://www.google-analytics.com/collect?v=1&_v=j101&a=68725886&t=pageview&_s=1&dl=https%3A%2F%2Fweb.dev%2F&ul=en-gb&de=UTF-8&dt=web.dev&sd=24-bit&sr=3360x1890&vp=1665x846&je=0&_u=SACAAEABAAAAACAAIg~&jid=&gjid=&cid=1874137241.1685438100&tid=UA-126406676-2&_gid=656288571.1696581004&gtm=45He3a40n81MZWCJPP&cd5=15&cd6=navigate&cd7=light&cd9=8&z=2091175453',
        'https://web-dev.imgix.net/image/SZHNhsfjU9RbCestTGZU6N7JEWs1/VwL892KEz6bakZMlq10D.png?auto=format&w=740',
        'https://web.dev/images/android-chrome-192x192.png',
        'https://web.dev/images/favicon.ico',
        'https://region1.google-analytics.com/g/collect?v=2&tid=G-18JR3Q8PJ8&gtm=45je3a40&_p=68725886&cid=1874137241.1685438100&ul=en-gb&sr=3360x1890&uaa=arm&uab=64&uafvl=Not_A%2520Brand%3B8.0.0.0%7CChromium%3B120.0.6049.0%7CGoogle%2520Chrome%3B120.0.6049.0&uamb=0&uam=&uap=macOS&uapv=13.6.0&uaw=0&are=1&dl=https%3A%2F%2Fweb.dev%2F&dp=&sid=1696581003&sct=2&seg=1&dt=web.dev&_s=1'
      ]);
    });
  });
});
