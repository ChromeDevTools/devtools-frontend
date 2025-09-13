// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Unsure why this lint is failing, given `lantern/metrics/SpeedIndex.test.ts` does the same
// and is fine. Maybe `*.test.*` files are excluded from this rule?
// eslint-disable-next-line rulesdir/es-modules-import
import * as TraceLoader from '../../../../testing/TraceLoader.js';
import * as Trace from '../../trace.js';
import * as Lantern from '../lantern.js';

function toLanternTrace(traceEvents: readonly Trace.Types.Events.Event[]): Lantern.Types.Trace {
  return {
    traceEvents: traceEvents as unknown as Lantern.Types.TraceEvent[],
  };
}

async function runTraceProcessor(context: Mocha.Suite|Mocha.Context, trace: Lantern.Types.Trace) {
  TraceLoader.TraceLoader.setTestTimeout(context);

  const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
  await processor.parse(trace.traceEvents as Trace.Types.Events.Event[], {isCPUProfile: false, isFreshRecording: true});
  if (!processor.data) {
    throw new Error('No data');
  }
  return processor.data;
}

async function getComputationDataFromFixture(context: Mocha.Suite|Mocha.Context, {trace, settings, url}: {
  trace: Lantern.Types.Trace,
  settings?: Lantern.Types.Simulation.Settings,
  url?: Lantern.Types.Simulation.URL,
}) {
  settings = settings ?? {} as Lantern.Types.Simulation.Settings;
  if (!settings.throttlingMethod) {
    settings.throttlingMethod = 'simulate';
  }
  const data = await runTraceProcessor(context, trace);
  const requests = Trace.LanternComputationData.createNetworkRequests(trace, data);
  const networkAnalysis = Lantern.Core.NetworkAnalyzer.analyze(requests);
  if (!networkAnalysis) {
    throw new Error('no networkAnalysis');
  }

  const frameId = data.Meta.mainFrameId;
  const navigationId = data.Meta.mainFrameNavigations[0].args.data?.navigationId;
  if (!navigationId) {
    throw new Error('no navigation id found');
  }

  return {
    simulator: Lantern.Simulation.Simulator.createSimulator({...settings, networkAnalysis}),
    graph: Trace.LanternComputationData.createGraph(requests, trace, data, url),
    processedNavigation: Trace.LanternComputationData.createProcessedNavigation(data, frameId, navigationId),
  };
}

export {
  getComputationDataFromFixture,
  runTraceProcessor as runTrace,
  toLanternTrace,
};
