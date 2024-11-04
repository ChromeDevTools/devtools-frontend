// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

const frames = new Map<string, Types.Events.TraceFrame>();

export function reset(): void {
  frames.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isTracingStartedInBrowser(event)) {
    for (const frame of event.args.data?.frames ?? []) {
      // The ID of a frame is stored under the `frame` key.
      frames.set(frame.frame, frame);
    }
    return;
  }

  // CommitLoad events can contain an updated URL or Name for a frame.
  if (Types.Events.isCommitLoad(event)) {
    const frameData = event.args.data;
    if (!frameData) {
      return;
    }
    // We don't want to mutate the original object, hence why
    // we set a new object from the new and existing values.
    const frame = frames.get(frameData.frame);
    if (!frame) {
      return;
    }
    frames.set(frameData.frame, {
      ...frame,
      url: frameData.url || frame.url,
      name: frameData.name || frameData.name,
    });
  }
}

export async function finalize(): Promise<void> {
}

export interface PageFrameData {
  frames: Map<string, Types.Events.TraceFrame>;
}
export function data(): PageFrameData {
  return {
    frames,
  };
}
