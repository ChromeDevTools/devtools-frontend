// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {FakeStorage} from '../../helpers/TimelineHelpers.js';

const {assert} = chai;

interface FakeLayoutShiftProperties {
  startTime: number;
  hadRecentInput: boolean;
  weightedScoreDelta?: number;
}

function makeFakeLayoutShift(properties: FakeLayoutShiftProperties): SDK.TracingModel.Event {
  const fakeLayoutShift = {
    args: {
      data: {
        had_recent_input: properties.hadRecentInput,
        weighted_score_delta: properties.weightedScoreDelta,
      },
    },
    startTime: properties.startTime,
  } as unknown as SDK.TracingModel.Event;

  return fakeLayoutShift;
}

describe('groupLayoutShiftsIntoClusters', () => {
  it('does not include layout shifts that have recent user input', () => {
    const shiftWithUserInput = makeFakeLayoutShift({
      hadRecentInput: true,
      weightedScoreDelta: 0.01,
      startTime: 2000,
    });
    const layoutShifts: SDK.TracingModel.Event[] = [shiftWithUserInput];
    Timeline.TimelineUIUtils.assignLayoutShiftsToClusters(layoutShifts);
    assert.isUndefined(shiftWithUserInput.args.data._current_cluster_id);
  });

  it('does not include layout shifts that have no weighted_score_delta', () => {
    const shiftWithNoWeightedScore = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: undefined,
      startTime: 2000,
    });
    const layoutShifts: SDK.TracingModel.Event[] = [shiftWithNoWeightedScore];
    Timeline.TimelineUIUtils.assignLayoutShiftsToClusters(layoutShifts);
    assert.isUndefined(shiftWithNoWeightedScore.args.data._current_cluster_id);
  });

  it('correctly combines events that are within the same session', () => {
    const shiftOne = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: 0.01,
      startTime: 2000,
    });

    const shiftTwo = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: 0.02,
      startTime: shiftOne.startTime + 100,
    });
    const layoutShifts: SDK.TracingModel.Event[] = [shiftOne, shiftTwo];
    Timeline.TimelineUIUtils.assignLayoutShiftsToClusters(layoutShifts);

    assert.strictEqual(shiftOne.args.data._current_cluster_id, 1);
    assert.strictEqual(shiftTwo.args.data._current_cluster_id, 1);
    assert.strictEqual(shiftOne.args.data._current_cluster_score, 0.03);
    assert.strictEqual(shiftTwo.args.data._current_cluster_score, 0.03);
  });

  it('correctly splits events into multiple clusters', () => {
    const shiftOne = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: 0.01,
      startTime: 2000,
    });

    const shiftTwo = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: 0.02,
      startTime: shiftOne.startTime + 100,
    });

    const shiftThree = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: 0.05,
      startTime: 10000,
    });

    const layoutShifts: SDK.TracingModel.Event[] = [shiftOne, shiftTwo, shiftThree];
    Timeline.TimelineUIUtils.assignLayoutShiftsToClusters(layoutShifts);

    assert.strictEqual(shiftOne.args.data._current_cluster_id, 1);
    assert.strictEqual(shiftTwo.args.data._current_cluster_id, 1);
    assert.strictEqual(shiftOne.args.data._current_cluster_score, 0.03);
    assert.strictEqual(shiftTwo.args.data._current_cluster_score, 0.03);

    assert.strictEqual(shiftThree.args.data._current_cluster_id, 2);
    assert.strictEqual(shiftThree.args.data._current_cluster_score, 0.05);
  });
});

describe('TimelineUIUtils', () => {
  let tracingModel: SDK.TracingModel.TracingModel;
  let process: SDK.TracingModel.Process;
  let thread: SDK.TracingModel.Thread;
  const SCRIPT_ID = 'SCRIPT_ID';

  beforeEach(() => {
    tracingModel = new SDK.TracingModel.TracingModel(new FakeStorage());
    process = new SDK.TracingModel.Process(tracingModel, 1);
    thread = new SDK.TracingModel.Thread(process, 1);
  });

  it('creates top frame location text for function calls', async () => {
    const event = new SDK.TracingModel.ConstructedEvent(
        'devtools.timeline', 'FunctionCall', SDK.TracingModel.Phase.Complete, 10, thread);

    event.addArgs({
      data: {
        functionName: 'test',
        url: 'test.js',
        scriptId: SCRIPT_ID,
        lineNumber: 0,
        columnNumber: 0,
      },
    });
    assert.strictEqual(
        'test.js:1:1', await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsTextForTraceEvent(event));
  });

  it('creates top frame location text as a fallback', async () => {
    // 'TimerInstall' is chosen such that we run into the 'default' case.
    const event = new SDK.TracingModel.ConstructedEvent(
        'devtools.timeline', 'TimerInstall', SDK.TracingModel.Phase.Complete, 10, thread);

    event.addArgs({
      data: {
        stackTrace: [
          {
            functionName: 'test',
            url: 'test.js',
            scriptId: SCRIPT_ID,
            lineNumber: 0,
            columnNumber: 0,
          },
        ],
      },
    });
    const data = TimelineModel.TimelineModel.TimelineData.forEvent(event);
    data.stackTrace = event.args.data.stackTrace;
    assert.strictEqual(
        'test.js:1:1', await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsTextForTraceEvent(event));
  });
});
