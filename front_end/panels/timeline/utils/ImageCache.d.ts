import * as Trace from '../../../models/trace/trace.js';
export declare const emitter: EventTarget;
/**
 * Synchronously returns an image, or return `null` while queuing up an async load of that image.
 * If the image load fails, we cache a null to avoid reattempts.
 */
export declare function getOrQueue(screenshot: Trace.Types.Events.LegacySyntheticScreenshot | Trace.Types.Events.Screenshot): HTMLImageElement | null;
/** Load an image (probably data URI). If it fails, resolve with null. */
declare function loadImage(url: string): Promise<HTMLImageElement | null>;
/** Populate the cache ahead of use, to allow for getOrQueue to synchronously return images. */
export declare function preload(screenshots: Array<Trace.Types.Events.LegacySyntheticScreenshot | Trace.Types.Events.Screenshot>): Promise<void[]>;
export declare const cacheForTesting: WeakMap<Trace.Types.Events.LegacySyntheticScreenshot | Trace.Types.Events.Screenshot, HTMLImageElement | null>;
export declare const loadImageForTesting: typeof loadImage;
export {};
