// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import type * as Trace from '../../trace/trace.js';
import * as AiAssistance from '../ai_assistance.js';

describeWithEnvironment('PerformanceTraceContext', () => {
  it('should return prompt details correctly by combining trace formatter output', async () => {
    const mockTrace = {
      insights: new Map(),
      data: {
        Meta: {
          mainFrameURL: 'https://example.com',
          traceBounds: {min: 0, max: 100},
        },
      },
    } as unknown as Trace.TraceModel.ParsedTrace;

    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(mockTrace);

    const formatterProto = AiAssistance.PerformanceTraceFormatter.PerformanceTraceFormatter.prototype;
    sinon.stub(formatterProto, 'formatTraceSummary').returns('Mock Trace Summary');
    sinon.stub(formatterProto, 'formatCriticalRequests').resolves('Mock Critical Requests');
    sinon.stub(formatterProto, 'formatMainThreadBottomUpSummary').resolves('Mock Main Thread');
    sinon.stub(formatterProto, 'formatThirdPartySummary').resolves('Mock Third Party');
    sinon.stub(formatterProto, 'formatLongestTasks').resolves('Mock Longest Tasks');

    const promptDetails = await context.getPromptDetails();
    assert.strictEqual(promptDetails, `Trace summary:
Mock Trace Summary

Mock Critical Requests

Mock Main Thread

Mock Third Party

Mock Longest Tasks`);
  });

  it('should return user facing details correctly', async () => {
    const mockTrace = {
      insights: new Map(),
      data: {
        Meta: {
          mainFrameURL: 'https://example.com',
          traceBounds: {min: 0, max: 100},
        },
      },
    } as unknown as Trace.TraceModel.ParsedTrace;

    const context = AiAssistance.PerformanceTraceContext.PerformanceTraceContext.fromParsedTrace(mockTrace);

    const formatterProto = AiAssistance.PerformanceTraceFormatter.PerformanceTraceFormatter.prototype;
    sinon.stub(formatterProto, 'formatTraceSummary').returns('Mock Trace Summary');
    sinon.stub(formatterProto, 'formatCriticalRequests').resolves('Mock Critical Requests');
    sinon.stub(formatterProto, 'formatMainThreadBottomUpSummary').resolves('Mock Main Thread');
    sinon.stub(formatterProto, 'formatThirdPartySummary').resolves('Mock Third Party');
    sinon.stub(formatterProto, 'formatLongestTasks').resolves('Mock Longest Tasks');

    const details = await context.getUserFacingDetails();
    assert.deepEqual(details, [
      {title: 'Trace summary', text: 'Mock Trace Summary'},
      {title: 'Critical requests', text: 'Mock Critical Requests'},
      {title: 'Main thread activities', text: 'Mock Main Thread'},
      {title: 'Third party summary', text: 'Mock Third Party'},
      {title: 'Longest tasks', text: 'Mock Longest Tasks'},
    ]);
  });
});
