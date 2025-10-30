import './Toolbar.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type { Suggestions } from './SuggestBox.js';
import { type ToolbarButton } from './Toolbar.js';
import { HBox } from './Widget.js';
declare const FilterBar_base: (new (...args: any[]) => {
    addEventListener<T extends FilterBarEvents.CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<FilterBarEventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<FilterBarEventTypes, T>;
    once<T extends FilterBarEvents.CHANGED>(eventType: T): Promise<FilterBarEventTypes[T]>;
    removeEventListener<T extends FilterBarEvents.CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<FilterBarEventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: FilterBarEvents.CHANGED): boolean;
    dispatchEventToListeners<T extends FilterBarEvents.CHANGED>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<FilterBarEventTypes, T>): void;
}) & typeof HBox;
export declare class FilterBar extends FilterBar_base {
    #private;
    private enabled;
    private readonly stateSetting;
    private filters;
    private alwaysShowFilters?;
    private showingWidget?;
    constructor(name: string, visibleByDefault?: boolean);
    filterButton(): ToolbarButton;
    addDivider(): void;
    addFilter(filter: FilterUI): void;
    setEnabled(enabled: boolean): void;
    private filterChanged;
    wasShown(): void;
    private updateFilterBar;
    focus(): void;
    hasActiveFilter(): boolean;
    private updateFilterButton;
    clear(): void;
    setting(): Common.Settings.Setting<boolean>;
    visible(): boolean;
}
export declare const enum FilterBarEvents {
    CHANGED = "Changed"
}
export interface FilterBarEventTypes {
    [FilterBarEvents.CHANGED]: void;
}
export interface FilterUI extends Common.EventTarget.EventTarget<FilterUIEventTypes> {
    isActive(): boolean;
    element(): Element;
}
export declare const enum FilterUIEvents {
    FILTER_CHANGED = "FilterChanged"
}
export interface FilterUIEventTypes {
    [FilterUIEvents.FILTER_CHANGED]: void;
}
export declare class TextFilterUI extends Common.ObjectWrapper.ObjectWrapper<FilterUIEventTypes> implements FilterUI {
    #private;
    private readonly filterElement;
    private suggestionProvider;
    constructor();
    private completions;
    isActive(): boolean;
    element(): Element;
    value(): string;
    setValue(value: string): void;
    focus(): void;
    setSuggestionProvider(suggestionProvider: (arg0: string, arg1: string, arg2?: boolean | undefined) => Promise<Suggestions>): void;
    private valueChanged;
    clear(): void;
}
interface NamedBitSetFilterUIOptions {
    items: Item[];
    setting?: Common.Settings.Setting<Record<string, boolean>>;
}
export declare class NamedBitSetFilterUIElement extends HTMLElement {
    #private;
    set options(options: NamedBitSetFilterUIOptions);
    getOrCreateNamedBitSetFilterUI(): NamedBitSetFilterUI;
}
export declare class NamedBitSetFilterUI extends Common.ObjectWrapper.ObjectWrapper<FilterUIEventTypes> implements FilterUI {
    private readonly filtersElement;
    private readonly typeFilterElementTypeNames;
    private allowedTypes;
    private readonly typeFilterElements;
    private readonly setting;
    constructor(items: Item[], setting?: Common.Settings.Setting<Record<string, boolean>>);
    reset(): void;
    isActive(): boolean;
    element(): Element;
    accept(typeName: string): boolean;
    private settingChanged;
    private update;
    private addBit;
    private onTypeFilterClicked;
    private onTypeFilterKeydown;
    private keyFocusNextBit;
    private toggleTypeFilter;
    static readonly ALL_TYPES = "all";
}
export declare class CheckboxFilterUI extends Common.ObjectWrapper.ObjectWrapper<FilterUIEventTypes> implements FilterUI {
    private readonly filterElement;
    private readonly activeWhenChecked;
    private checkbox;
    constructor(title: Common.UIString.LocalizedString, activeWhenChecked?: boolean, setting?: Common.Settings.Setting<boolean>, jslogContext?: string);
    isActive(): boolean;
    checked(): boolean;
    setChecked(checked: boolean): void;
    element(): HTMLDivElement;
    labelElement(): Element;
    private fireUpdated;
}
export interface Item {
    name: string;
    label: () => string;
    title?: string;
    jslogContext: string;
}
export {};
