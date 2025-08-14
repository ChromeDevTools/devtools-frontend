// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {allThreadEntriesInTrace} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../../trace/trace.js';
import {PerformanceAnnotationsAgent} from '../ai_assistance.js';

describeWithEnvironment('PerformanceAnnotationsAgent', () => {
  it('generates a label from the response', async function() {
    const agent = new PerformanceAnnotationsAgent({
      aidaClient: mockAidaClient([[{
        explanation: 'hello world\n',
      }]]),
    });
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const evalScriptEvent =
        allThreadEntriesInTrace(parsedTrace)
            .find(event => event.name === Trace.Types.Events.Name.EVALUATE_SCRIPT && event.ts === 122411195649);
    assert.exists(evalScriptEvent);
    const aiCallTree = TimelineUtils.AICallTree.AICallTree.fromEvent(evalScriptEvent, parsedTrace);
    assert.isOk(aiCallTree);
    const label = await agent.generateAIEntryLabel(aiCallTree);
    assert.strictEqual(label, 'hello world');
  });
});
