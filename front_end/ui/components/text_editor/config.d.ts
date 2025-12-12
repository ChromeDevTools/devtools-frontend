import type * as Host from '../../../core/host/host.js';
import * as CM from '../../../third_party/codemirror.next/codemirror.next.js';
export declare const dynamicSetting: CM.Facet<DynamicSetting<unknown>, readonly DynamicSetting<unknown>[]>;
export declare class DynamicSetting<T> {
    readonly settingName: string;
    private readonly getExtension;
    compartment: CM.Compartment;
    constructor(settingName: string, getExtension: (value: T) => CM.Extension);
    settingValue(): T;
    instance(): CM.Extension;
    sync(state: CM.EditorState, value: T): CM.StateEffect<unknown> | null;
    static bool(name: string, enabled: CM.Extension, disabled?: CM.Extension): DynamicSetting<boolean>;
    static none: ReadonlyArray<DynamicSetting<unknown>>;
}
export declare const tabMovesFocus: DynamicSetting<boolean>;
/**
 * When enabled, this suppresses the behavior of showCompletionHint
 * and accepting of completions with Enter until the user selects a
 * completion beyond the initially selected one. Used in the console.
 **/
export declare const conservativeCompletion: CM.StateField<boolean>;
export declare const autocompletion: DynamicSetting<boolean>;
export declare const bracketMatching: DynamicSetting<boolean>;
export declare const codeFolding: DynamicSetting<boolean>;
export declare const autoDetectIndent: DynamicSetting<boolean>;
export declare const showWhitespace: DynamicSetting<string>;
export declare const allowScrollPastEof: DynamicSetting<boolean>;
export declare const indentUnit: DynamicSetting<string>;
export declare const domWordWrap: DynamicSetting<boolean>;
export declare const sourcesWordWrap: DynamicSetting<boolean>;
export declare const dummyDarkTheme: CM.Extension;
export declare const themeSelection: CM.Compartment;
export declare function theme(): CM.Extension;
export declare function baseConfiguration(text: string | CM.Text): CM.Extension;
export declare const closeBrackets: DynamicSetting<boolean>;
export declare const showCompletionHint: CM.ViewPlugin<{
    decorations: CM.DecorationSet;
    currentHint: string | null;
    update(update: CM.ViewUpdate): void;
    topCompletion(state: CM.EditorState): string | null;
}>;
export declare function contentIncludingHint(view: CM.EditorView): string;
export declare const setAiAutoCompleteSuggestion: CM.StateEffectType<ActiveSuggestion | null>;
export interface ActiveSuggestion {
    text: string;
    from: number;
    sampleId?: number;
    rpcGlobalId?: Host.AidaClient.RpcGlobalId;
    startTime: number;
    onImpression: (rpcGlobalId: Host.AidaClient.RpcGlobalId, latency: number, sampleId?: number) => void;
    clearCachedRequest?: () => void;
}
export declare const aiAutoCompleteSuggestionState: CM.StateField<ActiveSuggestion | null>;
export declare function hasActiveAiSuggestion(state: CM.EditorState): boolean;
export declare function acceptAiAutoCompleteSuggestion(view: CM.EditorView): {
    accepted: boolean;
    suggestion?: ActiveSuggestion;
};
export declare const aiAutoCompleteSuggestion: CM.Extension;
