import type * as Foundation from '../../foundation/foundation.js';
export declare class UniverseRequestEvent extends Event {
    static readonly eventName = "universerequest";
    /**
     * The `Universe` will be filled in by the `RootView` in the event handler.
     * Widget.ts dispatches a new UniverseRequestEvent, and retrieves the Universe from the event right after.
     */
    universe?: Foundation.Universe.Universe;
    constructor();
}
