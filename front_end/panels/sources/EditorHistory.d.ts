import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Workspace from '../../models/workspace/workspace.js';
export declare const MAX_PREVIOUSLY_VIEWED_FILES_COUNT = 30;
export declare const MAX_SERIALIZABLE_URL_LENGTH = 4096;
export interface SerializedHistoryItem {
    url: string;
    resourceTypeName: string;
    selectionRange?: TextUtils.TextRange.SerializedTextRange;
    scrollLineNumber?: number;
}
export interface HistoryItemKey {
    url: Platform.DevToolsPath.UrlString;
    resourceType: Common.ResourceType.ResourceType;
}
export declare function historyItemKey(uiSourceCode: Workspace.UISourceCode.UISourceCode): HistoryItemKey;
export declare class HistoryItem implements HistoryItemKey {
    url: Platform.DevToolsPath.UrlString;
    resourceType: Common.ResourceType.ResourceType;
    selectionRange: TextUtils.TextRange.TextRange | undefined;
    scrollLineNumber: number | undefined;
    constructor(url: Platform.DevToolsPath.UrlString, resourceType: Common.ResourceType.ResourceType, selectionRange?: TextUtils.TextRange.TextRange, scrollLineNumber?: number);
    static fromObject(serializedHistoryItem: SerializedHistoryItem): HistoryItem;
    toObject(): SerializedHistoryItem | null;
}
export declare class History {
    #private;
    constructor(items: HistoryItem[]);
    static fromObject(serializedHistoryItems: SerializedHistoryItem[]): History;
    index({ url, resourceType }: HistoryItemKey): number;
    selectionRange(key: HistoryItemKey): TextUtils.TextRange.TextRange | undefined;
    updateSelectionRange(key: HistoryItemKey, selectionRange?: TextUtils.TextRange.TextRange): void;
    scrollLineNumber(key: HistoryItemKey): number | undefined;
    updateScrollLineNumber(key: HistoryItemKey, scrollLineNumber: number): void;
    update(keys: HistoryItemKey[]): void;
    remove(key: HistoryItemKey): void;
    toObject(): SerializedHistoryItem[];
    keys(): HistoryItemKey[];
}
