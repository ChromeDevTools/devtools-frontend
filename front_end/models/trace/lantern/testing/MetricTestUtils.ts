// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../trace.js';
import * as Lantern from '../lantern.js';

function toLanternTrace(traceEvents: readonly Trace.Types.Events.Event[]): Lantern.Types.Trace {
  return {
    traceEvents: traceEvents as unknown as Lantern.Types.TraceEvent[],
  };
}

async function runTrace(trace: Lantern.Types.Trace) {
  const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
  await processor.parse(trace.traceEvents as Trace.Types.Events.Event[], {isCPUProfile: false, isFreshRecording: true});
  if (!processor.parsedTrace) {
    throw new Error('No data');
  }
  return processor.parsedTrace;
}

async function getComputationDataFromFixture({trace, settings, url}: {
  trace: Lantern.Types.Trace,
  settings?: Lantern.Types.Simulation.Settings,
  url?: Lantern.Types.Simulation.URL,
}) {
  settings = settings ?? {} as Lantern.Types.Simulation.Settings;
  if (!settings.throttlingMethod) {
    settings.throttlingMethod = 'simulate';
  }
  const parsedTrace = await runTrace(trace);
  const requests = Trace.LanternComputationData.createNetworkRequests(trace, parsedTrace);
  const networkAnalysis = Lantern.Core.NetworkAnalyzer.analyze(requests);
  const frameId = parsedTrace.Meta.mainFrameId;
  const navigationId = parsedTrace.Meta.mainFrameNavigations[0].args.data?.navigationId;
  if (!navigationId) {
    throw new Error('no navigation id found');
  }

  return {
    simulator: Lantern.Simulation.Simulator.createSimulator({...settings, networkAnalysis}),
    graph: Trace.LanternComputationData.createGraph(requests, trace, parsedTrace, url),
    processedNavigation: Trace.LanternComputationData.createProcessedNavigation(parsedTrace, frameId, navigationId),
  };
}

export {
  toLanternTrace,
  runTrace,
  getComputationDataFromFixture,
};
