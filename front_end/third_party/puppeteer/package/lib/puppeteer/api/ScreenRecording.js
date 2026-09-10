/**
 * @license
 * Copyright 2026 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { asyncDisposeSymbol } from '../util/disposable.js';
/**
 * @public
 */
export class ScreenRecording extends ReadableStream {
    /**
     * @internal
     */
    page;
    /**
     * @internal
     */
    options;
    /**
     * @internal
     */
    logger;
    /**
     * @internal
     */
    controller;
    /**
     * @internal
     */
    destinations = new Set();
    /**
     * @internal
     */
    stopped = false;
    /**
     * @internal
     */
    constructor(page, options = {}, logger) {
        let controller;
        super({
            start(c) {
                controller = c;
            },
        });
        this.controller = controller;
        this.page = page;
        this.options = options;
        this.logger = logger;
    }
    pipe(destination) {
        if ('getWriter' in destination &&
            typeof destination.getWriter === 'function') {
            return this.pipeTo(destination);
        }
        const dest = destination;
        this.destinations.add(dest);
        dest.once?.('unpipe', () => {
            this.destinations.delete(dest);
        });
        dest.once?.('error', () => {
            this.destinations.delete(dest);
        });
        dest.once?.('close', () => {
            this.destinations.delete(dest);
        });
        dest.once?.('finish', () => {
            this.destinations.delete(dest);
        });
        return dest;
    }
    /**
     * @internal
     */
    async closeDestinations() {
        try {
            this.controller.close();
        }
        catch {
            // Controller might already be closed.
        }
        for (const dest of this.destinations) {
            dest.end();
        }
        const destinationPromises = Array.from(this.destinations).map(dest => {
            return new Promise(resolve => {
                if (dest.writableFinished || dest.closed || dest.destroyed) {
                    resolve(undefined);
                }
                else {
                    dest.once?.('finish', resolve);
                    dest.once?.('close', resolve);
                    dest.once?.('error', resolve);
                }
            });
        });
        await Promise.all(destinationPromises);
    }
    async [asyncDisposeSymbol]() {
        await this.stop();
    }
}
//# sourceMappingURL=ScreenRecording.js.map