// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';

const imageCache: WeakMap<Trace.Types.Events.SyntheticScreenshot, HTMLImageElement|null> = new WeakMap();
export const emitter = new EventTarget();

/**
 * Synchronously returns an image, or return `null` while queuing up an async load of that image.
 * If the image load fails, we cache a null to avoid reattempts.
 */
export function getOrQueue(screenshot: Trace.Types.Events.SyntheticScreenshot): HTMLImageElement|null {
  if (imageCache.has(screenshot)) {
    return imageCache.get(screenshot) ?? null;
  }

  const data = screenshot.args.dataUri;

  loadImage(data)
      .then(imageOrNull => {
        imageCache.set(screenshot, imageOrNull);
        emitter.dispatchEvent(new CustomEvent('screenshot-loaded', {detail: {screenshot, image: imageOrNull}}));
      })
      .catch(() => {});
  return null;
}

/** Load an image (probably data URI). If it fails, resolve with null. */
function loadImage(url: string): Promise<HTMLImageElement|null> {
  return new Promise(resolve => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => resolve(null));
    image.src = url;
  });
}

/** Populate the cache ahead of use, to allow for getOrQueue to synchronously return images. */
export function preload(screenshots: Trace.Types.Events.SyntheticScreenshot[]): Promise<void[]> {
  const promises = screenshots.map(screenshot => {
    if (imageCache.has(screenshot)) {
      return;
    }
    return loadImage(screenshot.args.dataUri).then(image => {
      imageCache.set(screenshot, image);
      return;
    });
  });
  return Promise.all(promises);
}

export const cacheForTesting = imageCache;
export const loadImageForTesting = loadImage;
