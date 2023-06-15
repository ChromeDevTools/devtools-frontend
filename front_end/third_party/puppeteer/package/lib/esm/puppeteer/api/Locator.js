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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _LocatorImpl_instances, _LocatorImpl_pageOrFrame, _LocatorImpl_selector, _LocatorImpl_visibility, _LocatorImpl_timeout, _LocatorImpl_ensureElementIsInTheViewport, _LocatorImpl_waitForEnabled, _LocatorImpl_waitForStableBoundingBox, _LocatorImpl_waitForFunction, _LocatorImpl_ensureElementIsInTheViewportIfNeeded, _LocatorImpl_waitForVisibilityIfNeeded, _LocatorImpl_waitForEnabledIfNeeded, _LocatorImpl_waitForStableBoundingBoxIfNeeded, _LocatorImpl_run, _RaceLocatorImpl_instances, _RaceLocatorImpl_locators, _RaceLocatorImpl_runRace;
import { TimeoutError } from '../common/Errors.js';
import { EventEmitter } from '../common/EventEmitter.js';
import { debugError } from '../common/util.js';
import { isErrorLike } from '../util/ErrorLike.js';
/**
 * Timeout for individual operations inside the locator. On errors the
 * operation is retried as long as {@link Locator.setTimeout} is not
 * exceeded. This timeout should be generally much lower as locating an
 * element means multiple asynchronious operations.
 */
const CONDITION_TIMEOUT = 1000;
const WAIT_FOR_FUNCTION_DELAY = 100;
/**
 * All the events that a locator instance may emit.
 *
 * @public
 */
export var LocatorEmittedEvents;
(function (LocatorEmittedEvents) {
    /**
     * Emitted every time before the locator performs an action on the located element(s).
     */
    LocatorEmittedEvents["Action"] = "action";
})(LocatorEmittedEvents || (LocatorEmittedEvents = {}));
/**
 * Locators describe a strategy of locating elements and performing an action on
 * them. If the action fails because the element is not ready for the action,
 * the whole operation is retried. Various preconditions for a successful action
 * are checked automatically.
 *
 * @public
 */
export class Locator extends EventEmitter {
    /**
     * @internal
     */
    static create(pageOrFrame, selector) {
        return new LocatorImpl(pageOrFrame, selector).setTimeout('getDefaultTimeout' in pageOrFrame
            ? pageOrFrame.getDefaultTimeout()
            : pageOrFrame.page().getDefaultTimeout());
    }
    /**
     * Creates a race between multiple locators but ensures that only a single one
     * acts.
     */
    static race(locators) {
        return new RaceLocatorImpl(locators);
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
}
/**
 * @internal
 */
export class LocatorImpl extends Locator {
    constructor(pageOrFrame, selector) {
        super();
        _LocatorImpl_instances.add(this);
        _LocatorImpl_pageOrFrame.set(this, void 0);
        _LocatorImpl_selector.set(this, void 0);
        _LocatorImpl_visibility.set(this, 'visible');
        _LocatorImpl_timeout.set(this, 30000);
        _LocatorImpl_ensureElementIsInTheViewport.set(this, true);
        _LocatorImpl_waitForEnabled.set(this, true);
        _LocatorImpl_waitForStableBoundingBox.set(this, true);
        /**
         * Checks if the element is in the viewport and auto-scrolls it if it is not.
         */
        _LocatorImpl_ensureElementIsInTheViewportIfNeeded.set(this, async (element, signal) => {
            if (!__classPrivateFieldGet(this, _LocatorImpl_ensureElementIsInTheViewport, "f")) {
                return;
            }
            // Side-effect: this also checks if it is connected.
            const isIntersectingViewport = await element.isIntersectingViewport({
                threshold: 0,
            });
            signal?.throwIfAborted();
            if (!isIntersectingViewport) {
                await element.scrollIntoView();
                signal?.throwIfAborted();
                await __classPrivateFieldGet(this, _LocatorImpl_instances, "m", _LocatorImpl_waitForFunction).call(this, async () => {
                    return await element.isIntersectingViewport({
                        threshold: 0,
                    });
                }, signal);
                signal?.throwIfAborted();
            }
        });
        /**
         * Waits for the element to become visible or hidden. visibility === 'visible'
         * means that the element has a computed style, the visibility property other
         * than 'hidden' or 'collapse' and non-empty bounding box. visibility ===
         * 'hidden' means the opposite of that.
         */
        _LocatorImpl_waitForVisibilityIfNeeded.set(this, async (element, signal) => {
            if (__classPrivateFieldGet(this, _LocatorImpl_visibility, "f") === null) {
                return;
            }
            if (__classPrivateFieldGet(this, _LocatorImpl_visibility, "f") === 'hidden') {
                await __classPrivateFieldGet(this, _LocatorImpl_instances, "m", _LocatorImpl_waitForFunction).call(this, async () => {
                    return element.isHidden();
                }, signal);
            }
            await __classPrivateFieldGet(this, _LocatorImpl_instances, "m", _LocatorImpl_waitForFunction).call(this, async () => {
                return element.isVisible();
            }, signal);
        });
        /**
         * If the element is a button, textarea, input or select, wait till the
         * element becomes enabled.
         */
        _LocatorImpl_waitForEnabledIfNeeded.set(this, async (element, signal) => {
            if (!__classPrivateFieldGet(this, _LocatorImpl_waitForEnabled, "f")) {
                return;
            }
            await __classPrivateFieldGet(this, _LocatorImpl_pageOrFrame, "f").waitForFunction(el => {
                if (['button', 'textarea', 'input', 'select'].includes(el.tagName)) {
                    return !el.disabled;
                }
                return true;
            }, {
                timeout: CONDITION_TIMEOUT,
                signal,
            }, element);
        });
        /**
         * Compares the bounding box of the element for two consecutive animation
         * frames and waits till they are the same.
         */
        _LocatorImpl_waitForStableBoundingBoxIfNeeded.set(this, async (element, signal) => {
            if (!__classPrivateFieldGet(this, _LocatorImpl_waitForStableBoundingBox, "f")) {
                return;
            }
            function getClientRect() {
                return element.evaluate(el => {
                    return new Promise(resolve => {
                        window.requestAnimationFrame(() => {
                            const rect1 = el.getBoundingClientRect();
                            window.requestAnimationFrame(() => {
                                const rect2 = el.getBoundingClientRect();
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
                });
            }
            await __classPrivateFieldGet(this, _LocatorImpl_instances, "m", _LocatorImpl_waitForFunction).call(this, async () => {
                const [rect1, rect2] = await getClientRect();
                return (rect1.x === rect2.x &&
                    rect1.y === rect2.y &&
                    rect1.width === rect2.width &&
                    rect1.height === rect2.height);
            }, signal);
        });
        __classPrivateFieldSet(this, _LocatorImpl_pageOrFrame, pageOrFrame, "f");
        __classPrivateFieldSet(this, _LocatorImpl_selector, selector, "f");
    }
    setVisibility(visibility) {
        __classPrivateFieldSet(this, _LocatorImpl_visibility, visibility, "f");
        return this;
    }
    setTimeout(timeout) {
        __classPrivateFieldSet(this, _LocatorImpl_timeout, timeout, "f");
        return this;
    }
    setEnsureElementIsInTheViewport(value) {
        __classPrivateFieldSet(this, _LocatorImpl_ensureElementIsInTheViewport, value, "f");
        return this;
    }
    setWaitForEnabled(value) {
        __classPrivateFieldSet(this, _LocatorImpl_waitForEnabled, value, "f");
        return this;
    }
    setWaitForStableBoundingBox(value) {
        __classPrivateFieldSet(this, _LocatorImpl_waitForStableBoundingBox, value, "f");
        return this;
    }
    async click(clickOptions) {
        return await __classPrivateFieldGet(this, _LocatorImpl_instances, "m", _LocatorImpl_run).call(this, async (element) => {
            await element.click(clickOptions);
        }, {
            signal: clickOptions?.signal,
            conditions: [
                __classPrivateFieldGet(this, _LocatorImpl_ensureElementIsInTheViewportIfNeeded, "f"),
                __classPrivateFieldGet(this, _LocatorImpl_waitForVisibilityIfNeeded, "f"),
                __classPrivateFieldGet(this, _LocatorImpl_waitForEnabledIfNeeded, "f"),
                __classPrivateFieldGet(this, _LocatorImpl_waitForStableBoundingBoxIfNeeded, "f"),
            ],
        });
    }
    /**
     * Fills out the input identified by the locator using the provided value. The
     * type of the input is determined at runtime and the appropriate fill-out
     * method is chosen based on the type. contenteditable, selector, inputs are
     * supported.
     */
    async fill(value, fillOptions) {
        return await __classPrivateFieldGet(this, _LocatorImpl_instances, "m", _LocatorImpl_run).call(this, async (element) => {
            const input = element;
            const inputType = await input.evaluate(el => {
                if (el instanceof HTMLSelectElement) {
                    return 'select';
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
            });
            switch (inputType) {
                case 'select':
                    await input.select(value);
                    break;
                case 'contenteditable':
                case 'typeable-input':
                    const textToType = await input.evaluate((input, newValue) => {
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
                    }, value);
                    await input.type(textToType);
                    break;
                case 'other-input':
                    await input.focus();
                    await input.evaluate((input, value) => {
                        input.value = value;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }, value);
                    break;
                case 'unknown':
                    throw new Error(`Element cannot be filled out.`);
            }
        }, {
            signal: fillOptions?.signal,
            conditions: [
                __classPrivateFieldGet(this, _LocatorImpl_ensureElementIsInTheViewportIfNeeded, "f"),
                __classPrivateFieldGet(this, _LocatorImpl_waitForVisibilityIfNeeded, "f"),
                __classPrivateFieldGet(this, _LocatorImpl_waitForEnabledIfNeeded, "f"),
                __classPrivateFieldGet(this, _LocatorImpl_waitForStableBoundingBoxIfNeeded, "f"),
            ],
        });
    }
    async hover(hoverOptions) {
        return await __classPrivateFieldGet(this, _LocatorImpl_instances, "m", _LocatorImpl_run).call(this, async (element) => {
            await element.hover();
        }, {
            signal: hoverOptions?.signal,
            conditions: [
                __classPrivateFieldGet(this, _LocatorImpl_ensureElementIsInTheViewportIfNeeded, "f"),
                __classPrivateFieldGet(this, _LocatorImpl_waitForVisibilityIfNeeded, "f"),
                __classPrivateFieldGet(this, _LocatorImpl_waitForStableBoundingBoxIfNeeded, "f"),
            ],
        });
    }
    async scroll(scrollOptions) {
        return await __classPrivateFieldGet(this, _LocatorImpl_instances, "m", _LocatorImpl_run).call(this, async (element) => {
            await element.evaluate((el, scrollTop, scrollLeft) => {
                if (scrollTop !== undefined) {
                    el.scrollTop = scrollTop;
                }
                if (scrollLeft !== undefined) {
                    el.scrollLeft = scrollLeft;
                }
            }, scrollOptions?.scrollTop, scrollOptions?.scrollLeft);
        }, {
            signal: scrollOptions?.signal,
            conditions: [
                __classPrivateFieldGet(this, _LocatorImpl_ensureElementIsInTheViewportIfNeeded, "f"),
                __classPrivateFieldGet(this, _LocatorImpl_waitForVisibilityIfNeeded, "f"),
                __classPrivateFieldGet(this, _LocatorImpl_waitForStableBoundingBoxIfNeeded, "f"),
            ],
        });
    }
}
_LocatorImpl_pageOrFrame = new WeakMap(), _LocatorImpl_selector = new WeakMap(), _LocatorImpl_visibility = new WeakMap(), _LocatorImpl_timeout = new WeakMap(), _LocatorImpl_ensureElementIsInTheViewport = new WeakMap(), _LocatorImpl_waitForEnabled = new WeakMap(), _LocatorImpl_waitForStableBoundingBox = new WeakMap(), _LocatorImpl_ensureElementIsInTheViewportIfNeeded = new WeakMap(), _LocatorImpl_waitForVisibilityIfNeeded = new WeakMap(), _LocatorImpl_waitForEnabledIfNeeded = new WeakMap(), _LocatorImpl_waitForStableBoundingBoxIfNeeded = new WeakMap(), _LocatorImpl_instances = new WeakSet(), _LocatorImpl_waitForFunction = 
/**
 * Retries the `fn` until a truthy result is returned.
 */
async function _LocatorImpl_waitForFunction(fn, signal, timeout = CONDITION_TIMEOUT) {
    let isActive = true;
    let controller;
    // If the loop times out, we abort only the last iteration's controller.
    const timeoutId = timeout
        ? setTimeout(() => {
            isActive = false;
            controller?.abort();
        }, timeout)
        : 0;
    // If the user's signal aborts, we abort the last iteration and the loop.
    signal?.addEventListener('abort', () => {
        controller?.abort();
        isActive = false;
        clearTimeout(timeoutId);
    }, { once: true });
    while (isActive) {
        controller = new AbortController();
        try {
            const result = await fn(controller.signal);
            if (result) {
                clearTimeout(timeoutId);
                return;
            }
        }
        catch (err) {
            if (isErrorLike(err)) {
                debugError(err);
                // Retry on all timeouts.
                if (err instanceof TimeoutError) {
                    continue;
                }
                // Abort error are ignored as they only affect one iteration.
                if (err.name === 'AbortError') {
                    continue;
                }
            }
            throw err;
        }
        finally {
            // We abort any operations that might have been started by `fn`, because
            // the iteration is now over.
            controller.abort();
        }
        await new Promise(resolve => {
            return setTimeout(resolve, WAIT_FOR_FUNCTION_DELAY);
        });
    }
    signal?.throwIfAborted();
    throw new TimeoutError(`waitForFunction timed out. The timeout is ${timeout}ms.`);
}, _LocatorImpl_run = async function _LocatorImpl_run(action, options) {
    await __classPrivateFieldGet(this, _LocatorImpl_instances, "m", _LocatorImpl_waitForFunction).call(this, async (signal) => {
        // 1. Select the element without visibility checks.
        const element = await __classPrivateFieldGet(this, _LocatorImpl_pageOrFrame, "f").waitForSelector(__classPrivateFieldGet(this, _LocatorImpl_selector, "f"), {
            visible: false,
            timeout: __classPrivateFieldGet(this, _LocatorImpl_timeout, "f"),
            signal,
        });
        // Retry if no element is found.
        if (!element) {
            return false;
        }
        try {
            signal?.throwIfAborted();
            // 2. Perform action specific checks.
            await Promise.all(options?.conditions.map(check => {
                return check(element, signal);
            }) || []);
            signal?.throwIfAborted();
            // 3. Perform the action
            this.emit(LocatorEmittedEvents.Action);
            await action(element);
            return true;
        }
        finally {
            void element.dispose().catch(debugError);
        }
    }, options?.signal, __classPrivateFieldGet(this, _LocatorImpl_timeout, "f"));
};
/**
 * @internal
 */
class RaceLocatorImpl extends Locator {
    constructor(locators) {
        super();
        _RaceLocatorImpl_instances.add(this);
        _RaceLocatorImpl_locators.set(this, void 0);
        __classPrivateFieldSet(this, _RaceLocatorImpl_locators, locators, "f");
    }
    setVisibility(visibility) {
        for (const locator of __classPrivateFieldGet(this, _RaceLocatorImpl_locators, "f")) {
            locator.setVisibility(visibility);
        }
        return this;
    }
    setTimeout(timeout) {
        for (const locator of __classPrivateFieldGet(this, _RaceLocatorImpl_locators, "f")) {
            locator.setTimeout(timeout);
        }
        return this;
    }
    setEnsureElementIsInTheViewport(value) {
        for (const locator of __classPrivateFieldGet(this, _RaceLocatorImpl_locators, "f")) {
            locator.setEnsureElementIsInTheViewport(value);
        }
        return this;
    }
    setWaitForEnabled(value) {
        for (const locator of __classPrivateFieldGet(this, _RaceLocatorImpl_locators, "f")) {
            locator.setWaitForEnabled(value);
        }
        return this;
    }
    setWaitForStableBoundingBox(value) {
        for (const locator of __classPrivateFieldGet(this, _RaceLocatorImpl_locators, "f")) {
            locator.setWaitForStableBoundingBox(value);
        }
        return this;
    }
    async click(clickOptions) {
        return await __classPrivateFieldGet(this, _RaceLocatorImpl_instances, "m", _RaceLocatorImpl_runRace).call(this, (locator, abortSignal) => {
            return locator.click({
                ...clickOptions,
                signal: abortSignal,
            });
        }, {
            signal: clickOptions?.signal,
        });
    }
    async fill(value, fillOptions) {
        return await __classPrivateFieldGet(this, _RaceLocatorImpl_instances, "m", _RaceLocatorImpl_runRace).call(this, (locator, abortSignal) => {
            return locator.fill(value, {
                ...fillOptions,
                signal: abortSignal,
            });
        }, {
            signal: fillOptions?.signal,
        });
    }
    async hover(hoverOptions) {
        return await __classPrivateFieldGet(this, _RaceLocatorImpl_instances, "m", _RaceLocatorImpl_runRace).call(this, (locator, abortSignal) => {
            return locator.hover({
                ...hoverOptions,
                signal: abortSignal,
            });
        }, {
            signal: hoverOptions?.signal,
        });
    }
    async scroll(scrollOptions) {
        return await __classPrivateFieldGet(this, _RaceLocatorImpl_instances, "m", _RaceLocatorImpl_runRace).call(this, (locator, abortSignal) => {
            return locator.scroll({
                ...scrollOptions,
                signal: abortSignal,
            });
        }, {
            signal: scrollOptions?.signal,
        });
    }
}
_RaceLocatorImpl_locators = new WeakMap(), _RaceLocatorImpl_instances = new WeakSet(), _RaceLocatorImpl_runRace = async function _RaceLocatorImpl_runRace(action, options) {
    const abortControllers = new WeakMap();
    // Abort all locators if the user-provided signal aborts.
    options.signal?.addEventListener('abort', () => {
        for (const locator of __classPrivateFieldGet(this, _RaceLocatorImpl_locators, "f")) {
            abortControllers.get(locator)?.abort();
        }
    });
    const handleLocatorAction = (locator) => {
        return () => {
            // When one locator is ready to act, we will abort other locators.
            for (const other of __classPrivateFieldGet(this, _RaceLocatorImpl_locators, "f")) {
                if (other !== locator) {
                    abortControllers.get(other)?.abort();
                }
            }
            this.emit(LocatorEmittedEvents.Action);
        };
    };
    const createAbortController = (locator) => {
        const abortController = new AbortController();
        abortControllers.set(locator, abortController);
        return abortController;
    };
    await Promise.allSettled(__classPrivateFieldGet(this, _RaceLocatorImpl_locators, "f").map(locator => {
        return action(locator.on(LocatorEmittedEvents.Action, handleLocatorAction(locator)), createAbortController(locator).signal);
    }));
    options.signal?.throwIfAborted();
};
//# sourceMappingURL=Locator.js.map