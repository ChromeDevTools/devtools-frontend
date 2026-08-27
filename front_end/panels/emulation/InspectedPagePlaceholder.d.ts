import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
declare const InspectedPagePlaceholder_base: import("../../core/platform/Constructor.js").Constructor<Common.EventTarget.EventTarget<EventTypes>, any[]> & typeof UI.Widget.Widget;
export declare class InspectedPagePlaceholder extends InspectedPagePlaceholder_base {
    constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): InspectedPagePlaceholder;
    restoreMinimumSize(): void;
    clearMinimumSize(): void;
    private dipPageRect;
    update(force?: boolean): void;
}
export declare const enum Events {
    UPDATE = "Update"
}
export interface Bounds {
    x: number;
    y: number;
    height: number;
    width: number;
}
export interface EventTypes {
    [Events.UPDATE]: Bounds;
}
export {};
