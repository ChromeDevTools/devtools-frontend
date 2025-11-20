import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Formatter from '../../../../models/formatter/formatter.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as CodeMirror from '../../../../third_party/codemirror.next/codemirror.next.js';
import * as TextEditor from '../../../components/text_editor/text_editor.js';
import * as UI from '../../legacy.js';
export interface SourceFrameOptions {
    lineNumbers?: boolean;
    lineWrapping?: boolean;
}
export declare const enum Events {
    EDITOR_UPDATE = "EditorUpdate",
    EDITOR_SCROLL = "EditorScroll"
}
export interface EventTypes {
    [Events.EDITOR_UPDATE]: CodeMirror.ViewUpdate;
    [Events.EDITOR_SCROLL]: void;
}
type FormatFn = (lineNo: number, state: CodeMirror.EditorState) => string;
export declare const LINE_NUMBER_FORMATTER: CodeMirror.Facet<FormatFn, FormatFn>;
declare const SourceFrameImpl_base: (new (...args: any[]) => {
    addEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends keyof EventTypes>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends keyof EventTypes>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: keyof EventTypes): boolean;
    dispatchEventToListeners<T extends keyof EventTypes>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.View.SimpleView;
export declare class SourceFrameImpl extends SourceFrameImpl_base implements UI.SearchableView.Searchable, UI.SearchableView.Replaceable, Transformer {
    #private;
    private readonly options;
    private readonly lazyContent;
    private prettyInternal;
    private rawContent;
    protected formattedMap: Formatter.ScriptFormatter.FormatterSourceMapping | null;
    private readonly prettyToggle;
    private shouldAutoPrettyPrint;
    private readonly progressToolbarItem;
    private textEditorInternal;
    private baseDoc;
    private prettyBaseDoc;
    private displayedSelection;
    private searchConfig;
    private delayedFindSearchMatches;
    private currentSearchResultIndex;
    private searchResults;
    private searchRegex;
    private loadError;
    private readonly sourcePosition;
    private searchableView;
    private editable;
    private positionToReveal;
    private lineToScrollTo;
    private selectionToSet;
    private loadedInternal;
    private contentRequested;
    private wasmDisassemblyInternal;
    contentSet: boolean;
    private selfXssWarningDisabledSetting;
    constructor(lazyContent: () => Promise<TextUtils.ContentData.ContentDataOrError>, options?: SourceFrameOptions);
    disposeView(): void;
    private placeholderEditorState;
    protected editorConfiguration(doc: string | CodeMirror.Text): CodeMirror.Extension;
    protected onBlur(): void;
    protected onFocus(): void;
    protected onPaste(): boolean;
    showSelfXssWarning(): Promise<void>;
    get wasmDisassembly(): TextUtils.WasmDisassembly.WasmDisassembly | null;
    editorLocationToUILocation(lineNumber: number, columnNumber: number): {
        lineNumber: number;
        columnNumber: number;
    };
    editorLocationToUILocation(lineNumber: number): {
        lineNumber: number;
        columnNumber: number | undefined;
    };
    uiLocationToEditorLocation(lineNumber: number, columnNumber?: number | undefined): {
        lineNumber: number;
        columnNumber: number;
    };
    setCanPrettyPrint(canPrettyPrint: boolean, autoPrettyPrint?: boolean): void;
    setEditable(editable: boolean): void;
    private setPretty;
    private getLineNumberFormatter;
    private updateLineNumberFormatter;
    private updatePrettyPrintState;
    private prettyToRawLocation;
    private rawToPrettyLocation;
    hasLoadError(): boolean;
    wasShown(): void;
    willHide(): void;
    toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]>;
    get loaded(): boolean;
    get textEditor(): TextEditor.TextEditor.TextEditor;
    get pretty(): boolean;
    get contentType(): string;
    protected getContentType(): string;
    private ensureContentLoaded;
    protected setContentDataOrError(contentDataPromise: Promise<TextUtils.ContentData.ContentDataOrError>): Promise<void>;
    revealPosition(position: RevealPosition, shouldHighlight?: boolean): void;
    private clearPositionToReveal;
    scrollToLine(line: number): void;
    setSelection(textRange: TextUtils.TextRange.TextRange): void;
    private wasShownOrLoaded;
    onTextChanged(): void;
    isClean(): boolean;
    contentCommitted(): void;
    protected getLanguageSupport(content: string | CodeMirror.Text): Promise<CodeMirror.Extension>;
    updateLanguageMode(content: string): Promise<void>;
    setContent(content: string | CodeMirror.Text): Promise<void>;
    setSearchableView(view: UI.SearchableView.SearchableView | null): void;
    private doFindSearchMatches;
    performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void;
    private resetCurrentSearchResultIndex;
    private resetSearch;
    onSearchCanceled(): void;
    jumpToLastSearchResult(): void;
    private searchResultIndexForCurrentSelection;
    jumpToNextSearchResult(): void;
    jumpToPreviousSearchResult(): void;
    supportsCaseSensitiveSearch(): boolean;
    supportsWholeWordSearch(): boolean;
    supportsRegexSearch(): boolean;
    jumpToSearchResult(index: number): void;
    replaceSelectionWith(_searchConfig: UI.SearchableView.SearchConfig, replacement: string): void;
    replaceAllWith(searchConfig: UI.SearchableView.SearchConfig, replacement: string): void;
    private collectRegexMatches;
    canEditSource(): boolean;
    private updateSourcePosition;
    onContextMenu(event: MouseEvent): boolean;
    protected populateTextAreaContextMenu(_menu: UI.ContextMenu.ContextMenu, _lineNumber: number, _columnNumber: number): void;
    onLineGutterContextMenu(position: number, event: MouseEvent): boolean;
    protected populateLineGutterContextMenu(_menu: UI.ContextMenu.ContextMenu, _lineNumber: number): void;
    focus(): void;
}
export interface Transformer {
    editorLocationToUILocation(lineNumber: number, columnNumber: number): {
        lineNumber: number;
        columnNumber: number;
    };
    editorLocationToUILocation(lineNumber: number): {
        lineNumber: number;
        columnNumber: number | undefined;
    };
    uiLocationToEditorLocation(lineNumber: number, columnNumber?: number): {
        lineNumber: number;
        columnNumber: number;
    };
}
/** Effect to add lines (by position) to the set of non-breakable lines. **/
export declare const addNonBreakableLines: CodeMirror.StateEffectType<readonly number[]>;
export declare function isBreakableLine(state: CodeMirror.EditorState, line: CodeMirror.Line): boolean;
/**
 * Reveal position can either be a single point or a range.
 *
 * A single point can either be specified as a line/column combo or as an absolute
 * editor offset.
 */
export type RevealPosition = number | {
    lineNumber: number;
    columnNumber?: number;
} | {
    from: {
        lineNumber: number;
        columnNumber: number;
    };
    to: {
        lineNumber: number;
        columnNumber: number;
    };
};
/** This is usually an Infobar but is also used for AiCodeCompletionSummaryToolbar **/
export interface SourceFrameInfobar {
    element: HTMLElement;
    order?: number;
}
/** Infobar panel state, used to show additional panels below the editor. **/
export declare const addSourceFrameInfobar: CodeMirror.StateEffectType<SourceFrameInfobar>;
export declare const removeSourceFrameInfobar: CodeMirror.StateEffectType<SourceFrameInfobar>;
export {};
