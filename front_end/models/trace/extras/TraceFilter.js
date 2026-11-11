// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Types from '../types/types.js';
export class TraceFilter {
}
export class VisibleEventsFilter extends TraceFilter {
    // Real traces contain ~15 distinct category strings; memoizing the substring
    // checks avoids scanning event.cat on every event in hot tree-build loops.
    static #categoryToEventName = new Map();
    visibleTypes;
    constructor(visibleTypes) {
        super();
        this.visibleTypes = new Set(visibleTypes);
    }
    accept(event) {
        if (Types.Extensions.isSyntheticExtensionEntry(event)) {
            return true;
        }
        return this.visibleTypes.has(VisibleEventsFilter.eventType(event));
    }
    static eventType(event) {
        let type = VisibleEventsFilter.#categoryToEventName.get(event.cat);
        if (type === undefined) {
            if (event.cat.includes('blink.console')) {
                type = Types.Events.Name.CONSOLE_TIME;
            }
            else if (event.cat.includes('blink.user_timing')) {
                type = Types.Events.Name.USER_TIMING;
            }
            else {
                type = null;
            }
            if (VisibleEventsFilter.#categoryToEventName.size < 256) {
                VisibleEventsFilter.#categoryToEventName.set(event.cat, type);
            }
        }
        return type ?? event.name;
    }
}
export class InvisibleEventsFilter extends TraceFilter {
    #invisibleTypes;
    constructor(invisibleTypes) {
        super();
        this.#invisibleTypes = new Set(invisibleTypes);
    }
    accept(event) {
        return !this.#invisibleTypes.has(VisibleEventsFilter.eventType(event));
    }
}
export class ExclusiveNameFilter extends TraceFilter {
    #excludeNames;
    constructor(excludeNames) {
        super();
        this.#excludeNames = new Set(excludeNames);
    }
    accept(event) {
        return !this.#excludeNames.has(event.name);
    }
}
//# sourceMappingURL=TraceFilter.js.map