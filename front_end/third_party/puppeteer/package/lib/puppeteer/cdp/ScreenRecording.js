/**
 * @license
 * Copyright 2026 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { CDPSessionEvent } from '../api/CDPSession.js';
import { ScreenRecording } from '../api/ScreenRecording.js';
import { DEBUG_PREFIXES } from '../common/Debug.js';
import { guarded } from '../util/decorators.js';
import { stringToTypedArray } from '../util/encoding.js';
/**
 * @internal
 */
let CdpScreenRecording = (() => {
    let _classSuper = ScreenRecording;
    let _instanceExtraInitializers = [];
    let _stop_decorators;
    return class CdpScreenRecording extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _stop_decorators = [guarded()];
            __esDecorate(this, null, _stop_decorators, { kind: "method", name: "stop", static: false, private: false, access: { has: obj => "stop" in obj, get: obj => obj.stop }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #streamHandle = __runInitializers(this, _instanceExtraInitializers);
        /**
         * @internal
         */
        constructor(page, options = {}, logger) {
            super(page, options, logger);
            const { client } = this.page.mainFrame();
            client?.once?.(CDPSessionEvent.Disconnected, () => {
                void this.stop().catch(err => {
                    this.logger(DEBUG_PREFIXES.error)?.(err);
                });
            });
        }
        /**
         * @internal
         */
        async _start() {
            const { client } = this.page.mainFrame();
            const frameRate = this.options.frameRate ?? this.options.fps;
            // @ts-expect-error Page.startScreenRecording is not yet in devtools-protocol
            const result = (await client.send('Page.startScreenRecording', {
                audio: this.options.audio,
                maxWidth: this.options.maxWidth,
                maxHeight: this.options.maxHeight,
                frameRate,
            }));
            this.#streamHandle = result.stream;
        }
        /**
         * Stops the screen recording.
         *
         * @public
         */
        async stop() {
            if (this.stopped) {
                return;
            }
            this.stopped = true;
            try {
                const { client } = this.page.mainFrame();
                await client
                    // @ts-expect-error Page.stopScreenRecording is not yet in devtools-protocol
                    .send('Page.stopScreenRecording')
                    .catch(err => {
                    this.logger(DEBUG_PREFIXES.error)?.(err);
                });
                if (!this.#streamHandle) {
                    throw new Error('Screen recording stream handle is missing.');
                }
                let eof = false;
                while (!eof) {
                    const { data, base64Encoded, eof: isEof, } = await client.send('IO.read', { handle: this.#streamHandle });
                    eof = isEof;
                    if (data) {
                        const buffer = stringToTypedArray(data, base64Encoded ?? false);
                        this.controller.enqueue(buffer);
                        for (const dest of this.destinations) {
                            dest.write(buffer);
                        }
                    }
                }
                await client.send('IO.close', { handle: this.#streamHandle }).catch(err => {
                    this.logger(DEBUG_PREFIXES.error)?.(err);
                });
            }
            finally {
                await this.closeDestinations();
            }
        }
    };
})();
export { CdpScreenRecording };
//# sourceMappingURL=ScreenRecording.js.map