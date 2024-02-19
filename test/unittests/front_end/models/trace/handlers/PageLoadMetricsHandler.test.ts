// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

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

describeWithEnvironment('PageLoadMetricsHandler', function() {
  describe('contentful paints', () => {
    it('obtains all the FCP and LCP events for all frames', async function() {
      const {Meta, PageLoadMetrics} = await TraceLoader.traceEngine(this, 'multiple-navigations-with-iframes.json.gz');
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

    it('finds the right FCP and LCP events for a trace for a page that was refreshed', async function() {
      const {Meta, PageLoadMetrics} = await TraceLoader.traceEngine(this, 'reload-and-trace-page.json.gz');
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

    it('stores the navigation event as part of the metric', async function() {
      const {Meta, PageLoadMetrics} = await TraceLoader.traceEngine(this, 'reload-and-trace-page.json.gz');
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
  });

  describe('markDOMContent frame', () => {
    it('obtains them and assigns them to the correct frames', async function() {
      const {Meta, PageLoadMetrics} = await TraceLoader.traceEngine(this, 'multiple-navigations-with-iframes.json.gz');
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

  describe('metric scores', () => {
    let allMetricScores: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricScore[];

    function getMetricsByName(name: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName) {
      return allMetricScores.filter(metric => metric.metricName === name);
    }
    function assertMetricNavigationId(
        metric: TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricScore, navigationId: string) {
      assert.strictEqual(metric.navigation?.args.data?.navigationId, navigationId);
    }
    const firstNavigationId = '05059ACF683224E6FC7E344F544A4050';
    const secondNavigationId = '550FC08C662EF691E1535F305CBC0FCA';
    beforeEach(async function() {
      const {PageLoadMetrics, Meta} = await TraceLoader.traceEngine(this, 'multiple-navigations-with-iframes.json.gz');
      const pageLoadMetricsData = PageLoadMetrics.metricScoresByFrameId.get(Meta.mainFrameId);
      if (!pageLoadMetricsData) {
        assert.fail('Page load events for main frame were unexpectedly undefined.');
        return;
      }
      const scoresByMetricName = [...pageLoadMetricsData.values()];
      allMetricScores = scoresByMetricName.flatMap(metricScores => [...metricScores.values()]);
    });
    it('extracts DOMContentLoaded correctly', () => {
      const domContentLoadedMetrics =
          getMetricsByName(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.DCL);
      assert.strictEqual(domContentLoadedMetrics[0].score, '0.03s');
      assert.strictEqual(
          domContentLoadedMetrics[0].classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED);
      assertMetricNavigationId(domContentLoadedMetrics[0], firstNavigationId);

      assert.strictEqual(domContentLoadedMetrics[1].score, '0.04s');
      assert.strictEqual(
          domContentLoadedMetrics[1].classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED);
      assertMetricNavigationId(domContentLoadedMetrics[1], secondNavigationId);
    });

    it('extracts First Contentful Paint correctly', () => {
      const firstContentfulPaints = getMetricsByName(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FCP);
      assert.strictEqual(firstContentfulPaints[0].score, '0.04s');
      assert.strictEqual(
          firstContentfulPaints[0].classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD);
      assertMetricNavigationId(firstContentfulPaints[0], firstNavigationId);

      assert.strictEqual(firstContentfulPaints[1].score, '0.04s');
      assert.strictEqual(
          firstContentfulPaints[1].classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD);
      assertMetricNavigationId(firstContentfulPaints[1], secondNavigationId);
    });

    it('extracts Largest Contentful Paint correctly', () => {
      const firstContentfulPaints = getMetricsByName(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.LCP);
      assert.strictEqual(firstContentfulPaints[0].score, '0.04s');
      assert.strictEqual(
          firstContentfulPaints[0].classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD);
      assertMetricNavigationId(firstContentfulPaints[0], firstNavigationId);

      assert.strictEqual(firstContentfulPaints[1].score, '0.04s');
      assert.strictEqual(
          firstContentfulPaints[1].classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.GOOD);
      assertMetricNavigationId(firstContentfulPaints[1], secondNavigationId);
    });

    it('extracts First Paint correctly', () => {
      const firstContentfulPaints = getMetricsByName(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.FP);
      assert.strictEqual(firstContentfulPaints[0].score, '0.04s');
      assert.strictEqual(
          firstContentfulPaints[0].classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED);
      assertMetricNavigationId(firstContentfulPaints[0], firstNavigationId);

      assert.strictEqual(firstContentfulPaints[1].score, '0.04s');
      assert.strictEqual(
          firstContentfulPaints[1].classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED);
      assertMetricNavigationId(firstContentfulPaints[1], secondNavigationId);
    });

    it('extracts Load correctly', () => {
      const firstContentfulPaints = getMetricsByName(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MetricName.L);
      assert.strictEqual(firstContentfulPaints[0].score, '0.15s');
      assert.strictEqual(
          firstContentfulPaints[0].classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED);
      assertMetricNavigationId(firstContentfulPaints[0], firstNavigationId);

      assert.strictEqual(firstContentfulPaints[1].score, '0.16s');
      assert.strictEqual(
          firstContentfulPaints[1].classification,
          TraceModel.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED);
      assertMetricNavigationId(firstContentfulPaints[1], secondNavigationId);
    });

    it('provides metric scores sorted in ASC order by their events\' timestamps', async function() {
      const {PageLoadMetrics, Meta} = await TraceLoader.traceEngine(this, 'multiple-navigations-with-iframes.json.gz');

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
        assert.isAtLeast(timestamps[i], previousTimestamp);
        previousTimestamp = timestamps[i];
      }
    });
  });

  describe('FLEDGE fenced frames', () => {
    it('is able to parse a trace containing fenced frames without erroring', async function() {
      const {PageLoadMetrics} = await TraceLoader.traceEngine(this, 'fenced-frame-fledge.json.gz');
      assert.strictEqual(PageLoadMetrics.metricScoresByFrameId.size, 3);
    });
  });

  describe('Marker events', () => {
    let mainFrameId: string;
    let allMarkerEvents: TraceModel.Types.TraceEvents.PageLoadEvent[];
    beforeEach(async function() {
      const {PageLoadMetrics, Meta} = await TraceLoader.traceEngine(this, 'multiple-navigations-with-iframes.json.gz');
      mainFrameId = Meta.mainFrameId;
      allMarkerEvents = PageLoadMetrics.allMarkerEvents;
    });
    it('extracts all marker events from a trace correctly', () => {
      for (const metricName of TraceModel.Handlers.ModelHandlers.PageLoadMetrics.MarkerName) {
        const markerEventsOfThisType = allMarkerEvents.filter(event => event.name === metricName);
        // There should be 2 events for each marker and all of them should correspond to the main frame
        assert.strictEqual(markerEventsOfThisType.length, 2);
        assert.isTrue(markerEventsOfThisType.every(
            marker =>
                TraceModel.Handlers.ModelHandlers.PageLoadMetrics.getFrameIdForPageLoadEvent(marker) === mainFrameId));
      }
    });
    it('only marker events are exported in allMarkerEvents', () => {
      for (const marker of allMarkerEvents) {
        assert.isTrue(TraceModel.Handlers.ModelHandlers.PageLoadMetrics.isTraceEventMarkerEvent(marker));
      }
    });

    it('only stores the largest contentful paint with the highest candidate index', async function() {
      const {PageLoadMetrics} = await TraceLoader.traceEngine(this, 'multiple-lcp-main-frame.json.gz');
      const pageLoadMarkers = PageLoadMetrics.allMarkerEvents;
      const largestContentfulPaints =
          pageLoadMarkers.filter(TraceModel.Types.TraceEvents.isTraceEventLargestContentfulPaintCandidate);
      assert.strictEqual(largestContentfulPaints.length, 1);
      assert.strictEqual(largestContentfulPaints[0].args.data?.candidateIndex, 2);
    });
  });
});
