// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as Trace from '../../models/trace/trace.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {mockResourceTree} from '../../testing/ResourceTreeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import type * as WebVitals from '../../third_party/web-vitals/web-vitals.js';

import * as LiveMetrics from './live-metrics.js';
import * as Spec from './web-vitals-injected/spec/spec.js';

type Milli = Trace.Types.Timing.Milli;

describe('LiveMetrics', () => {
  setupSettingsHooks();

  let liveMetrics: LiveMetrics.LiveMetrics;
  let primaryTarget: SDK.Target.Target;
  let connection: MockCDPConnection;

  beforeEach(async () => {
    const universe = new TestUniverse();
    connection = new MockCDPConnection([]);
    mockResourceTree(connection);
    const tabTarget = universe.createTarget({type: SDK.Target.Type.TAB, connection});
    primaryTarget = universe.createTarget({
      parentTarget: tabTarget,
      type: SDK.Target.Type.FRAME,
    });
    liveMetrics = universe.liveMetrics;
    await liveMetrics.enable();
  });

  describe('prerender navigation', () => {
    it('resets metrics on prerender activation', async () => {
      liveMetrics.setStatusForTesting({
        lcp: {
          value: 100 as Milli,
          subparts: {
            timeToFirstByte: 0 as Milli,
            resourceLoadDelay: 0 as Milli,
            resourceLoadTime: 0 as Milli,
            elementRenderDelay: 0 as Milli,
          },
        },
        cls: {value: 0.1, clusterShiftIds: []},
        inp: {
          value: 50 as Milli,
          subparts: {inputDelay: 0 as Milli, processingDuration: 0 as Milli, presentationDelay: 0 as Milli},
          interactionId: 'interaction-1-1',
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
      subparts: {
        timeToFirstByte: 0 as Milli,
        resourceLoadDelay: 0 as Milli,
        resourceLoadTime: 0 as Milli,
        elementRenderDelay: 0 as Milli,
      },
      startedHidden: false,
    });

    const emitBindingCalled =
        async(executionContextId: Protocol.Runtime.ExecutionContextId, payload: unknown): Promise<void> => {
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

    it('ignores reset events from default context (main world)', async () => {
      const resourceTreeModel = primaryTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
      assert.exists(resourceTreeModel?.mainFrame);

      // Create a default context with same frame ID
      const defaultExecutionContextId = 10 as Protocol.Runtime.ExecutionContextId;
      runtimeModel.executionContextCreated({
        id: defaultExecutionContextId,
        uniqueId: 'default-context',
        origin: 'https://example.com',
        name: '',  // default context has empty name
        auxData: {
          isDefault: true,
          frameId: resourceTreeModel.mainFrame.id,
        },
      });

      // Track evaluate calls
      const evalExpressions: string[] = [];
      connection.setSuccessHandler('Runtime.evaluate', params => {
        evalExpressions.push(params.expression);
        return {
          result: {
            type: 'undefined',
          } as Protocol.Runtime.RemoteObject,
        } as Protocol.Runtime.EvaluateResponse;
      });

      // Emit reset from default context
      await emitBindingCalled(defaultExecutionContextId, {name: 'reset'});

      // Try to emit LCP from that default context - should be ignored because reset was ignored
      await emitBindingCalled(defaultExecutionContextId, {
        name: 'LCP',
        value: 100 as Milli,
        subparts: {
          timeToFirstByte: 0 as Milli,
          resourceLoadDelay: 0 as Milli,
          resourceLoadTime: 0 as Milli,
          elementRenderDelay: 0 as Milli,
        },
        startedHidden: false,
        nodeIndex: 1,
      });

      // Since the context was ignored, we should NOT have resolved node (which calls evaluate)
      assert.lengthOf(evalExpressions, 0);
      assert.isUndefined(liveMetrics.lcpValue);
    });

    it('prevents code injection via nodeIndex in LCP', async () => {
      // Emit reset from valid context to set lastResetContextId
      await emitBindingCalled(primaryExecutionContextId, {name: 'reset'});

      // Track evaluate calls
      const evalExpressions: string[] = [];
      connection.setSuccessHandler('Runtime.evaluate', params => {
        evalExpressions.push(params.expression);
        return {
          result: {
            type: 'undefined',
          } as Protocol.Runtime.RemoteObject,
        } as Protocol.Runtime.EvaluateResponse;
      });

      // Emit LCP with malicious nodeIndex string (allowed because payload is unknown)
      await emitBindingCalled(primaryExecutionContextId, {
        name: 'LCP',
        value: 100 as Milli,
        subparts: {
          timeToFirstByte: 0 as Milli,
          resourceLoadDelay: 0 as Milli,
          resourceLoadTime: 0 as Milli,
          elementRenderDelay: 0 as Milli,
        },
        startedHidden: false,
        nodeIndex: '0); alert(1); (0',
      });

      // The evaluate should not be called because it fails Number.isInteger validation
      assert.lengthOf(evalExpressions, 0);
    });

    it('prevents code injection in logInteractionScripts', async () => {
      // Emit reset from valid context to set lastResetContextId
      await emitBindingCalled(primaryExecutionContextId, {name: 'reset'});

      // Track evaluate calls
      const evalExpressions: string[] = [];
      connection.setSuccessHandler('Runtime.evaluate', params => {
        evalExpressions.push(params.expression);
        return {
          result: {
            type: 'undefined',
          } as Protocol.Runtime.RemoteObject,
        } as Protocol.Runtime.EvaluateResponse;
      });

      const interaction = {
        interactionId: 'interaction-1-1',
        interactionType: 'pointer\'); alert(1); (//',  // Malicious type
        eventNames: ['click'],
        duration: 100,
        startTime: 0,
        subparts: {inputDelay: 10 as Milli, processingDuration: 80 as Milli, presentationDelay: 10 as Milli},
        longAnimationFrameTimings: [],
      } as unknown as LiveMetrics.Interaction;

      const success = await liveMetrics.logInteractionScripts(interaction);
      assert.isTrue(success);

      assert.lengthOf(evalExpressions, 1);
      const expr = evalExpressions[0];
      // The interactionType should be safely stringified and concatenated
      assert.include(expr, '\' + "pointer\'); alert(1); (//" + \' interaction\')');
      assert.notInclude(expr, '100ms pointer\'); alert(1); (// interaction');
    });

    it('handles INP event without startTime and entryGroupId', async () => {
      await emitBindingCalled(primaryExecutionContextId, {name: 'reset'});
      await emitBindingCalled(primaryExecutionContextId, {
        name: 'INP',
        value: 120 as Milli,
        subparts: {
          inputDelay: 10 as Milli,
          processingDuration: 100 as Milli,
          presentationDelay: 10 as Milli,
        },
        interactionType: 'pointer',
      });

      assert.strictEqual(liveMetrics.inpValue?.value, 120);
      assert.isUndefined(liveMetrics.inpValue?.interactionId);
    });

    it('ignores InteractionEntry without startTime and entryGroupId', async () => {
      await emitBindingCalled(primaryExecutionContextId, {name: 'reset'});
      await emitBindingCalled(primaryExecutionContextId, {
        name: 'InteractionEntry',
        duration: 120 as Milli,
        subparts: {
          inputDelay: 10 as Milli,
          processingDuration: 100 as Milli,
          presentationDelay: 10 as Milli,
        },
        nextPaintTime: 130,
        interactionType: 'pointer',
        longAnimationFrameEntries: [],
      });

      assert.strictEqual(liveMetrics.interactions.size, 0);
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

    it('dispatches status events with navigationType', () => {
      let statusEvent: LiveMetrics.StatusEvent|null = null;
      liveMetrics.addEventListener(LiveMetrics.Events.STATUS, event => {
        statusEvent = event.data;
      });

      liveMetrics.setStatusForTesting({
        interactions: new Map(),
        layoutShifts: [],
        navigationType: 'soft-navigation',
      });

      assert.exists(statusEvent);
      assert.strictEqual((statusEvent as LiveMetrics.StatusEvent).navigationType, 'soft-navigation');
      assert.strictEqual(liveMetrics.navigationType, 'soft-navigation');
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
        subparts: {inputDelay: 10 as Milli, processingDuration: 80 as Milli, presentationDelay: 10 as Milli},
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

describe('web-vitals-injected', () => {
  it('handles empty entries for INP metric without crashing', () => {
    const mockMetric = {
      name: 'INP',
      value: 120,
      attribution: {
        interactionType: 'pointer',
        inputDelay: 10,
        processingDuration: 100,
        presentationDelay: 10,
      },
      entries: [],
    } as unknown as WebVitals.INPMetricWithAttribution;

    const event = Spec.createInpChangeEvent(mockMetric);
    assert.deepEqual(event, {
      name: 'INP',
      value: 120 as Trace.Types.Timing.Milli,
      subparts: {
        inputDelay: 10 as Trace.Types.Timing.Milli,
        processingDuration: 100 as Trace.Types.Timing.Milli,
        presentationDelay: 10 as Trace.Types.Timing.Milli,
      },
      interactionType: 'pointer',
      startTime: undefined,
      entryGroupId: undefined,
    });
  });

  it('handles empty entries for each interaction without crashing', () => {
    const mockInteraction = {
      name: 'InteractionEntry',
      value: 120,
      attribution: {
        inputDelay: 10,
        processingDuration: 100,
        presentationDelay: 10,
        nextPaintTime: 130,
        interactionType: 'pointer',
        longAnimationFrameEntries: [],
      },
      entries: [],
    } as unknown as WebVitals.INPMetricWithAttribution;

    const event = Spec.createInteractionEntryEvent(mockInteraction);
    assert.deepEqual(event, {
      name: 'InteractionEntry',
      duration: 120 as Trace.Types.Timing.Milli,
      subparts: {
        inputDelay: 10 as Trace.Types.Timing.Milli,
        processingDuration: 100 as Trace.Types.Timing.Milli,
        presentationDelay: 10 as Trace.Types.Timing.Milli,
      },
      nextPaintTime: 130,
      interactionType: 'pointer',
      navigationId: undefined,
      startTime: undefined,
      entryGroupId: undefined,
      eventName: undefined,
      longAnimationFrameEntries: [],
    });
  });

  it('limits and sorts scripts per long animation frame correctly', () => {
    const mockLoaf: Spec.PerformanceLongAnimationFrameTimingJSON = {
      renderStart: 190,
      duration: 200,
      scripts: [
        {startTime: 20, duration: 80},
        {startTime: 10, duration: 20},
        {startTime: 30, duration: 50},
        {startTime: 1, duration: 10},
        {startTime: 2, duration: 10},
        {startTime: 3, duration: 10},
        {startTime: 4, duration: 10},
        {startTime: 5, duration: 10},
        {startTime: 6, duration: 10},
        {startTime: 7, duration: 10},
        {startTime: 8, duration: 10},
        {startTime: 9, duration: 10},
      ],
    };

    const result = Spec.limitScripts([mockLoaf]);
    assert.deepEqual(result[0].scripts, [
      {startTime: 1, duration: 10},
      {startTime: 2, duration: 10},
      {startTime: 3, duration: 10},
      {startTime: 4, duration: 10},
      {startTime: 5, duration: 10},
      {startTime: 6, duration: 10},
      {startTime: 7, duration: 10},
      {startTime: 10, duration: 20},
      {startTime: 20, duration: 80},
      {startTime: 30, duration: 50},
    ]);
  });
});
