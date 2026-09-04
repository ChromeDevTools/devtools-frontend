// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../trace.js';
import * as Lantern from '../lantern.js';

function toLanternTrace(traceEvents: readonly Trace.Types.Events.Event[]): Lantern.Types.Trace {
  return {
    traceEvents: traceEvents as unknown as Lantern.Types.TraceEvent[],
  };
}

export interface ComputationData {
  simulator: Lantern.Simulation.Simulator<unknown>;
  graph: Lantern.Graph.Node<Trace.Types.Events.SyntheticNetworkRequest>;
  processedNavigation: Lantern.Types.Simulation.ProcessedNavigation;
}

async function runTraceProcessor(_context: Mocha.Suite|Mocha.Context, trace: Lantern.Types.Trace):
    Promise<Trace.Handlers.Types.EnabledHandlerDataWithMeta<typeof Trace.Handlers.ModelHandlers>> {
  const processor = Trace.Processor.TraceProcessor.createWithAllHandlers();
  await processor.parse(trace.traceEvents as Trace.Types.Events.Event[], {isCPUProfile: false, isFreshRecording: true});
  if (!processor.data) {
    throw new Error('No data');
  }
  return processor.data;
}

async function getComputationDataFromFixture(context: Mocha.Suite|Mocha.Context, {trace, settings, url, parsedTrace}: {
  trace?: Lantern.Types.Trace,
  settings?: Lantern.Types.Simulation.Settings,
  url?: Lantern.Types.Simulation.URL,
  parsedTrace?: Trace.TraceModel.ParsedTrace,
}): Promise<ComputationData> {
  settings = settings ?? {} as Lantern.Types.Simulation.Settings;
  if (!settings.throttlingMethod) {
    settings.throttlingMethod = 'simulate';
  }
  const data = parsedTrace ? parsedTrace.data : await runTraceProcessor(context, trace!);
  const lanternTrace = trace ?? toLanternTrace(parsedTrace!.traceEvents);
  const requests = Trace.LanternComputationData.createNetworkRequests(lanternTrace, data);
  const networkAnalysis = Lantern.Core.NetworkAnalyzer.analyze(requests);
  if (!networkAnalysis) {
    throw new Error('no networkAnalysis');
  }

  const frameId = data.Meta.mainFrameId;
  const navigation = data.Meta.mainFrameNavigations[0];
  if (!navigation) {
    throw new Error('no navigation found');
  }

  const simulator: Lantern.Simulation.Simulator<unknown> =
      Lantern.Simulation.Simulator.createSimulator({...settings, networkAnalysis});
  const graph: Lantern.Graph.Node<Trace.Types.Events.SyntheticNetworkRequest> =
      Trace.LanternComputationData.createGraph(requests, lanternTrace, data, url);
  const processedNavigation: Lantern.Types.Simulation.ProcessedNavigation =
      Trace.LanternComputationData.createProcessedNavigation(data, frameId, navigation);

  return {
    simulator,
    graph,
    processedNavigation,
  };
}

export {
  getComputationDataFromFixture,
  runTraceProcessor as runTrace,
  toLanternTrace,
};
