// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as Trace from '../../models/trace/trace.js';

export interface DataFromController {
  recordingStartTime?: number;
  cruxFieldData?: CrUXManager.PageResult[]|null;
}

/**
 * We do not track any custom metadata for CPU Profiles.
 */
export function forCPUProfile(): Trace.Types.File.MetaData {
  return {
    dataOrigin: Trace.Types.File.DataOrigin.CPU_PROFILE,
  };
}

/**
 * Calculates and returns the Metadata for the last trace recording.
 * Wrapped in a try/catch because if anything goes wrong, we don't want to
 * break DevTools; we would rather just store no metadata.
 */
export async function forTrace(dataFromController: DataFromController = {}): Promise<Trace.Types.File.MetaData> {
  try {
    return await innerForTraceCalculate(dataFromController);
  } catch {
    return {};
  }
}

async function innerForTraceCalculate({recordingStartTime, cruxFieldData}: DataFromController = {}):
    Promise<Trace.Types.File.MetaData> {
  const deviceModeModel = EmulationModel.DeviceModeModel.DeviceModeModel.tryInstance();
  let emulatedDeviceTitle;
  if (deviceModeModel?.type() === EmulationModel.DeviceModeModel.Type.Device) {
    emulatedDeviceTitle = deviceModeModel.device()?.title ?? undefined;
  } else if (deviceModeModel?.type() === EmulationModel.DeviceModeModel.Type.Responsive) {
    emulatedDeviceTitle = 'Responsive';
  }

  const cpuThrottling = SDK.CPUThrottlingManager.CPUThrottlingManager.instance().cpuThrottlingRate();
  const networkConditions = SDK.NetworkManager.MultitargetNetworkManager.instance().isThrottling() ?
      SDK.NetworkManager.MultitargetNetworkManager.instance().networkConditions() :
      undefined;

  let networkThrottlingConditions;
  let networkTitle;
  if (networkConditions) {
    networkThrottlingConditions = {
      download: networkConditions.download,
      upload: networkConditions.upload,
      latency: networkConditions.latency,
      packetLoss: networkConditions.packetLoss,
      packetQueueLength: networkConditions.packetQueueLength,
      packetReordering: networkConditions.packetReordering,
      targetLatency: networkConditions.targetLatency,
      key: networkConditions.key,
    };
    networkTitle = typeof networkConditions.title === 'function' ? networkConditions.title() : networkConditions.title;
  }

  return {
    source: 'DevTools',
    startTime: recordingStartTime ? new Date(recordingStartTime).toJSON() : undefined,  // ISO-8601 timestamp
    emulatedDeviceTitle,
    cpuThrottling: cpuThrottling !== 1 ? cpuThrottling : undefined,
    networkThrottling: networkTitle,
    networkThrottlingConditions,
    dataOrigin: Trace.Types.File.DataOrigin.TRACE_EVENTS,
    cruxFieldData: cruxFieldData ?? undefined,
    hostDPR: window.devicePixelRatio,
  };
}
