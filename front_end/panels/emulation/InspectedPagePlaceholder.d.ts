import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
export type View = (input: undefined, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: View;
declare const InspectedPagePlaceholderBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.Widget<ShadowRoot>>;
export declare class InspectedPagePlaceholder extends InspectedPagePlaceholderBase {
    #private;
    constructor(element?: HTMLElement, view?: View);
    static instance(opts?: {
        forceNew: boolean | null;
    }): InspectedPagePlaceholder;
    wasShown(): void;
    performUpdate(): void;
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
