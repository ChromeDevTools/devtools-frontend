"use strict";
/**
 * Copyright 2023 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Locator = exports.LocatorEmittedEvents = exports.RETRY_DELAY = void 0;
const rxjs_js_1 = require("../../../third_party/rxjs/rxjs.js");
const Errors_js_1 = require("../../common/Errors.js");
const EventEmitter_js_1 = require("../../common/EventEmitter.js");
const util_js_1 = require("../../common/util.js");
const locators_js_1 = require("./locators.js");
/**
 * For observables coming from promises, a delay is needed, otherwise RxJS will
 * never yield in a permanent failure for a promise.
 *
 * We also don't want RxJS to do promise operations to often, so we bump the
 * delay up to 100ms.
 *
 * @internal
 */
exports.RETRY_DELAY = 100;
/**
 * All the events that a locator instance may emit.
 *
 * @public
 */
var LocatorEmittedEvents;
(function (LocatorEmittedEvents) {
    /**
     * Emitted every time before the locator performs an action on the located element(s).
     */
    LocatorEmittedEvents["Action"] = "action";
})(LocatorEmittedEvents || (exports.LocatorEmittedEvents = LocatorEmittedEvents = {}));
/**
 * Locators describe a strategy of locating objects and performing an action on
 * them. If the action fails because the object is not ready for the action, the
 * whole operation is retried. Various preconditions for a successful action are
 * checked automatically.
 *
 * @public
 */
class Locator extends EventEmitter_js_1.EventEmitter {
    /**
     * Creates a race between multiple locators but ensures that only a single one
     * acts.
     *
     * @public
     */
    static race(locators) {
        return locators_js_1.RaceLocator.create(locators);
    }
    /**
     * @internal
     */
    visibility = null;
    /**
     * @internal
     */
    _timeout = 30000;
    #ensureElementIsInTheViewport = true;
    #waitForEnabled = true;
    #waitForStableBoundingBox = true;
    /**
     * @internal
     */
    operators = {
        conditions: (conditions, signal) => {
            return (0, rxjs_js_1.mergeMap)((handle) => {
                return (0, rxjs_js_1.merge)(...conditions.map(condition => {
                    return condition(handle, signal);
                })).pipe((0, rxjs_js_1.defaultIfEmpty)(handle));
            });
        },
        retryAndRaceWithSignalAndTimer: (signal) => {
            const candidates = [];
            if (signal) {
                candidates.push((0, rxjs_js_1.fromEvent)(signal, 'abort').pipe((0, rxjs_js_1.map)(() => {
                    throw signal.reason;
                })));
            }
            if (this._timeout > 0) {
                candidates.push((0, rxjs_js_1.timer)(this._timeout).pipe((0, rxjs_js_1.map)(() => {
                    throw new Errors_js_1.TimeoutError(`Timed out after waiting ${this._timeout}ms`);
                })));
            }
            return (0, rxjs_js_1.pipe)((0, rxjs_js_1.retry)({ delay: exports.RETRY_DELAY }), (0, rxjs_js_1.raceWith)(...candidates));
        },
    };
    // Determines when the locator will timeout for actions.
    get timeout() {
        return this._timeout;
    }
    on(eventName, handler) {
        return super.on(eventName, handler);
    }
    once(eventName, handler) {
        return super.once(eventName, handler);
    }
    off(eventName, handler) {
        return super.off(eventName, handler);
    }
    setTimeout(timeout) {
        const locator = this._clone();
        locator._timeout = timeout;
        return locator;
    }
    setVisibility(visibility) {
        const locator = this._clone();
        locator.visibility = visibility;
        return locator;
    }
    setWaitForEnabled(value) {
        const locator = this._clone();
        locator.#waitForEnabled = value;
        return locator;
    }
    setEnsureElementIsInTheViewport(value) {
        const locator = this._clone();
        locator.#ensureElementIsInTheViewport = value;
        return locator;
    }
    setWaitForStableBoundingBox(value) {
        const locator = this._clone();
        locator.#waitForStableBoundingBox = value;
        return locator;
    }
    /**
     * @internal
     */
    copyOptions(locator) {
        this._timeout = locator._timeout;
        this.visibility = locator.visibility;
        this.#waitForEnabled = locator.#waitForEnabled;
        this.#ensureElementIsInTheViewport = locator.#ensureElementIsInTheViewport;
        this.#waitForStableBoundingBox = locator.#waitForStableBoundingBox;
        return this;
    }
    /**
     * If the element has a "disabled" property, wait for the element to be
     * enabled.
     */
    #waitForEnabledIfNeeded = (handle, signal) => {
        if (!this.#waitForEnabled) {
            return rxjs_js_1.EMPTY;
        }
        return (0, rxjs_js_1.from)(handle.frame.waitForFunction(element => {
            if (!(element instanceof HTMLElement)) {
                return true;
            }
            const isNativeFormControl = [
                'BUTTON',
                'INPUT',
                'SELECT',
                'TEXTAREA',
                'OPTION',
                'OPTGROUP',
            ].includes(element.nodeName);
            return !isNativeFormControl || !element.hasAttribute('disabled');
        }, {
            timeout: this._timeout,
            signal,
        }, handle)).pipe((0, rxjs_js_1.ignoreElements)());
    };
    /**
     * Compares the bounding box of the element for two consecutive animation
     * frames and waits till they are the same.
     */
    #waitForStableBoundingBoxIfNeeded = (handle) => {
        if (!this.#waitForStableBoundingBox) {
            return rxjs_js_1.EMPTY;
        }
        return (0, rxjs_js_1.defer)(() => {
            // Note we don't use waitForFunction because that relies on RAF.
            return (0, rxjs_js_1.from)(handle.evaluate(element => {
                return new Promise(resolve => {
                    window.requestAnimationFrame(() => {
                        const rect1 = element.getBoundingClientRect();
                        window.requestAnimationFrame(() => {
                            const rect2 = element.getBoundingClientRect();
                            resolve([
                                {
                                    x: rect1.x,
                                    y: rect1.y,
                                    width: rect1.width,
                                    height: rect1.height,
                                },
                                {
                                    x: rect2.x,
                                    y: rect2.y,
                                    width: rect2.width,
                                    height: rect2.height,
                                },
                            ]);
                        });
                    });
                });
            }));
        }).pipe((0, rxjs_js_1.first)(([rect1, rect2]) => {
            return (rect1.x === rect2.x &&
                rect1.y === rect2.y &&
                rect1.width === rect2.width &&
                rect1.height === rect2.height);
        }), (0, rxjs_js_1.retry)({ delay: exports.RETRY_DELAY }), (0, rxjs_js_1.ignoreElements)());
    };
    /**
     * Checks if the element is in the viewport and auto-scrolls it if it is not.
     */
    #ensureElementIsInTheViewportIfNeeded = (handle) => {
        if (!this.#ensureElementIsInTheViewport) {
            return rxjs_js_1.EMPTY;
        }
        return (0, rxjs_js_1.from)(handle.isIntersectingViewport({ threshold: 0 })).pipe((0, rxjs_js_1.filter)(isIntersectingViewport => {
            return !isIntersectingViewport;
        }), (0, rxjs_js_1.mergeMap)(() => {
            return (0, rxjs_js_1.from)(handle.scrollIntoView());
        }), (0, rxjs_js_1.mergeMap)(() => {
            return (0, rxjs_js_1.defer)(() => {
                return (0, rxjs_js_1.from)(handle.isIntersectingViewport({ threshold: 0 }));
            }).pipe((0, rxjs_js_1.first)(rxjs_js_1.identity), (0, rxjs_js_1.retry)({ delay: exports.RETRY_DELAY }), (0, rxjs_js_1.ignoreElements)());
        }));
    };
    #click(options) {
        const signal = options?.signal;
        return this._wait(options).pipe(this.operators.conditions([
            this.#ensureElementIsInTheViewportIfNeeded,
            this.#waitForStableBoundingBoxIfNeeded,
            this.#waitForEnabledIfNeeded,
        ], signal), (0, rxjs_js_1.tap)(() => {
            return this.emit(LocatorEmittedEvents.Action);
        }), (0, rxjs_js_1.mergeMap)(handle => {
            return (0, rxjs_js_1.from)(handle.click(options)).pipe((0, rxjs_js_1.catchError)((_, caught) => {
                void handle.dispose().catch(util_js_1.debugError);
                return caught;
            }));
        }), this.operators.retryAndRaceWithSignalAndTimer(signal));
    }
    #fill(value, options) {
        const signal = options?.signal;
        return this._wait(options).pipe(this.operators.conditions([
            this.#ensureElementIsInTheViewportIfNeeded,
            this.#waitForStableBoundingBoxIfNeeded,
            this.#waitForEnabledIfNeeded,
        ], signal), (0, rxjs_js_1.tap)(() => {
            return this.emit(LocatorEmittedEvents.Action);
        }), (0, rxjs_js_1.mergeMap)(handle => {
            return (0, rxjs_js_1.from)(handle.evaluate(el => {
                if (el instanceof HTMLSelectElement) {
                    return 'select';
                }
                if (el instanceof HTMLTextAreaElement) {
                    return 'typeable-input';
                }
                if (el instanceof HTMLInputElement) {
                    if (new Set([
                        'textarea',
                        'text',
                        'url',
                        'tel',
                        'search',
                        'password',
                        'number',
                        'email',
                    ]).has(el.type)) {
                        return 'typeable-input';
                    }
                    else {
                        return 'other-input';
                    }
                }
                if (el.isContentEditable) {
                    return 'contenteditable';
                }
                return 'unknown';
            }))
                .pipe((0, rxjs_js_1.mergeMap)(inputType => {
                switch (inputType) {
                    case 'select':
                        return (0, rxjs_js_1.from)(handle.select(value).then(rxjs_js_1.noop));
                    case 'contenteditable':
                    case 'typeable-input':
                        return (0, rxjs_js_1.from)(handle.evaluate((input, newValue) => {
                            const currentValue = input.isContentEditable
                                ? input.innerText
                                : input.value;
                            // Clear the input if the current value does not match the filled
                            // out value.
                            if (newValue.length <= currentValue.length ||
                                !newValue.startsWith(input.value)) {
                                if (input.isContentEditable) {
                                    input.innerText = '';
                                }
                                else {
                                    input.value = '';
                                }
                                return newValue;
                            }
                            const originalValue = input.isContentEditable
                                ? input.innerText
                                : input.value;
                            // If the value is partially filled out, only type the rest. Move
                            // cursor to the end of the common prefix.
                            if (input.isContentEditable) {
                                input.innerText = '';
                                input.innerText = originalValue;
                            }
                            else {
                                input.value = '';
                                input.value = originalValue;
                            }
                            return newValue.substring(originalValue.length);
                        }, value)).pipe((0, rxjs_js_1.mergeMap)(textToType => {
                            return (0, rxjs_js_1.from)(handle.type(textToType));
                        }));
                    case 'other-input':
                        return (0, rxjs_js_1.from)(handle.focus()).pipe((0, rxjs_js_1.mergeMap)(() => {
                            return (0, rxjs_js_1.from)(handle.evaluate((input, value) => {
                                input.value = value;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            }, value));
                        }));
                    case 'unknown':
                        throw new Error(`Element cannot be filled out.`);
                }
            }))
                .pipe((0, rxjs_js_1.catchError)((_, caught) => {
                void handle.dispose().catch(util_js_1.debugError);
                return caught;
            }));
        }), this.operators.retryAndRaceWithSignalAndTimer(signal));
    }
    #hover(options) {
        const signal = options?.signal;
        return this._wait(options).pipe(this.operators.conditions([
            this.#ensureElementIsInTheViewportIfNeeded,
            this.#waitForStableBoundingBoxIfNeeded,
        ], signal), (0, rxjs_js_1.tap)(() => {
            return this.emit(LocatorEmittedEvents.Action);
        }), (0, rxjs_js_1.mergeMap)(handle => {
            return (0, rxjs_js_1.from)(handle.hover()).pipe((0, rxjs_js_1.catchError)((_, caught) => {
                void handle.dispose().catch(util_js_1.debugError);
                return caught;
            }));
        }), this.operators.retryAndRaceWithSignalAndTimer(signal));
    }
    #scroll(options) {
        const signal = options?.signal;
        return this._wait(options).pipe(this.operators.conditions([
            this.#ensureElementIsInTheViewportIfNeeded,
            this.#waitForStableBoundingBoxIfNeeded,
        ], signal), (0, rxjs_js_1.tap)(() => {
            return this.emit(LocatorEmittedEvents.Action);
        }), (0, rxjs_js_1.mergeMap)(handle => {
            return (0, rxjs_js_1.from)(handle.evaluate((el, scrollTop, scrollLeft) => {
                if (scrollTop !== undefined) {
                    el.scrollTop = scrollTop;
                }
                if (scrollLeft !== undefined) {
                    el.scrollLeft = scrollLeft;
                }
            }, options?.scrollTop, options?.scrollLeft)).pipe((0, rxjs_js_1.catchError)((_, caught) => {
                void handle.dispose().catch(util_js_1.debugError);
                return caught;
            }));
        }), this.operators.retryAndRaceWithSignalAndTimer(signal));
    }
    /**
     * Clones the locator.
     */
    clone() {
        return this._clone();
    }
    /**
     * Waits for the locator to get a handle from the page.
     *
     * @public
     */
    async waitHandle(options) {
        return await (0, rxjs_js_1.firstValueFrom)(this._wait(options).pipe(this.operators.retryAndRaceWithSignalAndTimer(options?.signal)));
    }
    /**
     * Waits for the locator to get the serialized value from the page.
     *
     * Note this requires the value to be JSON-serializable.
     *
     * @public
     */
    async wait(options) {
        const handle = await this.waitHandle(options);
        try {
            return await handle.jsonValue();
        }
        finally {
            void handle.dispose().catch(util_js_1.debugError);
        }
    }
    /**
     * Maps the locator using the provided mapper.
     *
     * @public
     */
    map(mapper) {
        return new locators_js_1.MappedLocator(this._clone(), handle => {
            // SAFETY: TypeScript cannot deduce the type.
            return handle.evaluateHandle(mapper);
        });
    }
    /**
     * Creates an expectation that is evaluated against located values.
     *
     * If the expectations do not match, then the locator will retry.
     *
     * @public
     */
    filter(predicate) {
        return new locators_js_1.FilteredLocator(this._clone(), async (handle, signal) => {
            await handle.frame.waitForFunction(predicate, { signal, timeout: this._timeout }, handle);
            return true;
        });
    }
    /**
     * Creates an expectation that is evaluated against located handles.
     *
     * If the expectations do not match, then the locator will retry.
     *
     * @internal
     */
    filterHandle(predicate) {
        return new locators_js_1.FilteredLocator(this._clone(), predicate);
    }
    /**
     * Maps the locator using the provided mapper.
     *
     * @internal
     */
    mapHandle(mapper) {
        return new locators_js_1.MappedLocator(this._clone(), mapper);
    }
    click(options) {
        return (0, rxjs_js_1.firstValueFrom)(this.#click(options));
    }
    /**
     * Fills out the input identified by the locator using the provided value. The
     * type of the input is determined at runtime and the appropriate fill-out
     * method is chosen based on the type. contenteditable, selector, inputs are
     * supported.
     */
    fill(value, options) {
        return (0, rxjs_js_1.firstValueFrom)(this.#fill(value, options));
    }
    hover(options) {
        return (0, rxjs_js_1.firstValueFrom)(this.#hover(options));
    }
    scroll(options) {
        return (0, rxjs_js_1.firstValueFrom)(this.#scroll(options));
    }
}
exports.Locator = Locator;
//# sourceMappingURL=Locator.js.map