// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Types from '../types/types.js';

export interface DOMStatsData {
  domStatsByFrameId: Map<string, Types.Events.DOMStats[]>;
}

const domStatsByFrameId: DOMStatsData['domStatsByFrameId'] = new Map();

export function reset(): void {
  domStatsByFrameId.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (!Types.Events.isDOMStats(event)) {
    return;
  }
  const domStatEvents = Platform.MapUtilities.getWithDefault(domStatsByFrameId, event.args.data.frame, () => []);
  domStatEvents.push(event);
}

export async function finalize(): Promise<void> {
}

export function data(): DOMStatsData {
  return {domStatsByFrameId};
}
