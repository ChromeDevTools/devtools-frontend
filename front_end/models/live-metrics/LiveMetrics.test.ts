// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Trace from '../../models/trace/trace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as LiveMetrics from './live-metrics.js';

type Milli = Trace.Types.Timing.Milli;

describeWithMockConnection('LiveMetrics', () => {
  let liveMetrics: LiveMetrics.LiveMetrics;
  let primaryTarget: SDK.Target.Target;
  let tabTarget: SDK.Target.Target;

  beforeEach(() => {
    tabTarget = createTarget({type: SDK.Target.Type.TAB});
    primaryTarget = createTarget({
      parentTarget: tabTarget,
      type: SDK.Target.Type.FRAME,
    });
    liveMetrics = LiveMetrics.LiveMetrics.instance({forceNew: true});
  });

  describe('prerender navigation', () => {
    it('handles target removal gracefully', async () => {
      await liveMetrics.targetRemoved(primaryTarget);

      assert.strictEqual(liveMetrics.interactions.size, 0);
      assert.lengthOf(liveMetrics.layoutShifts, 0);
    });

    it('re-enables on a new target after target removal', async () => {
      await liveMetrics.targetRemoved(primaryTarget);

      const newPrimaryTarget = createTarget({
        parentTarget: tabTarget,
        type: SDK.Target.Type.FRAME,
      });

      await liveMetrics.targetAdded(newPrimaryTarget);

      assert.isUndefined(liveMetrics.lcpValue);
      assert.isUndefined(liveMetrics.clsValue);
      assert.isUndefined(liveMetrics.inpValue);
    });

    it('handles rapid target swap during prerender activation', async () => {
      const removePromise = liveMetrics.targetRemoved(primaryTarget);

      const prerenderTarget = createTarget({
        parentTarget: tabTarget,
        type: SDK.Target.Type.FRAME,
      });

      await removePromise;
      await liveMetrics.targetAdded(prerenderTarget);

      assert.strictEqual(liveMetrics.interactions.size, 0);
      assert.lengthOf(liveMetrics.layoutShifts, 0);
    });
  });

  describe('status updates', () => {
    it('dispatches status events', () => {
      let statusReceived = false;
      liveMetrics.addEventListener(LiveMetrics.Events.STATUS, () => {
        statusReceived = true;
      });

      liveMetrics.setStatusForTesting({
        interactions: new Map(),
        layoutShifts: [],
      });

      assert.isTrue(statusReceived);
    });

    it('clears interactions via clearInteractions', () => {
      const interactionId = 'interaction-1-1' as LiveMetrics.InteractionId;
      const interaction: LiveMetrics.Interaction = {
        interactionId,
        interactionType: 'pointer',
        eventNames: ['click'],
        duration: 100,
        startTime: 0,
        nextPaintTime: 100,
        phases: {inputDelay: 10 as Milli, processingDuration: 80 as Milli, presentationDelay: 10 as Milli},
        longAnimationFrameTimings: [],
      };

      liveMetrics.setStatusForTesting({
        interactions: new Map([[interactionId, interaction]]),
        layoutShifts: [],
      });

      assert.strictEqual(liveMetrics.interactions.size, 1);

      liveMetrics.clearInteractions();

      assert.strictEqual(liveMetrics.interactions.size, 0);
    });

    it('clears layout shifts via clearLayoutShifts', () => {
      liveMetrics.setStatusForTesting({
        interactions: new Map(),
        layoutShifts: [
          {score: 0.1, uniqueLayoutShiftId: 'layout-shift-1-1', affectedNodeRefs: []},
        ],
      });

      assert.lengthOf(liveMetrics.layoutShifts, 1);

      liveMetrics.clearLayoutShifts();

      assert.lengthOf(liveMetrics.layoutShifts, 0);
    });
  });
});
