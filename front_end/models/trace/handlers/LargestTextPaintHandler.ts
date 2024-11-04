// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../../generated/protocol.js';
import * as Types from '../types/types.js';
/**
 * A trace file will contain all the text paints that were candidates for the
 * LargestTextPaint. If an LCP event is text, it will point to one of these
 * candidates, so we store them by their DOM Node ID.
 **/
const textPaintByDOMNodeId = new Map<Protocol.DOM.BackendNodeId, Types.Events.LargestTextPaintCandidate>();

export function reset(): void {
  textPaintByDOMNodeId.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (!Types.Events.isLargestTextPaintCandidate(event)) {
    return;
  }

  if (!event.args.data) {
    return;
  }

  textPaintByDOMNodeId.set(event.args.data.DOMNodeId, event);
}

export async function finalize(): Promise<void> {
}

export function data(): Map<Protocol.DOM.BackendNodeId, Types.Events.LargestTextPaintCandidate> {
  return textPaintByDOMNodeId;
}
