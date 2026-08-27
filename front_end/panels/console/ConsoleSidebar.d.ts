import * as Common from '../../core/common/common.js';
import type * as TextUtils from '../../core/text_utils/text_utils.js';
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
export type View = (input: ViewInput, output: object, target: HTMLElement | DocumentFragment) => void;
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
declare const ConsoleSidebar_base: import("../../core/platform/Constructor.js").Constructor<Common.EventTarget.EventTarget<EventTypes>, any[]> & typeof UI.Widget.VBox<ShadowRoot>;
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
