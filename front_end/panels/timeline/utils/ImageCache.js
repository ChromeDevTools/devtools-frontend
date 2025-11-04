// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Trace from '../../../models/trace/trace.js';
const imageCache = new WeakMap();
export const emitter = new EventTarget();
/**
 * Synchronously returns an image, or return `null` while queuing up an async load of that image.
 * If the image load fails, we cache a null to avoid reattempts.
 */
export function getOrQueue(screenshot) {
    if (imageCache.has(screenshot)) {
        return imageCache.get(screenshot) ?? null;
    }
    const uri = Trace.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(screenshot);
    loadImage(uri)
        .then(imageOrNull => {
        imageCache.set(screenshot, imageOrNull);
        emitter.dispatchEvent(new CustomEvent('screenshot-loaded', { detail: { screenshot, image: imageOrNull } }));
    })
        .catch(() => { });
    return null;
}
/** Load an image (probably data URI). If it fails, resolve with null. */
function loadImage(url) {
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', () => resolve(null));
        image.src = url;
    });
}
/** Populate the cache ahead of use, to allow for getOrQueue to synchronously return images. */
export function preload(screenshots) {
    const promises = screenshots.map(screenshot => {
        if (imageCache.has(screenshot)) {
            return;
        }
        const uri = Trace.Handlers.ModelHandlers.Screenshots.screenshotImageDataUri(screenshot);
        return loadImage(uri).then(image => {
            imageCache.set(screenshot, image);
            return;
        });
    });
    return Promise.all(promises);
}
export const cacheForTesting = imageCache;
export const loadImageForTesting = loadImage;
//# sourceMappingURL=ImageCache.js.map