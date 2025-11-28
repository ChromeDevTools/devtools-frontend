import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import { type LitTemplate } from '../../../lit/lit.js';
import * as UI from '../../legacy.js';
declare const FilteredListWidget_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.HIDDEN>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.HIDDEN>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.HIDDEN>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.HIDDEN): boolean;
    dispatchEventToListeners<T extends Events.HIDDEN>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class FilteredListWidget extends FilteredListWidget_base implements UI.ListControl.ListDelegate<number> {
    private promptHistory;
    private scoringTimer;
    private filterTimer;
    private loadTimeout;
    private refreshListWithCurrentResult;
    private dialog;
    private query;
    private readonly inputBoxElement;
    private readonly hintElement;
    private readonly bottomElementsContainer;
    private readonly progressElement;
    private progressBarElement;
    private readonly items;
    private list;
    private readonly itemElementsContainer;
    private notFoundElement;
    private prefix;
    private provider;
    private readonly queryChangedCallback?;
    constructor(provider: Provider | null, promptHistory?: string[], queryChangedCallback?: ((arg0: string) => void));
    static getHighlightRanges(text: string, query: string, caseInsensitive?: boolean): string;
    setCommandPrefix(commandPrefix: string): void;
    setCommandSuggestion(suggestion: string): void;
    setHintElement(hint: string): void;
    showAsDialog(dialogTitle?: string): void;
    setPrefix(prefix: string): void;
    setProvider(provider: Provider | null): void;
    setQuerySelectedRange(startIndex: number, endIndex: number): void;
    private attachProvider;
    private cleanValue;
    wasShown(): void;
    willHide(): void;
    private clearTimers;
    private onEnter;
    private itemsLoaded;
    private updateAfterItemsLoaded;
    createElementForItem(item: number): Element;
    heightForItem(_item: number): number;
    isItemSelectable(_item: number): boolean;
    selectedItemChanged(_from: number | null, _to: number | null, fromElement: Element | null, toElement: Element | null): void;
    private onClick;
    private onMouseMove;
    setQuery(query: string): void;
    private tabKeyPressed;
    private itemsFilteredForTest;
    private filterItems;
    private refreshList;
    private updateNotFoundMessage;
    private onInput;
    private queryChanged;
    updateSelectedItemARIA(_fromElement: Element | null, _toElement: Element | null): boolean;
    private onKeyDown;
    private scheduleFilter;
    private selectItem;
}
export declare const enum Events {
    HIDDEN = "hidden"
}
export interface EventTypes {
    [Events.HIDDEN]: void;
}
export declare class Provider {
    private refreshCallback;
    jslogContext: string;
    constructor(jslogContext: string);
    setRefreshCallback(refreshCallback: () => void): void;
    attach(): void;
    itemCount(): number;
    itemKeyAt(_itemIndex: number): string;
    itemScoreAt(_itemIndex: number, _query: string): number;
    renderItem(_itemIndex: number, _query: string): LitTemplate;
    jslogContextAt(_itemIndex: number): string;
    selectItem(_itemIndex: number | null, _promptValue: string): void;
    refresh(): void;
    rewriteQuery(query: string): string;
    queryChanged(_query: string): void;
    notFoundText(_query: string): string;
    detach(): void;
}
export declare function registerProvider(registration: ProviderRegistration): void;
export declare function getRegisteredProviders(): ProviderRegistration[];
export interface ProviderRegistration {
    prefix: string;
    iconName: string;
    provider: () => Promise<Provider>;
    helpTitle: (() => string);
    titlePrefix: (() => string);
    titleSuggestion?: (() => string);
}
export {};
