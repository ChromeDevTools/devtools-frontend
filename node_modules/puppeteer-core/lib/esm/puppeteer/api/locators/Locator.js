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
var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        function next() {
            while (env.stack.length) {
                var rec = env.stack.pop();
                try {
                    var result = rec.dispose && rec.dispose.call(rec.value);
                    if (rec.async) return Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                }
                catch (e) {
                    fail(e);
                }
            }
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import { EMPTY, catchError, defaultIfEmpty, defer, filter, first, firstValueFrom, from, fromEvent, identity, ignoreElements, map, merge, mergeMap, noop, pipe, raceWith, retry, tap, } from '../../../third_party/rxjs/rxjs.js';
import { EventEmitter } from '../../common/EventEmitter.js';
import { debugError, timeout } from '../../common/util.js';
import { FilteredLocator, MappedLocator, RaceLocator, } from './locators.js';
/**
 * For observables coming from promises, a delay is needed, otherwise RxJS will
 * never yield in a permanent failure for a promise.
 *
 * We also don't want RxJS to do promise operations to often, so we bump the
 * delay up to 100ms.
 *
 * @internal
 */
export const RETRY_DELAY = 100;
/**
 * All the events that a locator instance may emit.
 *
 * @public
 */
export var LocatorEvent;
(function (LocatorEvent) {
    /**
     * Emitted every time before the locator performs an action on the located element(s).
     */
    LocatorEvent["Action"] = "action";
})(LocatorEvent || (LocatorEvent = {}));
export { 
/**
 * @deprecated Use {@link LocatorEvent}.
 */
LocatorEvent as LocatorEmittedEvents, };
/**
 * Locators describe a strategy of locating objects and performing an action on
 * them. If the action fails because the object is not ready for the action, the
 * whole operation is retried. Various preconditions for a successful action are
 * checked automatically.
 *
 * @public
 */
export class Locator extends EventEmitter {
    /**
     * Creates a race between multiple locators but ensures that only a single one
     * acts.
     *
     * @public
     */
    static race(locators) {
        return RaceLocator.create(locators);
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
            return mergeMap((handle) => {
                return merge(...conditions.map(condition => {
                    return condition(handle, signal);
                })).pipe(defaultIfEmpty(handle));
            });
        },
        retryAndRaceWithSignalAndTimer: (signal) => {
            const candidates = [];
            if (signal) {
                candidates.push(fromEvent(signal, 'abort').pipe(map(() => {
                    throw signal.reason;
                })));
            }
            candidates.push(timeout(this._timeout));
            return pipe(retry({ delay: RETRY_DELAY }), raceWith(...candidates));
        },
    };
    // Determines when the locator will timeout for actions.
    get timeout() {
        return this._timeout;
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
            return EMPTY;
        }
        return from(handle.frame.waitForFunction(element => {
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
        }, handle)).pipe(ignoreElements());
    };
    /**
     * Compares the bounding box of the element for two consecutive animation
     * frames and waits till they are the same.
     */
    #waitForStableBoundingBoxIfNeeded = (handle) => {
        if (!this.#waitForStableBoundingBox) {
            return EMPTY;
        }
        return defer(() => {
            // Note we don't use waitForFunction because that relies on RAF.
            return from(handle.evaluate(element => {
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
        }).pipe(first(([rect1, rect2]) => {
            return (rect1.x === rect2.x &&
                rect1.y === rect2.y &&
                rect1.width === rect2.width &&
                rect1.height === rect2.height);
        }), retry({ delay: RETRY_DELAY }), ignoreElements());
    };
    /**
     * Checks if the element is in the viewport and auto-scrolls it if it is not.
     */
    #ensureElementIsInTheViewportIfNeeded = (handle) => {
        if (!this.#ensureElementIsInTheViewport) {
            return EMPTY;
        }
        return from(handle.isIntersectingViewport({ threshold: 0 })).pipe(filter(isIntersectingViewport => {
            return !isIntersectingViewport;
        }), mergeMap(() => {
            return from(handle.scrollIntoView());
        }), mergeMap(() => {
            return defer(() => {
                return from(handle.isIntersectingViewport({ threshold: 0 }));
            }).pipe(first(identity), retry({ delay: RETRY_DELAY }), ignoreElements());
        }));
    };
    #click(options) {
        const signal = options?.signal;
        return this._wait(options).pipe(this.operators.conditions([
            this.#ensureElementIsInTheViewportIfNeeded,
            this.#waitForStableBoundingBoxIfNeeded,
            this.#waitForEnabledIfNeeded,
        ], signal), tap(() => {
            return this.emit(LocatorEvent.Action, undefined);
        }), mergeMap(handle => {
            return from(handle.click(options)).pipe(catchError(err => {
                void handle.dispose().catch(debugError);
                throw err;
            }));
        }), this.operators.retryAndRaceWithSignalAndTimer(signal));
    }
    #fill(value, options) {
        const signal = options?.signal;
        return this._wait(options).pipe(this.operators.conditions([
            this.#ensureElementIsInTheViewportIfNeeded,
            this.#waitForStableBoundingBoxIfNeeded,
            this.#waitForEnabledIfNeeded,
        ], signal), tap(() => {
            return this.emit(LocatorEvent.Action, undefined);
        }), mergeMap(handle => {
            return from(handle.evaluate(el => {
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
                .pipe(mergeMap(inputType => {
                switch (inputType) {
                    case 'select':
                        return from(handle.select(value).then(noop));
                    case 'contenteditable':
                    case 'typeable-input':
                        return from(handle.evaluate((input, newValue) => {
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
                        }, value)).pipe(mergeMap(textToType => {
                            return from(handle.type(textToType));
                        }));
                    case 'other-input':
                        return from(handle.focus()).pipe(mergeMap(() => {
                            return from(handle.evaluate((input, value) => {
                                input.value = value;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                            }, value));
                        }));
                    case 'unknown':
                        throw new Error(`Element cannot be filled out.`);
                }
            }))
                .pipe(catchError(err => {
                void handle.dispose().catch(debugError);
                throw err;
            }));
        }), this.operators.retryAndRaceWithSignalAndTimer(signal));
    }
    #hover(options) {
        const signal = options?.signal;
        return this._wait(options).pipe(this.operators.conditions([
            this.#ensureElementIsInTheViewportIfNeeded,
            this.#waitForStableBoundingBoxIfNeeded,
        ], signal), tap(() => {
            return this.emit(LocatorEvent.Action, undefined);
        }), mergeMap(handle => {
            return from(handle.hover()).pipe(catchError(err => {
                void handle.dispose().catch(debugError);
                throw err;
            }));
        }), this.operators.retryAndRaceWithSignalAndTimer(signal));
    }
    #scroll(options) {
        const signal = options?.signal;
        return this._wait(options).pipe(this.operators.conditions([
            this.#ensureElementIsInTheViewportIfNeeded,
            this.#waitForStableBoundingBoxIfNeeded,
        ], signal), tap(() => {
            return this.emit(LocatorEvent.Action, undefined);
        }), mergeMap(handle => {
            return from(handle.evaluate((el, scrollTop, scrollLeft) => {
                if (scrollTop !== undefined) {
                    el.scrollTop = scrollTop;
                }
                if (scrollLeft !== undefined) {
                    el.scrollLeft = scrollLeft;
                }
            }, options?.scrollTop, options?.scrollLeft)).pipe(catchError(err => {
                void handle.dispose().catch(debugError);
                throw err;
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
        return await firstValueFrom(this._wait(options).pipe(this.operators.retryAndRaceWithSignalAndTimer(options?.signal)));
    }
    /**
     * Waits for the locator to get the serialized value from the page.
     *
     * Note this requires the value to be JSON-serializable.
     *
     * @public
     */
    async wait(options) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const handle = __addDisposableResource(env_1, await this.waitHandle(options), false);
            return await handle.jsonValue();
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    /**
     * Maps the locator using the provided mapper.
     *
     * @public
     */
    map(mapper) {
        return new MappedLocator(this._clone(), handle => {
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
        return new FilteredLocator(this._clone(), async (handle, signal) => {
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
        return new FilteredLocator(this._clone(), predicate);
    }
    /**
     * Maps the locator using the provided mapper.
     *
     * @internal
     */
    mapHandle(mapper) {
        return new MappedLocator(this._clone(), mapper);
    }
    click(options) {
        return firstValueFrom(this.#click(options));
    }
    /**
     * Fills out the input identified by the locator using the provided value. The
     * type of the input is determined at runtime and the appropriate fill-out
     * method is chosen based on the type. contenteditable, selector, inputs are
     * supported.
     */
    fill(value, options) {
        return firstValueFrom(this.#fill(value, options));
    }
    hover(options) {
        return firstValueFrom(this.#hover(options));
    }
    scroll(options) {
        return firstValueFrom(this.#scroll(options));
    }
}
//# sourceMappingURL=Locator.js.map