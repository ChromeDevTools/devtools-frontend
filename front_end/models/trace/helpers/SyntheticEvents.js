// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
let activeManager = null;
export class SyntheticEventsManager {
    /**
     * All synthetic entries created in a trace from a corresponding trace events.
     * (ProfileCalls are excluded because they are not based on a real trace event)
     */
    #syntheticTraces = [];
    /**
     * All raw entries from a trace.
     */
    #rawTraceEvents = [];
    static activate(manager) {
        activeManager = manager;
    }
    static createAndActivate(rawEvents) {
        const manager = new SyntheticEventsManager(rawEvents);
        SyntheticEventsManager.activate(manager);
        return manager;
    }
    static getActiveManager() {
        if (!activeManager) {
            throw new Error('Attempted to get a SyntheticEventsManager without initializing');
        }
        return activeManager;
    }
    static reset() {
        activeManager = null;
    }
    static registerSyntheticEvent(syntheticEvent) {
        try {
            return SyntheticEventsManager.getActiveManager().#registerSyntheticEvent(syntheticEvent);
        }
        catch {
            // If no active manager has been initialized, we assume the trace engine is
            // not running as part of the Performance panel. In this case we don't
            // register synthetic events because we don't need to support timeline
            // modifications serialization.
            return syntheticEvent;
        }
    }
    constructor(rawEvents) {
        this.#rawTraceEvents = rawEvents;
    }
    /**
     * Registers and returns a branded synthetic event. Synthetic events need to
     * be created with this method to ensure they are registered and made
     * available to load events using serialized keys.
     */
    #registerSyntheticEvent(syntheticEvent) {
        const rawIndex = this.#rawTraceEvents.indexOf(syntheticEvent.rawSourceEvent);
        if (rawIndex < 0) {
            throw new Error('Attempted to register a synthetic event paired to an unknown raw event.');
        }
        const eventAsSynthetic = syntheticEvent;
        this.#syntheticTraces[rawIndex] = eventAsSynthetic;
        return eventAsSynthetic;
    }
    syntheticEventForRawEventIndex(rawEventIndex) {
        const syntheticEvent = this.#syntheticTraces.at(rawEventIndex);
        if (!syntheticEvent) {
            throw new Error(`Attempted to get a synthetic event from an unknown raw event index: ${rawEventIndex}`);
        }
        return syntheticEvent;
    }
    getSyntheticTraces() {
        return this.#syntheticTraces;
    }
    getRawTraceEvents() {
        return this.#rawTraceEvents;
    }
}
//# sourceMappingURL=SyntheticEvents.js.map