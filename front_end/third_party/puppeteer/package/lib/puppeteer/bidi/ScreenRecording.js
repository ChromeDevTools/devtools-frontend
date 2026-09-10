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
import { ScreenRecording } from '../api/ScreenRecording.js';
import { DEBUG_PREFIXES } from '../common/Debug.js';
import { environment } from '../environment.js';
import { guarded } from '../util/decorators.js';
/**
 * @internal
 */
let BidiScreenRecording = (() => {
    let _classSuper = ScreenRecording;
    let _instanceExtraInitializers = [];
    let _stop_decorators;
    return class BidiScreenRecording extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _stop_decorators = [guarded()];
            __esDecorate(this, null, _stop_decorators, { kind: "method", name: "stop", static: false, private: false, access: { has: obj => "stop" in obj, get: obj => obj.stop }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        #screencastId = __runInitializers(this, _instanceExtraInitializers);
        #path;
        /**
         * @internal
         */
        constructor(page, options = {}, logger) {
            super(page, options, logger);
            const browsingContext = this.page.mainFrame().browsingContext;
            browsingContext?.once?.('closed', () => {
                void this.stop().catch(err => {
                    this.logger(DEBUG_PREFIXES.error)?.(err);
                });
            });
        }
        /**
         * @internal
         */
        async _start() {
            const frameRate = this.options.frameRate ?? this.options.fps;
            const video = this.options.maxWidth !== undefined ||
                this.options.maxHeight !== undefined ||
                frameRate !== undefined
                ? {
                    width: this.options.maxWidth,
                    height: this.options.maxHeight,
                    frameRate,
                }
                : undefined;
            const result = await this.page.mainFrame().browsingContext.startScreencast({
                audio: this.options.audio,
                video,
            });
            this.#screencastId = result.screencast;
            this.#path = result.path;
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
                if (!this.#screencastId) {
                    return;
                }
                const result = await this.page
                    .mainFrame()
                    .browsingContext.stopScreencast(this.#screencastId)
                    .catch(err => {
                    this.logger(DEBUG_PREFIXES.error)?.(err);
                    return undefined;
                });
                if (result?.error) {
                    this.logger(DEBUG_PREFIXES.error)?.(result.error);
                }
                const filePath = result?.path ?? this.#path;
                if (filePath) {
                    try {
                        const buffer = await environment.value.readFile(filePath);
                        this.controller.enqueue(buffer);
                        for (const dest of this.destinations) {
                            dest.write(buffer);
                        }
                    }
                    catch (err) {
                        this.logger(DEBUG_PREFIXES.error)?.(err);
                    }
                }
            }
            finally {
                await this.closeDestinations();
            }
        }
    };
})();
export { BidiScreenRecording };
//# sourceMappingURL=ScreenRecording.js.map