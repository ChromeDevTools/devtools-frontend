// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceModel from '../../../../../../front_end/models/trace/trace.js';
import {createTarget} from '../../../helpers/EnvironmentHelpers.js';
import {
  clearAllMockConnectionResponseHandlers,
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../../helpers/MockConnection.js';

import type * as Protocol from '../../../../../../front_end/generated/protocol.js';
import * as SDK from '../../../../../../front_end/core/sdk/sdk.js';
import {loadEventsFromTraceFile} from '../../../helpers/TraceHelpers.js';

async function processTrace(url: string): Promise<void> {
  TraceModel.Handlers.ModelHandlers.Meta.reset();
  TraceModel.Handlers.ModelHandlers.Meta.initialize();

  TraceModel.Handlers.ModelHandlers.LayoutShifts.reset();
  TraceModel.Handlers.ModelHandlers.LayoutShifts.initialize();

  try {
    const events = await loadEventsFromTraceFile(url);
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

describeWithMockConnection('LayoutShiftsHandler', () => {
  beforeEach(async () => {
    // The layout shifts handler stores by process, so to make life easier we
    // run the meta handler here, too, so that later on we can get the IDs of
    // the main renderer process and thread.
    TraceModel.Handlers.ModelHandlers.Meta.reset();
    TraceModel.Handlers.ModelHandlers.Meta.initialize();

    TraceModel.Handlers.ModelHandlers.LayoutShifts.reset();
  });

  it('extracts the affected elements (impacted nodes) from LayoutShift events correctly', async () => {
    // Create a mock target, dom model, document and node.
    const target = createTarget();
    const domModel = target.model(SDK.DOMModel.DOMModel);
    if (!domModel) {
      assert.fail('DOM model not found.');
    }
    const documentNode = {nodeId: 1 as Protocol.DOM.NodeId};
    const domNode = new SDK.DOMModel.DOMNode(domModel);
    domNode.id = 2 as Protocol.DOM.NodeId;

    // Set related CDP methods responses to return our mock document and node.
    setMockConnectionResponseHandler('DOM.pushNodesByBackendIdsToFrontend', () => ({nodeIds: [domNode.id]}));
    setMockConnectionResponseHandler('DOM.getDocument', () => ({root: documentNode}));

    // Register the mock document and node in DOMModel, these use the mock responses set above.
    await domModel.requestDocument();
    domModel.registerNode(domNode);

    // Process the trace and invoke the extraction of the node_ids into actual SDK.DOMNodes.
    await processTrace('cls-cluster-navigation.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();

    // Make sure the extraction is correct by comparing the result with the mock node created
    // above.
    const cluster = layoutShifts.clusters[0];
    for (const shift of cluster.events) {
      const impactedNodes = shift.args.data?.impacted_nodes;
      if (!impactedNodes || impactedNodes.length < 1) {
        continue;
      }
      assert.strictEqual(shift.domNodeSources.length, 1);
      assert.strictEqual(shift.domNodeSources[0].node, domNode);
    }
  });

  it('clusters a single frame correctly', async () => {
    await processTrace('cls-single-frame.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    assert.strictEqual(layoutShifts.clusters.length, 1);
    assert.strictEqual(layoutShifts.clusters[0].clusterCumulativeScore, 0.29522728495836237);
  });

  it('creates a cluster after the maximum time gap between shifts', async () => {
    await processTrace('cls-cluster-max-timeout.json.gz');

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

  it('creates a cluster after a navigation', async () => {
    await processTrace('cls-cluster-navigation.json.gz');

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

  it('creates a cluster after exceeding the continuous shift limit', async () => {
    await processTrace('cls-cluster-max-duration.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    assert.strictEqual(layoutShifts.clusters.length, 2);
    // Cluster must be closed as soon as MAX_CLUSTER_DURATION is reached, even if
    // there is a gap greater than MAX_SHIFT_TIME_DELTA right after the max window
    // length happens.
    assert.strictEqual(
        layoutShifts.clusters[0].clusterWindow.max - layoutShifts.clusters[0].clusterWindow.min,
        TraceModel.Handlers.ModelHandlers.LayoutShifts.MAX_CLUSTER_DURATION);
  });
  it('sets the end of the last session window to the trace end time correctly', async () => {
    await processTrace('cls-cluster-max-duration.json.gz');

    const layoutShifts = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
    assert.strictEqual(
        layoutShifts.clusters.at(-1)?.clusterWindow.max, TraceModel.Handlers.ModelHandlers.Meta.data().traceBounds.max);
  });

  it('sets the end of the last session window to the max gap between duration correctly', async () => {
    await processTrace('cls-cluster-max-timeout.json.gz');

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
  it('sets the end of the last session window to the max session duration correctly', async () => {
    await processTrace('cls-last-cluster-max-duration.json.gz');
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

  it('demarcates cluster score windows correctly', async () => {
    await processTrace('cls-multiple-frames.json.gz');

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

  it('calculates Cumulative Layout Shift correctly for multiple session windows', async () => {
    await processTrace('cls-cluster-max-timeout.json.gz');

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
        assert.strictEqual(shift.cumulativeWeightedScoreInWindow, clusterCumulativeScore);
        // Test the score of this shift's session window.
        assert.strictEqual(shift.sessionWindowData.cumulativeWindowScore, cluster.clusterCumulativeScore);
        // Test the id of this shift's session window.
        assert.strictEqual(shift.sessionWindowData.id, clusterCount);
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
    it('gets the first screenshot after a trace', async () => {
      await processTrace('cls-cluster-navigation.json.gz');
      const screenshots = TraceModel.Handlers.ModelHandlers.Screenshots.data();
      const {clusters} = TraceModel.Handlers.ModelHandlers.LayoutShifts.data();
      const shifts = clusters.flatMap(cluster => cluster.events);
      for (const shift of shifts) {
        const screenshotIndex =
            TraceModel.Handlers.ModelHandlers.LayoutShifts.findNextScreenshotEventIndex(screenshots, shift.ts);
        if (screenshotIndex === null) {
          continue;
        }
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
  describe('normalizeLayoutShiftImpactedNodes', () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    let impacted_nodes: TraceModel.Types.TraceEvents.TraceImpactedNode[];

    beforeEach(() => {
      // Even though we don't use the target directly in the test, we still
      // need to create one so we can stub responses for it.
      createTarget();
      setMockConnectionResponseHandler('Runtime.evaluate', () => ({result: {value: 4, type: 'number'}}));
      impacted_nodes = [
        {
          new_rect: [0, 0, 40, 80],
          node_id: 1 as Protocol.DOM.BackendNodeId,
          old_rect: [20, 20, 40, 80],
        },
        {
          new_rect: [10, 10, 10, 10],
          node_id: 1 as Protocol.DOM.BackendNodeId,
          old_rect: [0, 0, 10, 10],
        },
      ];
    });
    afterEach(() => {
      clearAllMockConnectionResponseHandlers();
    });
    it('normalizes the impacted nodes DOM rects to CSS values', async () => {
      const expectedNormalizedNodes: TraceModel.Types.TraceEvents.TraceImpactedNode[] = [
        {
          new_rect: [0, 0, 10, 20],
          node_id: 1 as Protocol.DOM.BackendNodeId,
          old_rect: [5, 5, 10, 20],
        },
        {
          new_rect: [2.5, 2.5, 2.5, 2.5],
          node_id: 1 as Protocol.DOM.BackendNodeId,
          old_rect: [0, 0, 2.5, 2.5],
        },
      ];
      const mockShift = {args: {data: {impacted_nodes}}} as TraceModel.Types.TraceEvents.TraceEventLayoutShift;

      await TraceModel.Handlers.ModelHandlers.LayoutShifts.normalizeLayoutShiftImpactedNodes(mockShift);

      const expectedResult = {
        args: {data: {impacted_nodes: expectedNormalizedNodes}},
        normalized: true,
      } as TraceModel.Types.TraceEvents.TraceEventLayoutShift;

      assert.deepEqual(mockShift, expectedResult);
    });
    it('does not normalize a layout shift that has already been normalized', async () => {
      const mockShift = {args: {data: {impacted_nodes}}, normalized: true} as
          TraceModel.Types.TraceEvents.TraceEventLayoutShift;
      await TraceModel.Handlers.ModelHandlers.LayoutShifts.normalizeLayoutShiftImpactedNodes(mockShift);
      assert.deepEqual(mockShift, mockShift);
    });
  });
});
