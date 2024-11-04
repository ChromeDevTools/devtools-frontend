// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Types from '../types/types.js';

/**
 * This handler is responsible for the relationships between:
 * DecodeImage/ResizeImage, PaintImage and DrawLazyPixelRef events.
 *
 * When we get a DecodeImage event, we want to associate it to a PaintImage
 * event, primarily so we can determine the NodeID of the image that was
 * decoded.
 * We can do this in two ways:
 *
 * 1. If there is a PaintImage event on the same thread, use that
 *    (if there are multiple, use the latest one).
 *
 * 2. If not, we can find the DecodeLazyPixelRef event on the same thread, and
 *    use the PaintImage event associated with it via the `LazyPixelRef` key.
 */

// Track paintImageEvents across threads.
const paintImageEvents: Map<Types.Events.ProcessID, Map<Types.Events.ThreadID, Types.Events.PaintImage[]>> = new Map();
const decodeLazyPixelRefEvents:
    Map<Types.Events.ProcessID, Map<Types.Events.ThreadID, Types.Events.DecodeLazyPixelRef[]>> = new Map();

// A DrawLazyPixelRef event will contain a numerical reference in
// args.LazyPixelRef. As we parse each DrawLazyPixelRef, we can assign it to a
// paint event. Later we want to look up paint events by this reference, so we
// store them in this map.
const paintImageByLazyPixelRef: Map<number, Types.Events.PaintImage> = new Map();

// When we find events that we want to tie to a particular PaintImage event, we add them to this map.
// These are currently only DecodeImage and ResizeImage events, but the type is
// deliberately generic as in the future we might want to add more events that
// have a relationship to a individual PaintImage event.
const eventToPaintImage: Map<Types.Events.Event, Types.Events.PaintImage> = new Map();

export function reset(): void {
  paintImageEvents.clear();
  decodeLazyPixelRefEvents.clear();
  paintImageByLazyPixelRef.clear();
  eventToPaintImage.clear();
}

export function handleEvent(event: Types.Events.Event): void {
  if (Types.Events.isPaintImage(event)) {
    const forProcess = paintImageEvents.get(event.pid) || new Map<Types.Events.ThreadID, Types.Events.PaintImage[]>();
    const forThread = forProcess.get(event.tid) || [];
    forThread.push(event);
    forProcess.set(event.tid, forThread);
    paintImageEvents.set(event.pid, forProcess);
    return;
  }

  if (Types.Events.isDecodeLazyPixelRef(event) && typeof event.args?.LazyPixelRef !== 'undefined') {
    // Store these because we use them to tie DecodeImage to a PaintEvent.
    const forProcess =
        decodeLazyPixelRefEvents.get(event.pid) || new Map<Types.Events.ThreadID, Types.Events.DecodeLazyPixelRef[]>();
    const forThread = forProcess.get(event.tid) || [];
    forThread.push(event);
    forProcess.set(event.tid, forThread);
    decodeLazyPixelRefEvents.set(event.pid, forProcess);
  }

  // If we see a DrawLazyPixelRef event, we need to find the last PaintImage
  // event on the thread and associate it to the LazyPixelRef that is supplied
  // in the DrawLazyPixelRef event.
  // This means that later on if we see a DecodeLazyPixelRef event with the
  // same LazyPixelRef key, we can find its associated PaintImage event by
  // looking it up.
  if (Types.Events.isDrawLazyPixelRef(event) && typeof event.args?.LazyPixelRef !== 'undefined') {
    const lastPaintEvent = paintImageEvents.get(event.pid)?.get(event.tid)?.at(-1);
    if (!lastPaintEvent) {
      return;
    }
    paintImageByLazyPixelRef.set(event.args.LazyPixelRef, lastPaintEvent);
    return;
  }

  if (Types.Events.isDecodeImage(event)) {
    // When we see a DecodeImage, we want to associate it to a PaintImage
    // event. We try two approaches:
    //
    // 1. If the thread of the DecodeImage event has a previous PaintImage
    // event, that is the associated event.
    //
    // 2. If that is false, we then look on the thread for a DecodeLazyPixelRef
    // event. If we find that, we then look for its associated PaintImage
    // event, which we associate via DrawLazyPixelRef events (the code block
    // above this one)
    //
    // 1. Find a PaintImage event on the same thread. If we find it, that's our association done.
    const lastPaintImageEventOnThread = paintImageEvents.get(event.pid)?.get(event.tid)?.at(-1);
    if (lastPaintImageEventOnThread) {
      eventToPaintImage.set(event, lastPaintImageEventOnThread);
      return;
    }

    // 2. Find the last DecodeLazyPixelRef event and, if we find it, find its associated PaintImage event.
    const lastDecodeLazyPixelRef = decodeLazyPixelRefEvents.get(event.pid)?.get(event.tid)?.at(-1);
    if (!lastDecodeLazyPixelRef || typeof lastDecodeLazyPixelRef.args?.LazyPixelRef === 'undefined') {
      return;
    }

    const paintEvent = paintImageByLazyPixelRef.get(lastDecodeLazyPixelRef.args.LazyPixelRef);
    if (!paintEvent) {
      return;
    }
    eventToPaintImage.set(event, paintEvent);
  }
}

export async function finalize(): Promise<void> {
}

export interface ImagePaintData {
  paintImageByDrawLazyPixelRef: Map<number, Types.Events.PaintImage>;
  paintImageForEvent: Map<Types.Events.Event, Types.Events.PaintImage>;
}

export function data(): ImagePaintData {
  return {
    paintImageByDrawLazyPixelRef: paintImageByLazyPixelRef,
    paintImageForEvent: eventToPaintImage,
  };
}
