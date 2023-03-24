// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {FakeStorage} from '../../helpers/TimelineHelpers.js';

const {assert} = chai;

describeWithMockConnection('TimelineUIUtils', () => {
  let tracingModel: SDK.TracingModel.TracingModel;
  let process: SDK.TracingModel.Process;
  let thread: SDK.TracingModel.Thread;
  let target: SDK.Target.Target;
  const SCRIPT_ID = 'SCRIPT_ID';

  beforeEach(() => {
    target = createTarget();
    tracingModel = new SDK.TracingModel.TracingModel(new FakeStorage());
    process = new SDK.TracingModel.Process(tracingModel, 1);
    thread = new SDK.TracingModel.Thread(process, 1);
  });

  it('creates top frame location text for function calls', async () => {
    const event = new SDK.TracingModel.ConstructedEvent(
        'devtools.timeline', 'FunctionCall', TraceEngine.Types.TraceEvents.Phase.COMPLETE, 10, thread);

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
        'devtools.timeline', 'TimerInstall', TraceEngine.Types.TraceEvents.Phase.COMPLETE, 10, thread);

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

  describe('script location as an URL', () => {
    let event: SDK.TracingModel.ConstructedEvent;
    beforeEach(() => {
      event = new SDK.TracingModel.ConstructedEvent(
          'devtools.timeline', TimelineModel.TimelineModel.RecordType.FunctionCall,
          TraceEngine.Types.TraceEvents.Phase.COMPLETE, 10, thread);

      event.addArgs({
        data: {
          functionName: 'test',
          url: 'https://google.com/test.js',
          scriptId: SCRIPT_ID,
          lineNumber: 0,
          columnNumber: 0,
        },
      });
      const data = TimelineModel.TimelineModel.TimelineData.forEvent(event);
      data.stackTrace = event.args.data.stackTrace;
    });
    it('makes the script location of a call frame a full URL when the inspected target is not the same the call frame was taken from (e.g. a loaded file)',
       async () => {
         target.setInspectedURL('https://not-google.com' as Platform.DevToolsPath.UrlString);
         const node = await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsNodeForTraceEvent(event);
         if (!node) {
           throw new Error('Node was unexpectedly null');
         }
         assert.strictEqual(node.textContent, 'test @ google.com/test.js:1:1');
       });

    it('makes the script location of a call frame a script name when the inspected target is the one the call frame was taken from',
       async () => {
         target.setInspectedURL('https://google.com' as Platform.DevToolsPath.UrlString);
         const node = await Timeline.TimelineUIUtils.TimelineUIUtils.buildDetailsNodeForTraceEvent(event);
         if (!node) {
           throw new Error('Node was unexpectedly null');
         }
         assert.strictEqual(node.textContent, 'test @ /test.js:1:1');
       });
  });
});
