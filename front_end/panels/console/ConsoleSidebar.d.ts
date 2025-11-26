import * as Common from '../../core/common/common.js';
import type * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { ConsoleFilter, type LevelsMask } from './ConsoleFilter.js';
import type { ConsoleViewMessage } from './ConsoleViewMessage.js';
export declare const enum GroupName {
    CONSOLE_API = "user message",
    ALL = "message",
    ERROR = "error",
    WARNING = "warning",
    INFO = "info",
    VERBOSE = "verbose"
}
interface ViewInput {
    groups: ConsoleFilterGroup[];
    selectedFilter: ConsoleFilter;
    onSelectionChanged: (selectedFilter: ConsoleFilter) => void;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ConsoleFilterGroup {
    #private;
    readonly urlGroups: Map<string | null, {
        filter: ConsoleFilter;
        url: string | null;
        count: number;
    }>;
    messageCount: number;
    readonly name: GroupName;
    readonly filter: ConsoleFilter;
    constructor(name: GroupName, parsedFilters: TextUtils.TextUtils.ParsedFilter[], levelsMask: LevelsMask);
    onMessage(viewMessage: ConsoleViewMessage): void;
    clear(): void;
}
declare const ConsoleSidebar_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.FILTER_SELECTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.FILTER_SELECTED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.FILTER_SELECTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.FILTER_SELECTED): boolean;
    dispatchEventToListeners<T extends Events.FILTER_SELECTED>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class ConsoleSidebar extends ConsoleSidebar_base {
    #private;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
    clear(): void;
    onMessageAdded(viewMessage: ConsoleViewMessage): void;
    shouldBeVisible(viewMessage: ConsoleViewMessage): boolean;
}
export declare const enum Events {
    FILTER_SELECTED = "FilterSelected"
}
export interface EventTypes {
    [Events.FILTER_SELECTED]: void;
}
export {};
