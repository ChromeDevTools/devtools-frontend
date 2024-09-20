// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';
import type * as Protocol from '../../../generated/protocol.js';
/**
 * If the LCP resource was an image, and that image was fetched over the
 * network, we want to be able to find the network request in order to construct
 * the critical path for an LCP image.
 * Within the trace file there are `LargestImagePaint::Candidate` events.
 * Within their data object, they contain a `DOMNodeId` property, which maps to
 * the DOM Node ID for that image.
 *
 * This id maps exactly to the `data.nodeId` property that a
 * `LargestContentfulPaint::Candidate` will have. So, when we find an image
 * paint candidate, we can store it, keying it on the node ID.
 * Then, when it comes to finding the network request for an LCP image, we can
 *
 * use the nodeId from the LCP candidate to find the image candidate. That image
 * candidate also contains a `imageUrl` property, which will have the full URL
 * to the image.
 **/
const imageByDOMNodeId = new Map<Protocol.DOM.BackendNodeId, Types.Events.LargestImagePaintCandidate>();

export function reset(): void {
  imageByDOMNodeId.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (!Types.Events.isLargestImagePaintCandidate(event)) {
    return;
  }

  if (!event.args.data) {
    return;
  }

  imageByDOMNodeId.set(event.args.data.DOMNodeId, event);
}

export function data(): Map<Protocol.DOM.BackendNodeId, Types.Events.LargestImagePaintCandidate> {
  return imageByDOMNodeId;
}
