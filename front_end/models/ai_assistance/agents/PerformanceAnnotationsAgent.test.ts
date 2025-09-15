// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {allThreadEntriesInTrace} from '../../../testing/TraceHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Trace from '../../trace/trace.js';
import {AICallTree, PerformanceAnnotationsAgent} from '../ai_assistance.js';

describeWithEnvironment('PerformanceAnnotationsAgent', () => {
  it('generates a label from the response', async function() {
    const agent = new PerformanceAnnotationsAgent({
      aidaClient: mockAidaClient([[{
        explanation: 'hello world\n',
      }]]),
    });
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const evalScriptEvent =
        allThreadEntriesInTrace(parsedTrace)
            .find(event => event.name === Trace.Types.Events.Name.EVALUATE_SCRIPT && event.ts === 122411195649);
    assert.exists(evalScriptEvent);
    const aiCallTree = AICallTree.fromEvent(evalScriptEvent, parsedTrace);
    assert.isOk(aiCallTree);
    const label = await agent.generateAIEntryLabel(aiCallTree);
    assert.strictEqual(label, 'hello world');
  });
});
