/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
import { AsyncDirective } from '../async-directive.js';
import { isPrimitive } from '../directive-helpers.js';
import { directive } from '../directive.js';
import { noChange } from '../lit-html.js';

const isPromise = (x) => {
    return !isPrimitive(x) && typeof x.then === 'function';
};
// Effectively infinity, but a SMI.
const _infinity = 0x7fffffff;
class UntilDirective extends AsyncDirective {
    constructor() {
        super(...arguments);
        this._lastRenderedIndex = _infinity;
        this._values = [];
    }
    render(...args) {
        var _a;
        return (_a = args.find((x) => !isPromise(x))) !== null && _a !== void 0 ? _a : noChange;
    }
    update(_part, args) {
        const previousValues = this._values;
        let previousLength = previousValues.length;
        this._values = args;
        for (let i = 0; i < args.length; i++) {
            // If we've rendered a higher-priority value already, stop.
            if (i > this._lastRenderedIndex) {
                break;
            }
            const value = args[i];
            // Render non-Promise values immediately
            if (!isPromise(value)) {
                this._lastRenderedIndex = i;
                // Since a lower-priority value will never overwrite a higher-priority
                // synchronous value, we can stop processing now.
                return value;
            }
            // If this is a Promise we've already handled, skip it.
            if (i < previousLength && value === previousValues[i]) {
                continue;
            }
            // We have a Promise that we haven't seen before, so priorities may have
            // changed. Forget what we rendered before.
            this._lastRenderedIndex = _infinity;
            previousLength = 0;
            Promise.resolve(value).then((resolvedValue) => {
                const index = this._values.indexOf(value);
                // If state.values doesn't contain the value, we've re-rendered without
                // the value, so don't render it. Then, only render if the value is
                // higher-priority than what's already been rendered.
                if (index > -1 && index < this._lastRenderedIndex) {
                    this._lastRenderedIndex = index;
                    this.setValue(resolvedValue);
                }
            });
        }
        return noChange;
    }
}
/**
 * Renders one of a series of values, including Promises, to a Part.
 *
 * Values are rendered in priority order, with the first argument having the
 * highest priority and the last argument having the lowest priority. If a
 * value is a Promise, low-priority values will be rendered until it resolves.
 *
 * The priority of values can be used to create placeholder content for async
 * data. For example, a Promise with pending content can be the first,
 * highest-priority, argument, and a non_promise loading indicator template can
 * be used as the second, lower-priority, argument. The loading indicator will
 * render immediately, and the primary content will render when the Promise
 * resolves.
 *
 * Example:
 *
 *     const content = fetch('./content.txt').then(r => r.text());
 *     html`${until(content, html`<span>Loading...</span>`)}`
 */
export const until = directive(UntilDirective);
//# sourceMappingURL=until.js.map