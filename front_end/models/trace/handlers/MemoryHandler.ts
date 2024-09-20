// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Types from '../types/types.js';

export interface MemoryData {
  updateCountersByProcess: Map<Types.Events.ProcessID, Types.Events.UpdateCounters[]>;
}

const updateCountersByProcess: MemoryData['updateCountersByProcess'] = new Map();

export function reset(): void {
  updateCountersByProcess.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isUpdateCounters(event)) {
    const countersForProcess = Platform.MapUtilities.getWithDefault(updateCountersByProcess, event.pid, () => []);
    countersForProcess.push(event);
    updateCountersByProcess.set(event.pid, countersForProcess);
  }
}

export function data(): MemoryData {
  return {updateCountersByProcess};
}
