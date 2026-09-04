// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {TraceLoader} from '../../../../testing/TraceLoader.js';
import type * as Trace from '../../trace.js';
import * as Lantern from '../lantern.js';
import {getComputationDataFromFixture} from '../testing/testing.js';

const {FirstContentfulPaint} = Lantern.Metrics;

describe('Metrics: Lantern FCP', function() {
  let parsedTrace: Trace.TraceModel.ParsedTrace;
  before(async function() {
    parsedTrace = await TraceLoader.traceEngine(this, 'lantern/progressive-app/trace.json.gz', undefined,
                                                {withTimelinePanel: false});
  });

  it('should compute predicted value', async () => {
    const data = await getComputationDataFromFixture(this, {parsedTrace});
    const result = FirstContentfulPaint.compute(data);

    assert.deepEqual(
        {
          timing: Math.round(result.timing),
          optimistic: Math.round(result.optimisticEstimate.timeInMs),
          pessimistic: Math.round(result.pessimisticEstimate.timeInMs),
          optimisticNodeTimings: result.optimisticEstimate.nodeTimings.size,
          pessimisticNodeTimings: result.pessimisticEstimate.nodeTimings.size,
        },
        {
          timing: 1107,
          optimistic: 1107,
          pessimistic: 1107,
          optimisticNodeTimings: 4,
          pessimisticNodeTimings: 4,
        });
    assert.isOk(result.optimisticGraph, 'should have created optimistic graph');
    assert.isOk(result.pessimisticGraph, 'should have created pessimistic graph');
  });

  it('should handle negative request networkEndTime', async () => {
    const data = await getComputationDataFromFixture(this, {parsedTrace});

    assert(data.graph.type === 'network');
    data.graph.request.networkEndTime = -1;
    const result = FirstContentfulPaint.compute(data);

    const optimisticNodes: Lantern.Graph.NetworkNode[] = [];
    result.optimisticGraph.traverse(node => {
      if (node.type === 'network') {
        optimisticNodes.push(node);
      }
    });
    assert.deepEqual(optimisticNodes.map(node => node.request.url), ['https://squoosh.app/']);

    const pessimisticNodes: Lantern.Graph.NetworkNode[] = [];
    result.pessimisticGraph.traverse(node => {
      if (node.type === 'network') {
        pessimisticNodes.push(node);
      }
    });
    assert.deepEqual(pessimisticNodes.map(node => node.request.url), ['https://squoosh.app/']);
  });
});
