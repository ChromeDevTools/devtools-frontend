// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as Trace from '../../models/trace/trace.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {mockResourceTree} from '../../testing/ResourceTreeHelpers.js';

import * as LiveMetrics from './live-metrics.js';
import * as Spec from './web-vitals-injected/spec/spec.js';

type Milli = Trace.Types.Timing.Milli;

describeWithMockConnection('LiveMetrics', () => {
  let liveMetrics: LiveMetrics.LiveMetrics;
  let primaryTarget: SDK.Target.Target;
  let tabTarget: SDK.Target.Target;

  beforeEach(() => {
    const connection = new MockCDPConnection([]);
    mockResourceTree(connection);
    tabTarget = createTarget({type: SDK.Target.Type.TAB, connection});
    primaryTarget = createTarget({
      parentTarget: tabTarget,
      type: SDK.Target.Type.FRAME,
    });
    liveMetrics = LiveMetrics.LiveMetrics.instance({forceNew: true});
  });

  describe('prerender navigation', () => {
    it('resets metrics on prerender activation', async () => {
      liveMetrics.setStatusForTesting({
        lcp: {
          value: 100 as Milli,
          phases: {
            timeToFirstByte: 0 as Milli,
            resourceLoadDelay: 0 as Milli,
            resourceLoadTime: 0 as Milli,
            elementRenderDelay: 0 as Milli
          }
        },
        cls: {value: 0.1, clusterShiftIds: []},
        inp: {
          value: 50 as Milli,
          phases: {inputDelay: 0 as Milli, processingDuration: 0 as Milli, presentationDelay: 0 as Milli},
          interactionId: 'interaction-1-1'
        },
        interactions:
            new Map([['interaction-1-1', {interactionId: 'interaction-1-1'} as unknown as LiveMetrics.Interaction]]),
        layoutShifts: [{score: 0.1} as unknown as LiveMetrics.LayoutShift],
      });

      const resourceTreeModel = primaryTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel?.mainFrame);

      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
        frame: resourceTreeModel.mainFrame,
        type: SDK.ResourceTreeModel.PrimaryPageChangeType.ACTIVATION,
      });

      assert.isUndefined(liveMetrics.lcpValue);
      assert.isUndefined(liveMetrics.clsValue);
      assert.isUndefined(liveMetrics.inpValue);
      assert.strictEqual(liveMetrics.interactions.size, 0);
      assert.lengthOf(liveMetrics.layoutShifts, 0);
    });
  });

  describe('binding events', () => {
    let runtimeModel: SDK.RuntimeModel.RuntimeModel;
    let primaryExecutionContextId: Protocol.Runtime.ExecutionContextId;
    let childFrameExecutionContextId: Protocol.Runtime.ExecutionContextId;

    beforeEach(async () => {
      await liveMetrics.targetAdded(primaryTarget);

      const runtimeModelFromTarget = primaryTarget.model(SDK.RuntimeModel.RuntimeModel);
      assert.exists(runtimeModelFromTarget);
      runtimeModel = runtimeModelFromTarget;

      const resourceTreeModel = primaryTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel?.mainFrame);

      primaryExecutionContextId = 1 as Protocol.Runtime.ExecutionContextId;
      childFrameExecutionContextId = 2 as Protocol.Runtime.ExecutionContextId;

      runtimeModel.executionContextCreated({
        id: primaryExecutionContextId,
        uniqueId: 'primary-context',
        origin: 'https://example.com',
        name: 'DevTools Performance Metrics',
        auxData: {
          isDefault: false,
          frameId: resourceTreeModel.mainFrame.id,
        },
      });

      runtimeModel.executionContextCreated({
        id: childFrameExecutionContextId,
        uniqueId: 'child-context',
        origin: 'https://example.com',
        name: 'DevTools Performance Metrics',
        auxData: {
          isDefault: false,
          frameId: 'child-frame-id',
        },
      });
    });

    const lcpEvent = (value: number): Spec.LcpChangeEvent => ({
      name: 'LCP',
      value: value as Milli,
      phases: {
        timeToFirstByte: 0 as Milli,
        resourceLoadDelay: 0 as Milli,
        resourceLoadTime: 0 as Milli,
        elementRenderDelay: 0 as Milli,
      },
      startedHidden: false,
    });

    const emitBindingCalled =
        async(executionContextId: Protocol.Runtime.ExecutionContextId, payload: Spec.WebVitalsEvent): Promise<void> => {
      runtimeModel.bindingCalled({
        name: Spec.EVENT_BINDING_NAME,
        payload: JSON.stringify(payload),
        executionContextId,
      });
      await Promise.resolve();
      await Promise.resolve();
    };

    it('ignores non-primary frame events', async () => {
      await emitBindingCalled(primaryExecutionContextId, {name: 'reset'});
      await emitBindingCalled(primaryExecutionContextId, lcpEvent(111));

      assert.strictEqual(liveMetrics.lcpValue?.value, 111);

      await emitBindingCalled(childFrameExecutionContextId, {name: 'reset'});
      await emitBindingCalled(childFrameExecutionContextId, lcpEvent(999));

      assert.strictEqual(liveMetrics.lcpValue?.value, 111);
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
