// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

async function processTrace(context: Mocha.Suite|Mocha.Context|null, url: string): Promise<void> {
  TraceModel.Handlers.ModelHandlers.Meta.reset();
  TraceModel.Handlers.ModelHandlers.Meta.initialize();

  TraceModel.Handlers.ModelHandlers.LayoutShifts.reset();
  TraceModel.Handlers.ModelHandlers.LayoutShifts.initialize();

  try {
    const events = await TraceLoader.rawEvents(context, url);
    for (const event of events) {
      TraceModel.Handlers.ModelHandlers.Meta.handleEvent(event);
      TraceModel.Handlers.ModelHandlers.Screenshots.handleEvent(event);
      TraceModel.Handlers.ModelHandlers.LayoutShifts.handleEvent(event);
    }
  } catch (error) {
    assert.fail(error);
  }
  await TraceModel.Handlers.ModelHandlers.Meta.finalize();
  await TraceModel.Handlers.ModelHandlers.Screenshots.finalize();
  await TraceModel.Handlers.ModelHandlers.LayoutShifts.finalize();
}

describe('LayoutShiftsHandler', function() {
  beforeEach(async () => {
    // The layout shifts handler stores by process, so to make life easier we
    // run the meta handler here, too, so that later on we can get the IDs of
    // the main renderer process and thread.
    TraceModel.Handlers.ModelHandlers.Meta.reset();
    TraceModel.Handlers.ModelHandlers.Meta.initialize();

    TraceModel.Handlers.ModelHandlers.LayoutShifts.reset();
  });

  it('clusters a single frame correctly', async function() {
    await processTrace(this, 'cls-single-frame.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    assert.strictEqual(layoutShifts.clusters.length, 1);
    assert.strictEqual(layoutShifts.clusters[0].clusterCumulativeScore, 0.29522728495836237);
  });

  it('creates a cluster after the maximum time gap between shifts', async function() {
    await processTrace(this, 'cls-cluster-max-timeout.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    assert.strictEqual(layoutShifts.clusters.length, 3);
    // The first cluster should end because the maximum time gap between
    // shifts ends, and thus the time between the last shift and the window
    // end should be exactly MAX_SHIFT_TIME_DELTA;
    const firstCluster = layoutShifts.clusters[0];
    const firstClusterEvents = layoutShifts.clusters[0].events;

    assert.strictEqual(
        firstCluster.clusterWindow.max - firstClusterEvents[firstClusterEvents.length - 1].ts,
        TraceModel.Handlers.ModelHandlers.LayoutShifts.MAX_SHIFT_TIME_DELTA);

    // There are seven shifts in quick succession in the first cluster,
    // only one shift in the second cluster and only one shift in the
    // third cluster.
    assert.strictEqual(layoutShifts.clusters[0].events.length, 7);
    assert.strictEqual(layoutShifts.clusters[1].events.length, 1);
    assert.strictEqual(layoutShifts.clusters[2].events.length, 1);
  });

  it('creates a cluster after a navigation', async function() {
    await processTrace(this, 'cls-cluster-navigation.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    const {navigationsByFrameId, mainFrameId} = TraceModel.Handlers.ModelHandlers.Meta.data();

    const navigations = navigationsByFrameId.get(mainFrameId);
    if (!navigations || navigations.length === 0) {
      assert.fail('No navigations found');
    }

    assert.strictEqual(layoutShifts.clusters[0].clusterWindow.max, navigations[0].ts);

    // We should see an initial cluster here from the first layout shifts,
    // followed by 1 for each of the navigations themselves.
    assert.strictEqual(layoutShifts.clusters.length, navigations.length + 1);

    const secondCluster = layoutShifts.clusters[1];
    // The second cluster should be marked to start at the first shift timestamp.
    assert.strictEqual(secondCluster.clusterWindow.min, secondCluster.events[0].ts);
  });

  it('creates a cluster after exceeding the continuous shift limit', async function() {
    await processTrace(this, 'cls-cluster-max-duration.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    assert.strictEqual(layoutShifts.clusters.length, 2);
    // Cluster must be closed as soon as MAX_CLUSTER_DURATION is reached, even if
    // there is a gap greater than MAX_SHIFT_TIME_DELTA right after the max window
    // length happens.
    assert.strictEqual(
        layoutShifts.clusters[0].clusterWindow.max - layoutShifts.clusters[0].clusterWindow.min,
        TraceModel.Handlers.ModelHandlers.LayoutShifts.MAX_CLUSTER_DURATION);
  });
  it('sets the end of the last session window to the trace end time correctly', async function() {
    await processTrace(this, 'cls-cluster-max-duration.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    assert.strictEqual(
        layoutShifts.clusters.at(-1)?.clusterWindow.max, TraceModel.Handlers.ModelHandlers.Meta.data().traceBounds.max);
  });

  it('sets the end of the last session window to the max gap between duration correctly', async function() {
    await processTrace(this, 'cls-cluster-max-timeout.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    const lastWindow = layoutShifts.clusters.at(-1)?.clusterWindow;
    const lastShiftInWindow = layoutShifts.clusters.at(-1)?.events.at(-1);
    if (!lastWindow) {
      assert.fail('Session window not found.');
    }

    if (!lastShiftInWindow) {
      assert.fail('Session window not found.');
    }
    assert.strictEqual(
        lastWindow.max, lastShiftInWindow.ts + TraceModel.Handlers.ModelHandlers.LayoutShifts.MAX_SHIFT_TIME_DELTA);
    assert.isBelow(lastWindow.range, TraceModel.Handlers.ModelHandlers.LayoutShifts.MAX_CLUSTER_DURATION);
  });
  it('sets the end of the last session window to the max session duration correctly', async function() {
    await processTrace(this, 'cls-last-cluster-max-duration.json.gz');
    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    const lastWindow = layoutShifts.clusters.at(-1)?.clusterWindow;
    const lastShiftInWindow = layoutShifts.clusters.at(-1)?.events.at(-1);
    if (!lastWindow) {
      assert.fail('Session window not found.');
    }

    if (!lastShiftInWindow) {
      assert.fail('Session window not found.');
    }
    assert.strictEqual(lastWindow.range, TraceModel.Handlers.ModelHandlers.LayoutShifts.MAX_CLUSTER_DURATION);
  });

  it('demarcates cluster score windows correctly', async function() {
    await processTrace(this, 'cls-multiple-frames.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    assert.strictEqual(layoutShifts.clusters.length, 5);

    for (const cluster of layoutShifts.clusters) {
      let clusterScore = 0;
      for (const event of cluster.events) {
        const scoreBeforeEvent = clusterScore;
        clusterScore += event.args.data ? event.args.data.weighted_score_delta : 0;

        // Here we've crossed the threshold from Good to NI (but not Bad) so
        // check that both the Good and NI windows values are set as expected.
        if (scoreBeforeEvent < TraceModel.Handlers.ModelHandlers.LayoutShifts.LayoutShiftsThreshold.NEEDS_IMPROVEMENT &&
            clusterScore >= TraceModel.Handlers.ModelHandlers.LayoutShifts.LayoutShiftsThreshold.NEEDS_IMPROVEMENT &&
            clusterScore < TraceModel.Handlers.ModelHandlers.LayoutShifts.LayoutShiftsThreshold.BAD) {
          assert.strictEqual(cluster.scoreWindows.good.max, event.ts - 1);
          if (!cluster.scoreWindows.needsImprovement) {
            assert.fail('No Needs Improvement window');
          }
          assert.strictEqual(cluster.scoreWindows.needsImprovement.min, event.ts);
        }

        // Here we have transitioned from eiter Good or NI to Bad, so
        // again we assert that the Bad window starts when expected,
        // and that either the NI or Good window finishes just prior.
        if (scoreBeforeEvent < TraceModel.Handlers.ModelHandlers.LayoutShifts.LayoutShiftsThreshold.BAD &&
            clusterScore >= TraceModel.Handlers.ModelHandlers.LayoutShifts.LayoutShiftsThreshold.BAD) {
          if (!cluster.scoreWindows.bad) {
            assert.fail('No Bad window');
          }

          if (cluster.scoreWindows.needsImprovement) {
            assert.strictEqual(cluster.scoreWindows.needsImprovement.max, event.ts - 1);
          } else {
            assert.strictEqual(cluster.scoreWindows.good.max, event.ts - 1);
          }
          assert.strictEqual(cluster.scoreWindows.bad.min, event.ts);
        }
      }
    }
  });

  it('calculates Cumulative Layout Shift correctly for multiple session windows', async function() {
    await processTrace(this, 'cls-cluster-max-timeout.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    assert.strictEqual(layoutShifts.clusters.length, 3);

    let globalCLS = 0;
    let clusterCount = 1;
    let clusterWithCLS = 0;
    for (const cluster of layoutShifts.clusters) {
      let clusterCumulativeScore = 0;
      for (const shift of cluster.events) {
        clusterCumulativeScore += shift.args.data?.weighted_score_delta || 0;
        // Test the cumulative score until this shift.
        assert.strictEqual(shift.parsedData.cumulativeWeightedScoreInWindow, clusterCumulativeScore);
        // Test the score of this shift's session window.
        assert.strictEqual(shift.parsedData.sessionWindowData.cumulativeWindowScore, cluster.clusterCumulativeScore);
        // Test the id of this shift's session window.
        assert.strictEqual(shift.parsedData.sessionWindowData.id, clusterCount);
      }
      clusterCount++;
      // Test the accumulated
      assert.strictEqual(cluster.clusterCumulativeScore, clusterCumulativeScore);
      if (cluster.clusterCumulativeScore > globalCLS) {
        globalCLS = cluster.clusterCumulativeScore;
        clusterWithCLS = clusterCount - 1;
      }
    }
    // Test the calculated CLS.
    assert.strictEqual(layoutShifts.sessionMaxScore, globalCLS);
    assert.strictEqual(layoutShifts.clsWindowID, clusterWithCLS);
  });

  describe('findNextScreenshotEvent', () => {
    it('gets the first screenshot after a trace', async function() {
      await processTrace(this, 'cls-cluster-navigation.json.gz');
      const screenshots = TraceModel.Handlers.ModelHandlers.Screenshots.data();
      const {clusters} = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
      const shifts = clusters.flatMap(cluster => cluster.events);
      for (const shift of shifts) {
        const screenshotIndex =
            TraceModel.Handlers.ModelHandlers.LayoutShifts.findNextScreenshotEventIndex(screenshots, shift.ts);
        if (screenshotIndex === null) {
          continue;
        }
        assert.isDefined(shift.parsedData.screenshotSource);
        // Make sure the screenshot came after the shift.
        assert.isAtLeast(screenshots[screenshotIndex].ts, shift.ts);
        if (screenshotIndex > 0) {
          // Make sure the previous screenshot came before the shift, meaning
          // the index corresponds to the first screenshot after the shift.
          // (the screenshot data is ordered asc).
          assert.isBelow(screenshots[screenshotIndex - 1].ts, shift.ts);
        }
      }
    });
  });
});
