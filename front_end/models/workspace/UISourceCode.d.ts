import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';
import { type Project } from './WorkspaceImpl.js';
export declare class UISourceCode extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements TextUtils.ContentProvider.ContentProvider {
    #private;
    constructor(project: Project, url: Platform.DevToolsPath.UrlString, contentType: Common.ResourceType.ResourceType);
    requestMetadata(): Promise<UISourceCodeMetadata | null>;
    name(): string;
    mimeType(): string;
    url(): Platform.DevToolsPath.UrlString;
    canonicalScriptId(): string;
    parentURL(): Platform.DevToolsPath.UrlString;
    origin(): Platform.DevToolsPath.UrlString;
    fullDisplayName(): string;
    displayName(skipTrim?: boolean): string;
    canRename(): boolean;
    rename(newName: Platform.DevToolsPath.RawPathString): Promise<boolean>;
    remove(): void;
    contentURL(): Platform.DevToolsPath.UrlString;
    contentType(): Common.ResourceType.ResourceType;
    project(): Project;
    requestContentData({ cachedWasmOnly }?: {
        cachedWasmOnly?: boolean;
    }): Promise<TextUtils.ContentData.ContentDataOrError>;
    checkContentUpdated(): Promise<void>;
    forceLoadOnCheckContent(): void;
    addRevision(content: string): void;
    hasCommits(): boolean;
    workingCopy(): string;
    workingCopyContent(): TextUtils.ContentProvider.DeferredContent;
    workingCopyContentData(): TextUtils.ContentData.ContentData;
    resetWorkingCopy(): void;
    setWorkingCopy(newWorkingCopy: string): void;
    setContainsAiChanges(containsAiChanges: boolean): void;
    containsAiChanges(): boolean;
    setContent(content: string, isBase64: boolean): void;
    setWorkingCopyGetter(workingCopyGetter: () => string): void;
    removeWorkingCopyGetter(): void;
    commitWorkingCopy(): void;
    isDirty(): boolean;
    isKnownThirdParty(): boolean;
    markKnownThirdParty(): void;
    /**
     * {@link markAsUnconditionallyIgnoreListed}
     */
    isUnconditionallyIgnoreListed(): boolean;
    isFetchXHR(): boolean;
    /**
     * Unconditionally ignore list this UISourcecode, ignoring any user
     * setting. We use this to mark breakpoint/logpoint condition scripts for now.
     */
    markAsUnconditionallyIgnoreListed(): void;
    extension(): string;
    content(): string;
    loadError(): string | null;
    searchInContent(query: string, caseSensitive: boolean, isRegex: boolean): Promise<TextUtils.ContentProvider.SearchMatch[]>;
    contentLoaded(): boolean;
    uiLocation(lineNumber: number, columnNumber?: number): UILocation;
    messages(): Set<Message>;
    addLineMessage(level: Message.Level, text: string, lineNumber: number, columnNumber?: number, clickHandler?: (() => void)): Message;
    addMessage(message: Message): void;
    removeMessage(message: Message): void;
    setDecorationData(type: string, data: any): void;
    getDecorationData(type: string): any;
    disableEdit(): void;
    editDisabled(): boolean;
    isIgnoreListed(): boolean;
}
export declare enum Events {
    WorkingCopyChanged = "WorkingCopyChanged",
    WorkingCopyCommitted = "WorkingCopyCommitted",
    TitleChanged = "TitleChanged",
    MessageAdded = "MessageAdded",
    MessageRemoved = "MessageRemoved",
    DecorationChanged = "DecorationChanged"
}
export interface WorkingCopyCommittedEvent {
    uiSourceCode: UISourceCode;
    content: string;
    encoded: boolean | undefined;
}
export interface EventTypes {
    [Events.WorkingCopyChanged]: UISourceCode;
    [Events.WorkingCopyCommitted]: WorkingCopyCommittedEvent;
    [Events.TitleChanged]: UISourceCode;
    [Events.MessageAdded]: Message;
    [Events.MessageRemoved]: Message;
    [Events.DecorationChanged]: string;
}
export declare class UILocation {
    uiSourceCode: UISourceCode;
    lineNumber: number;
    columnNumber: number | undefined;
    constructor(uiSourceCode: UISourceCode, lineNumber: number, columnNumber?: number);
    linkText(skipTrim?: boolean, showColumnNumber?: boolean): string;
    lineAndColumnText(showColumnNumber?: boolean): string | undefined;
    id(): string;
    lineId(): string;
    static comparator(location1: UILocation, location2: UILocation): number;
    compareTo(other: UILocation): number;
    isIgnoreListed(): boolean;
}
/**
 * A text range inside a specific {@link UISourceCode}.
 *
 * We use a class instead of an interface so we can implement a revealer for it.
 */
export declare class UILocationRange {
    readonly uiSourceCode: UISourceCode;
    readonly range: TextUtils.TextRange.TextRange;
    constructor(uiSourceCode: UISourceCode, range: TextUtils.TextRange.TextRange);
}
/**
 * A message associated with a range in a `UISourceCode`. The range will be
 * underlined starting at the range's start and ending at the line end (the
 * end of the range is currently disregarded).
 * An icon is going to appear at the end of the line according to the
 * `level` of the Message. This is only the model; displaying is handled
 * where UISourceCode displaying is handled.
 */
export declare class Message {
    #private;
    range: TextUtils.TextRange.TextRange;
    constructor(level: Message.Level, text: string, clickHandler?: (() => void), range?: TextUtils.TextRange.TextRange);
    level(): Message.Level;
    text(): string;
    clickHandler(): (() => void) | undefined;
    lineNumber(): number;
    columnNumber(): number | undefined;
    isEqual(another: Message): boolean;
}
export declare namespace Message {
    const enum Level {
        ERROR = "Error",
        ISSUE = "Issue",
        WARNING = "Warning"
    }
}
export declare class UISourceCodeMetadata {
    modificationTime: Date | null;
    contentSize: number | null;
    constructor(modificationTime: Date | null, contentSize: number | null);
}
