// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../../helpers/MockConnection.js';
import {createTarget} from '../../../helpers/EnvironmentHelpers.js';
import type * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import {loadModelDataFromTraceFile} from '../../../helpers/TraceHelpers.js';

function countMetricOcurrences(
    scoresByMetricName:
        Map<TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName,
            TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricScore>[],
    metricName: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName): number {
  return scoresByMetricName.reduce((acc, val) => {
    if (val.get(metricName)) {
      return acc + 1;
    }
    return acc;
  }, 0);
}

// Need the mock connection to fake the communication to the backend to fetch DOM Nodes.
describeWithMockConnection('PageLoadMetricsHandler', () => {
  describe('contentful paints', () => {
    it('obtains all the FCP and LCP events for all frames', async () => {
      const {Meta, PageLoadMetrics} = await loadModelDataFromTraceFile('multiple-navigations-with-iframes.json.gz');
      const {mainFrameId} = Meta;
      const pageLoadMetricsData = PageLoadMetrics.metricScoresByFrameId;
      assert.strictEqual(pageLoadMetricsData.size, 3);

      const pageLoadEventsForMainFrame = pageLoadMetricsData.get(mainFrameId);
      if (!pageLoadEventsForMainFrame) {
        assert.fail('Page load events for main frame were unexpectedly null.');
        return;
      }

      // There are 2 FCP events and 2 LCP events on the main frame: one for the first navigation,
      // and one for the second.
      assert.strictEqual(pageLoadEventsForMainFrame.size, 2);
      const scoresByMetricName = [...pageLoadEventsForMainFrame.values()];

      const fcpCount =
          countMetricOcurrences(scoresByMetricName, TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP);

      const lcpCount =
          countMetricOcurrences(scoresByMetricName, TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);

      assert.strictEqual(fcpCount, 2);
      assert.strictEqual(lcpCount, 2);
    });

    it('finds the right FCP and LCP events for a trace for a page that was refreshed', async () => {
      const {Meta, PageLoadMetrics} = await loadModelDataFromTraceFile('reload-and-trace-page.json.gz');
      const {mainFrameId} = Meta;
      const pageLoadMetricsData = PageLoadMetrics.metricScoresByFrameId;
      // Only one frame to deal with
      assert.strictEqual(pageLoadMetricsData.size, 1);

      const pageLoadEventsForMainFrame = pageLoadMetricsData.get(mainFrameId);
      if (!pageLoadEventsForMainFrame) {
        assert.fail('Page load events for main frame were unexpectedly null.');
        return;
      }
      // Single FCP event that occured after the refresh.
      assert.strictEqual(pageLoadEventsForMainFrame.size, 1);
      const scoresByMetricName = [...pageLoadEventsForMainFrame.values()];
      const fcpCount =
          countMetricOcurrences(scoresByMetricName, TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP);
      const lcpCount =
          countMetricOcurrences(scoresByMetricName, TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);
      assert.strictEqual(fcpCount, 1);
      assert.strictEqual(lcpCount, 1);
    });

    it('stores the navigation event as part of the metric', async () => {
      const {Meta, PageLoadMetrics} = await loadModelDataFromTraceFile('reload-and-trace-page.json.gz');
      const {mainFrameId, navigationsByFrameId} = Meta;
      const navigationBeforeMetrics = navigationsByFrameId.get(mainFrameId)?.[0];
      const navigationId = navigationBeforeMetrics?.args.data?.navigationId;
      if (!navigationBeforeMetrics || !navigationId) {
        assert.fail('Could not find expected navigation event or its navigation ID');
        return;
      }
      const pageLoadMetricsData = PageLoadMetrics.metricScoresByFrameId;
      // Only one frame to deal with
      assert.strictEqual(pageLoadMetricsData.size, 1);

      const pageLoadEventsForMainFrame = pageLoadMetricsData.get(mainFrameId);
      if (!pageLoadEventsForMainFrame) {
        assert.fail('Page load events for main frame were unexpectedly null.');
        return;
      }
      // Single FCP event that occured after the refresh.
      assert.strictEqual(pageLoadEventsForMainFrame.size, 1);
      const events = pageLoadEventsForMainFrame.get(navigationId);
      const allFoundMetricScoresForMainFrame = events ? Array.from(events.values()) : [];
      for (const score of allFoundMetricScoresForMainFrame) {
        assert.strictEqual(score.navigation, navigationBeforeMetrics);
      }
    });

    it('fetches DOM Nodes from the backend for all LCP events', async () => {
      const target = createTarget();
      const domModel = target.model(SDK.DOMModel.DOMModel);
      if (!domModel) {
        assert.fail('DOM model not found.');
        return;
      }
      const documentNode = {nodeId: 1 as Protocol.DOM.NodeId};
      const domNode = new SDK.DOMModel.DOMNode(domModel);
      domNode.id = 125 as Protocol.DOM.NodeId;  // 125 is the node from the trace file for the LCP event.

      // Set related CDP methods responses to return our mock document and node.
      setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNode.id]}));
      setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));

      // Register the mock document and node in DOMModel, these use the mock responses set above.
      await domModel.requestDocument();
      domModel.registerNode(domNode);

      const {PageLoadMetrics, Meta} = await loadModelDataFromTraceFile('lcp-images.json.gz');
      const pageLoadEventsForMainFrame = PageLoadMetrics.metricScoresByFrameId.get(Meta.mainFrameId);
      if (!pageLoadEventsForMainFrame) {
        assert.fail('Page load events for main frame were unexpectedly null.');
        return;
      }
      const allLCPMetrics = Array.from(pageLoadEventsForMainFrame.values()).map(eventMap => {
        return eventMap.get(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);
      });

      for (const metric of allLCPMetrics) {
        if (metric && metric.event &&
            TraceModel.Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate(metric.event) &&
            metric.event.args.data) {
          const matchingDOMNode = PageLoadMetrics.lcpEventNodeIdToDOMNodeMap.get(metric.event.args.data?.nodeId);
          assert.isNotNull(matchingDOMNode, 'Did not find expected DOM node for LCP event');
        }
      }
    });
  });

  describe('markDOMContent frame', () => {
    it('obtains them and assigns them to the correct frames', async () => {
      const {Meta, PageLoadMetrics} = await loadModelDataFromTraceFile('multiple-navigations-with-iframes.json.gz');
      const {mainFrameId} = Meta;
      const pageLoadMetricsData = PageLoadMetrics.metricScoresByFrameId;
      // We expect 3 frames: main frame, and two iframes.
      assert.strictEqual(pageLoadMetricsData.size, 3);
      const pageLoadEventsForMainFrame = pageLoadMetricsData.get(mainFrameId);
      if (!pageLoadEventsForMainFrame) {
        assert.fail('Page load events for main frame were unexpectedly null.');
        return;
      }
      // There are 2 MarkDOMContent events on the main frame: one for the first navigation,
      // and one for the second.
      assert.strictEqual(pageLoadEventsForMainFrame.size, 2);
      const dclCount = countMetricOcurrences(
          [...pageLoadEventsForMainFrame.values()], TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL);
      assert.strictEqual(dclCount, 2);
    });
  });

  describe('Time To Interactive', () => {
    it('extracts TBT from InteractiveTime events correctly', async () => {
      const {Meta, PageLoadMetrics} = await loadModelDataFromTraceFile('interactive-time.json.gz');
      const {mainFrameId} = Meta;
      const pageLoadEventsForMainFrame = PageLoadMetrics.metricScoresByFrameId.get(mainFrameId);
      if (!pageLoadEventsForMainFrame) {
        assert.fail('Page load events for main frame were unexpectedly null.');
        return;
      }
      const navigationId = pageLoadEventsForMainFrame.keys().next().value;
      const metrics = pageLoadEventsForMainFrame.get(navigationId);

      // TTI should exist, compare its values.
      const tti = metrics?.get(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.TTI);
      assert.strictEqual(tti?.score, '0.19s');
      assert.strictEqual(
          tti?.classification, TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD);

      const totalBlockingTime = metrics?.get(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.TBT);
      assert.strictEqual(totalBlockingTime?.score, '4.33ms');
      assert.strictEqual(
          totalBlockingTime?.classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD);
    });
    it('estimates correctly the TBT for a trace without InteractiveTime', async () => {
      const {Meta, PageLoadMetrics} = await loadModelDataFromTraceFile('reload-no-tti.json.gz');
      const {mainFrameId} = Meta;
      const pageLoadEventsForMainFrame = PageLoadMetrics.metricScoresByFrameId.get(mainFrameId);
      if (!pageLoadEventsForMainFrame) {
        assert.fail('Page load events for main frame were unexpectedly null.');
        return;
      }
      const navigationId = pageLoadEventsForMainFrame.keys().next().value;
      const metrics = pageLoadEventsForMainFrame.get(navigationId);

      // TTI should not exist.
      const tti = metrics?.get(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.TTI);
      assert.isUndefined(tti);

      const totalBlockingTime = metrics?.get(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.TBT);
      assert.isTrue(totalBlockingTime?.estimated);
      assert.strictEqual(totalBlockingTime?.score, '7.33ms');
      assert.strictEqual(
          totalBlockingTime?.classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD);
    });
  });

  describe('metric scores', () => {
    it('calculates metric scores correctly for a trace with multiple navigations and assigns the correct navigations',
       async () => {
         const firstNavigationId = '05059ACF683224E6FC7E344F544A4050';
         const secondNavigationId = '550FC08C662EF691E1535F305CBC0FCA';

         const firstNavigationDCL = {
           score: '0.03s',
           metricName: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL,
           classification: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED,
         };
         const secondNavigationDCL = {
           score: '0.04s',
           metricName: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL,
           classification: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED,
         };

         // both TBT events in this trace are identical
         const tbtEvent = {
           score: '0ms',
           estimated: true,
           metricName: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.TBT,
           classification: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD,
         };

         // Both navigations have the same fcp and lcp score
         const fcpScore = {
           classification: 'good',
           metricName: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP,
           score: '0.04s',
         };
         const lcpScore = {
           classification: 'good',
           metricName: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP,
           score: '0.04s',
         };

         const expectedResults =
             [firstNavigationDCL, fcpScore, lcpScore, tbtEvent, secondNavigationDCL, fcpScore, lcpScore, tbtEvent] as
             TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricScore[];

         const {PageLoadMetrics, Meta} = await loadModelDataFromTraceFile('multiple-navigations-with-iframes.json.gz');

         const pageLoadMetricsData = PageLoadMetrics.metricScoresByFrameId.get(Meta.mainFrameId);
         if (!pageLoadMetricsData) {
           assert.fail('Page load events for main frame were unexpectedly null.');
           return;
         }

         const scoresByMetricName = [...pageLoadMetricsData.values()];
         const flatResults = scoresByMetricName.flatMap(metricScores => [...metricScores.values()]);
         const metricScoresWithoutEventAndNavigations = [];
         for (const metricScore of flatResults) {
           // In order to compare the metrics with the expected results, we delete the
           // event field and navigation in every metric. Those are dealt with in separate assertions.
           const newScore: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricScore = {
             metricName: metricScore.metricName,
             score: metricScore.score,
             classification: metricScore.classification,
           };
           if ('estimated' in metricScore) {
             newScore.estimated = metricScore.estimated;
           }
           metricScoresWithoutEventAndNavigations.push(newScore);
         }
         assert.deepEqual(metricScoresWithoutEventAndNavigations, expectedResults);

         const metricNamesAndNavigationIds =
             flatResults.map(metricScore => ({
                               name: metricScore.metricName,
                               navigationId: metricScore.navigation?.args.data?.navigationId,
                             }));
         assert.deepEqual(metricNamesAndNavigationIds, [
           {name: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL, navigationId: firstNavigationId},
           {name: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP, navigationId: firstNavigationId},
           {name: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP, navigationId: firstNavigationId},
           {name: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.TBT, navigationId: firstNavigationId},
           {name: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL, navigationId: secondNavigationId},
           {name: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP, navigationId: secondNavigationId},
           {name: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP, navigationId: secondNavigationId},
           {name: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.TBT, navigationId: secondNavigationId},
         ]);
       });

    it('provides metric scores sorted in ASC order by their events\' timestamps', async () => {
      const {PageLoadMetrics, Meta} = await loadModelDataFromTraceFile('multiple-navigations-with-iframes.json.gz');

      const pageLoadMetricsData = PageLoadMetrics.metricScoresByFrameId.get(Meta.mainFrameId);
      if (!pageLoadMetricsData) {
        assert.fail('Page load events for main frame were unexpectedly null.');
        return;
      }

      const scoresByMetricName = [...pageLoadMetricsData.values()];
      const flatResults = scoresByMetricName.map(metricScores => [...metricScores.values()])
                              .reduce((acc, metricScore) => acc.concat(metricScore), []);
      const timestamps = [];
      for (const metricScore of flatResults) {
        if (metricScore.event) {
          timestamps.push(metricScore.event.ts);
        }
      }
      let previousTimestamp = timestamps[0];
      for (let i = 1; i < timestamps.length; i++) {
        assert.isAbove(timestamps[i], previousTimestamp);
        previousTimestamp = timestamps[i];
      }
    });
  });
});
