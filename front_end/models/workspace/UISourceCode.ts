/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';

import {Events as WorkspaceImplEvents, type Project} from './WorkspaceImpl.js';

const UIStrings = {
  /**
   *@description Text for the index of something
   */
  index: '(index)',
  /**
   *@description Text in UISource Code of the DevTools local workspace
   */
  thisFileWasChangedExternally: 'This file was changed externally. Would you like to reload it?',
};
const str_ = i18n.i18n.registerUIStrings('models/workspace/UISourceCode.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class UISourceCode extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    TextUtils.ContentProvider.ContentProvider {
  private projectInternal: Project;
  private urlInternal: Platform.DevToolsPath.UrlString;
  private readonly originInternal: Platform.DevToolsPath.UrlString;
  private readonly parentURLInternal: Platform.DevToolsPath.UrlString;
  private nameInternal: string;
  private contentTypeInternal: Common.ResourceType.ResourceType;
  private requestContentPromise: Promise<TextUtils.ContentProvider.DeferredContent>|null;
  private decorations: Map<string, any> = new Map();
  private hasCommitsInternal: boolean;
  private messagesInternal: Set<Message>|null;
  private contentLoadedInternal: boolean;
  private contentInternal: TextUtils.ContentProvider.DeferredContent|null;
  private forceLoadOnCheckContentInternal: boolean;
  private checkingContent: boolean;
  private lastAcceptedContent: string|null;
  private workingCopyInternal: string|null;
  private workingCopyGetter: (() => string)|null;
  private disableEditInternal: boolean;
  private contentEncodedInternal?: boolean;
  private isKnownThirdPartyInternal: boolean;
  private isUnconditionallyIgnoreListedInternal: boolean;

  constructor(project: Project, url: Platform.DevToolsPath.UrlString, contentType: Common.ResourceType.ResourceType) {
    super();
    this.projectInternal = project;
    this.urlInternal = url;

    const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
    if (parsedURL) {
      this.originInternal = parsedURL.securityOrigin();
      this.parentURLInternal =
          Common.ParsedURL.ParsedURL.concatenate(this.originInternal, parsedURL.folderPathComponents);
      if (parsedURL.queryParams && !(parsedURL.lastPathComponent && contentType.isFromSourceMap())) {
        // If there is a query param, display it like a URL. Unless it is from a source map,
        // in which case the query param is probably a hash that is best left hidden.
        this.nameInternal = parsedURL.lastPathComponent + '?' + parsedURL.queryParams;
      } else {
        // file name looks best decoded
        this.nameInternal = decodeURIComponent(parsedURL.lastPathComponent);
      }
    } else {
      this.originInternal = Platform.DevToolsPath.EmptyUrlString;
      this.parentURLInternal = Platform.DevToolsPath.EmptyUrlString;
      this.nameInternal = url;
    }

    this.contentTypeInternal = contentType;
    this.requestContentPromise = null;
    this.hasCommitsInternal = false;
    this.messagesInternal = null;
    this.contentLoadedInternal = false;
    this.contentInternal = null;
    this.forceLoadOnCheckContentInternal = false;
    this.checkingContent = false;
    this.lastAcceptedContent = null;
    this.workingCopyInternal = null;
    this.workingCopyGetter = null;
    this.disableEditInternal = false;
    this.isKnownThirdPartyInternal = false;
    this.isUnconditionallyIgnoreListedInternal = false;
  }

  requestMetadata(): Promise<UISourceCodeMetadata|null> {
    return this.projectInternal.requestMetadata(this);
  }

  name(): string {
    return this.nameInternal;
  }

  mimeType(): string {
    return this.projectInternal.mimeType(this);
  }

  url(): Platform.DevToolsPath.UrlString {
    return this.urlInternal;
  }

  // Identifier used for deduplicating scripts that are considered by the
  // DevTools UI to be the same script. For now this is just the url but this
  // is likely to change in the future.
  canononicalScriptId(): string {
    return `${this.contentTypeInternal.name()},${this.urlInternal}`;
  }

  parentURL(): Platform.DevToolsPath.UrlString {
    return this.parentURLInternal;
  }

  origin(): Platform.DevToolsPath.UrlString {
    return this.originInternal;
  }

  fullDisplayName(): string {
    return this.projectInternal.fullDisplayName(this);
  }

  displayName(skipTrim?: boolean): string {
    if (!this.nameInternal) {
      return i18nString(UIStrings.index);
    }
    const name = this.nameInternal;
    return skipTrim ? name : Platform.StringUtilities.trimEndWithMaxLength(name, 100);
  }

  canRename(): boolean {
    return this.projectInternal.canRename();
  }

  rename(newName: Platform.DevToolsPath.RawPathString): Promise<boolean> {
    let fulfill: (arg0: boolean) => void;
    const promise = new Promise<boolean>(x => {
      fulfill = x;
    });
    this.projectInternal.rename(this, newName, innerCallback.bind(this));
    return promise;

    function innerCallback(
        this: UISourceCode, success: boolean, newName?: string, newURL?: Platform.DevToolsPath.UrlString,
        newContentType?: Common.ResourceType.ResourceType): void {
      if (success) {
        this.updateName(
            newName as Platform.DevToolsPath.RawPathString, newURL as Platform.DevToolsPath.UrlString,
            newContentType as Common.ResourceType.ResourceType);
      }
      fulfill(success);
    }
  }

  remove(): void {
    this.projectInternal.deleteFile(this);
  }

  private updateName(
      name: Platform.DevToolsPath.RawPathString, url: Platform.DevToolsPath.UrlString,
      contentType?: Common.ResourceType.ResourceType): void {
    const oldURL = this.urlInternal;
    this.nameInternal = name;
    if (url) {
      this.urlInternal = url;
    } else {
      this.urlInternal = Common.ParsedURL.ParsedURL.relativePathToUrlString(name, oldURL);
    }
    if (contentType) {
      this.contentTypeInternal = contentType;
    }
    this.dispatchEventToListeners(Events.TitleChanged, this);
    this.project().workspace().dispatchEventToListeners(
        WorkspaceImplEvents.UISourceCodeRenamed, {oldURL: oldURL, uiSourceCode: this});
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.url();
  }

  contentType(): Common.ResourceType.ResourceType {
    return this.contentTypeInternal;
  }

  project(): Project {
    return this.projectInternal;
  }

  requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    if (this.requestContentPromise) {
      return this.requestContentPromise;
    }

    if (this.contentLoadedInternal) {
      return Promise.resolve(this.contentInternal as TextUtils.ContentProvider.DeferredContent);
    }

    this.requestContentPromise = this.requestContentImpl();
    return this.requestContentPromise;
  }

  private async requestContentImpl(): Promise<TextUtils.ContentProvider.DeferredContent> {
    try {
      const content = await this.projectInternal.requestFileContent(this);
      if (!this.contentLoadedInternal) {
        this.contentLoadedInternal = true;
        this.contentInternal = content;
        this.contentEncodedInternal = content.isEncoded;
      }
    } catch (err) {
      this.contentLoadedInternal = true;
      this.contentInternal = {content: null, error: err ? String(err) : '', isEncoded: false};
    }

    return this.contentInternal as TextUtils.ContentProvider.DeferredContent;
  }

  #decodeContent(content: TextUtils.ContentProvider.DeferredContent|null): string|null {
    if (!content) {
      return null;
    }
    return content.isEncoded && content.content ? window.atob(content.content) : content.content;
  }

  async checkContentUpdated(): Promise<void> {
    if (!this.contentLoadedInternal && !this.forceLoadOnCheckContentInternal) {
      return;
    }

    if (!this.projectInternal.canSetFileContent() || this.checkingContent) {
      return;
    }

    this.checkingContent = true;
    const updatedContent = await this.projectInternal.requestFileContent(this);
    if ('error' in updatedContent) {
      return;
    }
    this.checkingContent = false;
    if (updatedContent.content === null) {
      const workingCopy = this.workingCopy();
      this.contentCommitted('', false);
      this.setWorkingCopy(workingCopy);
      return;
    }
    if (this.lastAcceptedContent === updatedContent.content) {
      return;
    }

    if (this.#decodeContent(this.contentInternal) === this.#decodeContent(updatedContent)) {
      this.lastAcceptedContent = null;
      return;
    }

    if (!this.isDirty() || this.workingCopyInternal === updatedContent.content) {
      this.contentCommitted(updatedContent.content as string, false);
      return;
    }

    await Common.Revealer.reveal(this);

    // Make sure we are in the next frame before stopping the world with confirm
    await new Promise(resolve => window.setTimeout(resolve, 0));

    const shouldUpdate = window.confirm(i18nString(UIStrings.thisFileWasChangedExternally));
    if (shouldUpdate) {
      this.contentCommitted(updatedContent.content as string, false);
    } else {
      this.lastAcceptedContent = updatedContent.content;
    }
  }

  forceLoadOnCheckContent(): void {
    this.forceLoadOnCheckContentInternal = true;
  }

  private commitContent(content: string): void {
    if (this.projectInternal.canSetFileContent()) {
      void this.projectInternal.setFileContent(this, content, false);
    }
    this.contentCommitted(content, true);
  }

  private contentCommitted(content: string, committedByUser: boolean): void {
    this.lastAcceptedContent = null;
    this.contentInternal = {content, isEncoded: false};
    this.contentLoadedInternal = true;
    this.requestContentPromise = null;

    this.hasCommitsInternal = true;

    this.innerResetWorkingCopy();
    const data = {uiSourceCode: this, content, encoded: this.contentEncodedInternal};
    this.dispatchEventToListeners(Events.WorkingCopyCommitted, data);
    this.projectInternal.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyCommitted, data);
    if (committedByUser) {
      this.projectInternal.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyCommittedByUser, data);
    }
  }

  addRevision(content: string): void {
    this.commitContent(content);
  }

  hasCommits(): boolean {
    return this.hasCommitsInternal;
  }

  workingCopy(): string {
    if (this.workingCopyGetter) {
      this.workingCopyInternal = this.workingCopyGetter();
      this.workingCopyGetter = null;
    }
    if (this.isDirty()) {
      return this.workingCopyInternal as string;
    }
    return this.contentInternal?.content || '';
  }

  resetWorkingCopy(): void {
    this.innerResetWorkingCopy();
    this.workingCopyChanged();
  }

  private innerResetWorkingCopy(): void {
    this.workingCopyInternal = null;
    this.workingCopyGetter = null;
  }

  setWorkingCopy(newWorkingCopy: string): void {
    this.workingCopyInternal = newWorkingCopy;
    this.workingCopyGetter = null;
    this.workingCopyChanged();
  }

  setContent(content: string, isBase64: boolean): void {
    this.contentEncodedInternal = isBase64;
    if (this.projectInternal.canSetFileContent()) {
      void this.projectInternal.setFileContent(this, content, isBase64);
    }
    this.contentCommitted(content, true);
  }

  setWorkingCopyGetter(workingCopyGetter: () => string): void {
    this.workingCopyGetter = workingCopyGetter;
    this.workingCopyChanged();
  }

  private workingCopyChanged(): void {
    this.removeAllMessages();
    this.dispatchEventToListeners(Events.WorkingCopyChanged, this);
    this.projectInternal.workspace().dispatchEventToListeners(
        WorkspaceImplEvents.WorkingCopyChanged, {uiSourceCode: this});
  }

  removeWorkingCopyGetter(): void {
    if (!this.workingCopyGetter) {
      return;
    }
    this.workingCopyInternal = this.workingCopyGetter();
    this.workingCopyGetter = null;
  }

  commitWorkingCopy(): void {
    if (this.isDirty()) {
      this.commitContent(this.workingCopy());
    }
  }

  isDirty(): boolean {
    return this.workingCopyInternal !== null || this.workingCopyGetter !== null;
  }

  isKnownThirdParty(): boolean {
    return this.isKnownThirdPartyInternal;
  }

  markKnownThirdParty(): void {
    this.isKnownThirdPartyInternal = true;
  }

  /**
   * {@link markAsUnconditionallyIgnoreListed}
   */
  isUnconditionallyIgnoreListed(): boolean {
    return this.isUnconditionallyIgnoreListedInternal;
  }

  /**
   * Unconditionally ignore list this UISourcecode, ignoring any user
   * setting. We use this to mark breakpoint/logpoint condition scripts for now.
   */
  markAsUnconditionallyIgnoreListed(): void {
    this.isUnconditionallyIgnoreListedInternal = true;
  }

  extension(): string {
    return Common.ParsedURL.ParsedURL.extractExtension(this.nameInternal);
  }

  content(): string {
    return this.contentInternal?.content || '';
  }

  loadError(): string|null {
    return (this.contentInternal && 'error' in this.contentInternal && this.contentInternal.error) || null;
  }

  searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    const content = this.content();
    if (!content) {
      return this.projectInternal.searchInFileContent(this, query, caseSensitive, isRegex);
    }
    return Promise.resolve(TextUtils.TextUtils.performSearchInContent(content, query, caseSensitive, isRegex));
  }

  contentLoaded(): boolean {
    return this.contentLoadedInternal;
  }

  uiLocation(lineNumber: number, columnNumber?: number): UILocation {
    return new UILocation(this, lineNumber, columnNumber);
  }

  messages(): Set<Message> {
    return this.messagesInternal ? new Set(this.messagesInternal) : new Set();
  }

  addLineMessage(
      level: Message.Level, text: string, lineNumber: number, columnNumber?: number,
      clickHandler?: (() => void)): Message {
    const range = TextUtils.TextRange.TextRange.createFromLocation(lineNumber, columnNumber || 0);
    const message = new Message(level, text, clickHandler, range);
    this.addMessage(message);
    return message;
  }

  addMessage(message: Message): void {
    if (!this.messagesInternal) {
      this.messagesInternal = new Set();
    }
    this.messagesInternal.add(message);
    this.dispatchEventToListeners(Events.MessageAdded, message);
  }

  removeMessage(message: Message): void {
    if (this.messagesInternal?.delete(message)) {
      this.dispatchEventToListeners(Events.MessageRemoved, message);
    }
  }

  private removeAllMessages(): void {
    if (!this.messagesInternal) {
      return;
    }
    for (const message of this.messagesInternal) {
      this.dispatchEventToListeners(Events.MessageRemoved, message);
    }
    this.messagesInternal = null;
  }

  setDecorationData(type: string, data: any): void {
    if (data !== this.decorations.get(type)) {
      this.decorations.set(type, data);
      this.dispatchEventToListeners(Events.DecorationChanged, type);
    }
  }

  getDecorationData(type: string): any {
    return this.decorations.get(type);
  }

  disableEdit(): void {
    this.disableEditInternal = true;
  }

  editDisabled(): boolean {
    return this.disableEditInternal;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  WorkingCopyChanged = 'WorkingCopyChanged',
  WorkingCopyCommitted = 'WorkingCopyCommitted',
  TitleChanged = 'TitleChanged',
  MessageAdded = 'MessageAdded',
  MessageRemoved = 'MessageRemoved',
  DecorationChanged = 'DecorationChanged',
}

export interface WorkingCopyCommitedEvent {
  uiSourceCode: UISourceCode;
  content: string;
  encoded: boolean|undefined;
}

export type EventTypes = {
  [Events.WorkingCopyChanged]: UISourceCode,
  [Events.WorkingCopyCommitted]: WorkingCopyCommitedEvent,
  [Events.TitleChanged]: UISourceCode,
  [Events.MessageAdded]: Message,
  [Events.MessageRemoved]: Message,
  [Events.DecorationChanged]: string,
};

export class UILocation {
  uiSourceCode: UISourceCode;
  lineNumber: number;
  columnNumber: number|undefined;
  constructor(uiSourceCode: UISourceCode, lineNumber: number, columnNumber?: number) {
    this.uiSourceCode = uiSourceCode;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }

  linkText(skipTrim: boolean = false, showColumnNumber: boolean = false): string {
    const displayName = this.uiSourceCode.displayName(skipTrim);
    const lineAndColumnText = this.lineAndColumnText(showColumnNumber);
    return lineAndColumnText ? displayName + ':' + lineAndColumnText : displayName;
  }

  lineAndColumnText(showColumnNumber: boolean = false): string|undefined {
    let lineAndColumnText;
    if (this.uiSourceCode.mimeType() === 'application/wasm') {
      // For WebAssembly locations, we follow the conventions described in
      // github.com/WebAssembly/design/blob/master/Web.md#developer-facing-display-conventions
      if (typeof this.columnNumber === 'number') {
        lineAndColumnText = `0x${this.columnNumber.toString(16)}`;
      }
    } else {
      lineAndColumnText = `${this.lineNumber + 1}`;
      if (showColumnNumber && typeof this.columnNumber === 'number') {
        lineAndColumnText += ':' + (this.columnNumber + 1);
      }
    }
    return lineAndColumnText;
  }

  id(): string {
    if (typeof this.columnNumber === 'number') {
      return this.uiSourceCode.project().id() + ':' + this.uiSourceCode.url() + ':' + this.lineNumber + ':' +
          this.columnNumber;
    }
    return this.lineId();
  }

  lineId(): string {
    return this.uiSourceCode.project().id() + ':' + this.uiSourceCode.url() + ':' + this.lineNumber;
  }

  toUIString(): string {
    return this.uiSourceCode.url() + ':' + (this.lineNumber + 1);
  }

  static comparator(location1: UILocation, location2: UILocation): number {
    return location1.compareTo(location2);
  }

  compareTo(other: UILocation): number {
    if (this.uiSourceCode.url() !== other.uiSourceCode.url()) {
      return this.uiSourceCode.url() > other.uiSourceCode.url() ? 1 : -1;
    }
    if (this.lineNumber !== other.lineNumber) {
      return this.lineNumber - other.lineNumber;
    }
    // We consider `undefined` less than an actual column number, since
    // UI location without a column number corresponds to the whole line.
    if (this.columnNumber === other.columnNumber) {
      return 0;
    }
    if (typeof this.columnNumber !== 'number') {
      return -1;
    }
    if (typeof other.columnNumber !== 'number') {
      return 1;
    }
    return this.columnNumber - other.columnNumber;
  }
}

/**
 * A message associated with a range in a `UISourceCode`. The range will be
 * underlined starting at the range's start and ending at the line end (the
 * end of the range is currently disregarded).
 * An icon is going to appear at the end of the line according to the
 * `level` of the Message. This is only the model; displaying is handled
 * where UISourceCode displaying is handled.
 */
export class Message {
  private readonly levelInternal: Message.Level;
  private readonly textInternal: string;
  range: TextUtils.TextRange.TextRange;
  private readonly clickHandlerInternal?: (() => void);

  constructor(level: Message.Level, text: string, clickHandler?: (() => void), range?: TextUtils.TextRange.TextRange) {
    this.levelInternal = level;
    this.textInternal = text;
    this.range = range ?? new TextUtils.TextRange.TextRange(0, 0, 0, 0);
    this.clickHandlerInternal = clickHandler;
  }

  level(): Message.Level {
    return this.levelInternal;
  }

  text(): string {
    return this.textInternal;
  }

  clickHandler(): (() => void)|undefined {
    return this.clickHandlerInternal;
  }

  lineNumber(): number {
    return this.range.startLine;
  }

  columnNumber(): number|undefined {
    return this.range.startColumn;
  }

  isEqual(another: Message): boolean {
    return this.text() === another.text() && this.level() === another.level() && this.range.equal(another.range);
  }
}

export namespace Message {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Level {
    Error = 'Error',
    Issue = 'Issue',
    Warning = 'Warning',
  }
}

export class LineMarker {
  private readonly rangeInternal: TextUtils.TextRange.TextRange;
  private readonly typeInternal: string;
  private readonly dataInternal: any;

  constructor(range: TextUtils.TextRange.TextRange, type: string, data: any) {
    this.rangeInternal = range;
    this.typeInternal = type;
    this.dataInternal = data;
  }

  range(): TextUtils.TextRange.TextRange {
    return this.rangeInternal;
  }

  type(): string {
    return this.typeInternal;
  }

  data(): any {
    return this.dataInternal;
  }
}

export class UISourceCodeMetadata {
  modificationTime: Date|null;
  contentSize: number|null;

  constructor(modificationTime: Date|null, contentSize: number|null) {
    this.modificationTime = modificationTime;
    this.contentSize = contentSize;
  }
}
