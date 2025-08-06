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

import {IgnoreListManager} from './IgnoreListManager.js';
import {Events as WorkspaceImplEvents, type Project} from './WorkspaceImpl.js';

const UIStrings = {
  /**
   * @description Text for the index of something
   */
  index: '(index)',
  /**
   * @description Text in UISource Code of the DevTools local workspace
   */
  thisFileWasChangedExternally: 'This file was changed externally. Would you like to reload it?',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/workspace/UISourceCode.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class UISourceCode extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    TextUtils.ContentProvider.ContentProvider {
  readonly #origin: Platform.DevToolsPath.UrlString;
  readonly #parentURL: Platform.DevToolsPath.UrlString;
  #project: Project;
  #url: Platform.DevToolsPath.UrlString;
  #name: string;
  #contentType: Common.ResourceType.ResourceType;
  #requestContentPromise: Promise<TextUtils.ContentData.ContentDataOrError>|null = null;
  #decorations = new Map<string, any>();
  #hasCommits = false;
  #messages: Set<Message>|null = null;
  #content: TextUtils.ContentData.ContentDataOrError|null = null;
  #forceLoadOnCheckContent = false;
  #checkingContent = false;
  #lastAcceptedContent: string|null = null;
  #workingCopy: string|null = null;
  #workingCopyGetter: (() => string)|null = null;
  #disableEdit = false;
  #contentEncoded: boolean|undefined;
  #isKnownThirdParty = false;
  #isUnconditionallyIgnoreListed = false;
  #containsAiChanges = false;

  constructor(project: Project, url: Platform.DevToolsPath.UrlString, contentType: Common.ResourceType.ResourceType) {
    super();
    this.#project = project;
    this.#url = url;

    const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
    if (parsedURL) {
      this.#origin = parsedURL.securityOrigin();
      this.#parentURL = Common.ParsedURL.ParsedURL.concatenate(this.#origin, parsedURL.folderPathComponents);
      if (parsedURL.queryParams && !(parsedURL.lastPathComponent && contentType.isFromSourceMap())) {
        // If there is a query param, display it like a URL. Unless it is from a source map,
        // in which case the query param is probably a hash that is best left hidden.
        this.#name = parsedURL.lastPathComponent + '?' + parsedURL.queryParams;
      } else {
        // file name looks best decoded
        try {
          this.#name = decodeURIComponent(parsedURL.lastPathComponent);
        } catch {
          // Decoding might fail.
          this.#name = parsedURL.lastPathComponent;
        }
      }
    } else {
      this.#origin = Platform.DevToolsPath.EmptyUrlString;
      this.#parentURL = Platform.DevToolsPath.EmptyUrlString;
      this.#name = url;
    }

    this.#contentType = contentType;
  }

  requestMetadata(): Promise<UISourceCodeMetadata|null> {
    return this.#project.requestMetadata(this);
  }

  name(): string {
    return this.#name;
  }

  mimeType(): string {
    return this.#project.mimeType(this);
  }

  url(): Platform.DevToolsPath.UrlString {
    return this.#url;
  }

  // Identifier used for deduplicating scripts that are considered by the
  // DevTools UI to be the same script. For now this is just the url but this
  // is likely to change in the future.
  canonicalScriptId(): string {
    return `${this.#contentType.name()},${this.#url}`;
  }

  parentURL(): Platform.DevToolsPath.UrlString {
    return this.#parentURL;
  }

  origin(): Platform.DevToolsPath.UrlString {
    return this.#origin;
  }

  fullDisplayName(): string {
    return this.#project.fullDisplayName(this);
  }

  displayName(skipTrim?: boolean): string {
    if (!this.#name) {
      return i18nString(UIStrings.index);
    }
    const name = this.#name;
    return skipTrim ? name : Platform.StringUtilities.trimEndWithMaxLength(name, 100);
  }

  canRename(): boolean {
    return this.#project.canRename();
  }

  rename(newName: Platform.DevToolsPath.RawPathString): Promise<boolean> {
    const {resolve, promise} = Promise.withResolvers<boolean>();
    this.#project.rename(this, newName, innerCallback.bind(this));
    return promise;

    function innerCallback(
        this: UISourceCode, success: boolean, newName?: string, newURL?: Platform.DevToolsPath.UrlString,
        newContentType?: Common.ResourceType.ResourceType): void {
      if (success) {
        this.#updateName(
            newName as Platform.DevToolsPath.RawPathString, newURL as Platform.DevToolsPath.UrlString,
            newContentType as Common.ResourceType.ResourceType);
      }
      resolve(success);
    }
  }

  remove(): void {
    this.#project.deleteFile(this);
  }

  #updateName(
      name: Platform.DevToolsPath.RawPathString, url: Platform.DevToolsPath.UrlString,
      contentType?: Common.ResourceType.ResourceType): void {
    const oldURL = this.#url;
    this.#name = name;
    if (url) {
      this.#url = url;
    } else {
      this.#url = Common.ParsedURL.ParsedURL.relativePathToUrlString(name, oldURL);
    }
    if (contentType) {
      this.#contentType = contentType;
    }
    this.dispatchEventToListeners(Events.TitleChanged, this);
    this.project().workspace().dispatchEventToListeners(
        WorkspaceImplEvents.UISourceCodeRenamed, {oldURL, uiSourceCode: this});
  }

  contentURL(): Platform.DevToolsPath.UrlString {
    return this.url();
  }

  contentType(): Common.ResourceType.ResourceType {
    return this.#contentType;
  }

  project(): Project {
    return this.#project;
  }

  requestContentData({cachedWasmOnly}: {cachedWasmOnly?: boolean} = {}):
      Promise<TextUtils.ContentData.ContentDataOrError> {
    if (this.#requestContentPromise) {
      return this.#requestContentPromise;
    }

    if (this.#content) {
      return Promise.resolve(this.#content);
    }

    if (cachedWasmOnly && this.mimeType() === 'application/wasm') {
      return Promise.resolve(new TextUtils.WasmDisassembly.WasmDisassembly([], [], []));
    }

    this.#requestContentPromise = this.#requestContent();
    return this.#requestContentPromise;
  }

  async #requestContent(): Promise<TextUtils.ContentData.ContentDataOrError> {
    if (this.#content) {
      throw new Error('Called UISourceCode#requestContentImpl even though content is available for ' + this.#url);
    }

    try {
      this.#content = await this.#project.requestFileContent(this);
    } catch (err) {
      this.#content = {error: err ? String(err) : ''};
    }

    return this.#content;
  }

  #decodeContent(content: TextUtils.ContentProvider.DeferredContent|null): string|null {
    if (!content) {
      return null;
    }
    return content.isEncoded && content.content ? window.atob(content.content) : content.content;
  }

  /** Only used to compare whether content changed */
  #unsafeDecodeContentData(content: TextUtils.ContentData.ContentDataOrError|null): string|null {
    if (!content || TextUtils.ContentData.ContentData.isError(content)) {
      return null;
    }
    return content.createdFromBase64 ? window.atob(content.base64) : content.text;
  }

  async checkContentUpdated(): Promise<void> {
    if (!this.#content && !this.#forceLoadOnCheckContent) {
      return;
    }

    if (!this.#project.canSetFileContent() || this.#checkingContent) {
      return;
    }

    this.#checkingContent = true;
    const updatedContent =
        TextUtils.ContentData.ContentData.asDeferredContent(await this.#project.requestFileContent(this));
    if ('error' in updatedContent) {
      return;
    }
    this.#checkingContent = false;
    if (updatedContent.content === null) {
      const workingCopy = this.workingCopy();
      this.#contentCommitted('', false);
      this.setWorkingCopy(workingCopy);
      return;
    }
    if (this.#lastAcceptedContent === updatedContent.content) {
      return;
    }

    if (this.#unsafeDecodeContentData(this.#content) === this.#decodeContent(updatedContent)) {
      this.#lastAcceptedContent = null;
      return;
    }

    if (!this.isDirty() || this.#workingCopy === updatedContent.content) {
      this.#contentCommitted(updatedContent.content, false);
      return;
    }

    await Common.Revealer.reveal(this);

    // Make sure we are in the next frame before stopping the world with confirm
    await new Promise(resolve => window.setTimeout(resolve, 0));

    const shouldUpdate = window.confirm(i18nString(UIStrings.thisFileWasChangedExternally));
    if (shouldUpdate) {
      this.#contentCommitted(updatedContent.content, false);
    } else {
      this.#lastAcceptedContent = updatedContent.content;
    }
  }

  forceLoadOnCheckContent(): void {
    this.#forceLoadOnCheckContent = true;
  }

  #commitContent(content: string): void {
    if (this.#project.canSetFileContent()) {
      void this.#project.setFileContent(this, content, false);
    }
    this.#contentCommitted(content, true);
  }

  #contentCommitted(content: string, committedByUser: boolean): void {
    this.#lastAcceptedContent = null;
    this.#content = new TextUtils.ContentData.ContentData(content, Boolean(this.#contentEncoded), this.mimeType());
    this.#requestContentPromise = null;

    this.#hasCommits = true;

    this.#resetWorkingCopy();
    const data = {uiSourceCode: this, content, encoded: this.#contentEncoded};
    this.dispatchEventToListeners(Events.WorkingCopyCommitted, data);
    this.#project.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyCommitted, data);
    if (committedByUser) {
      this.#project.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyCommittedByUser, data);
    }
  }

  addRevision(content: string): void {
    this.#commitContent(content);
  }

  hasCommits(): boolean {
    return this.#hasCommits;
  }

  workingCopy(): string {
    return this.workingCopyContent().content || '';
  }

  workingCopyContent(): TextUtils.ContentProvider.DeferredContent {
    return this.workingCopyContentData().asDeferedContent();
  }

  workingCopyContentData(): TextUtils.ContentData.ContentData {
    if (this.#workingCopyGetter) {
      this.#workingCopy = this.#workingCopyGetter();
      this.#workingCopyGetter = null;
    }
    const contentData = this.#content ? TextUtils.ContentData.ContentData.contentDataOrEmpty(this.#content) :
                                        TextUtils.ContentData.EMPTY_TEXT_CONTENT_DATA;
    if (this.#workingCopy !== null) {
      return new TextUtils.ContentData.ContentData(this.#workingCopy, /* isBase64 */ false, contentData.mimeType);
    }
    return contentData;
  }

  resetWorkingCopy(): void {
    this.#resetWorkingCopy();
    this.#workingCopyChanged();
  }

  #resetWorkingCopy(): void {
    this.#workingCopy = null;
    this.#workingCopyGetter = null;
    this.setContainsAiChanges(false);
  }

  setWorkingCopy(newWorkingCopy: string): void {
    this.#workingCopy = newWorkingCopy;
    this.#workingCopyGetter = null;
    this.#workingCopyChanged();
  }

  setContainsAiChanges(containsAiChanges: boolean): void {
    this.#containsAiChanges = containsAiChanges;
  }

  containsAiChanges(): boolean {
    return this.#containsAiChanges;
  }

  setContent(content: string, isBase64: boolean): void {
    this.#contentEncoded = isBase64;
    if (this.#project.canSetFileContent()) {
      void this.#project.setFileContent(this, content, isBase64);
    }
    this.#contentCommitted(content, true);
  }

  setWorkingCopyGetter(workingCopyGetter: () => string): void {
    this.#workingCopyGetter = workingCopyGetter;
    this.#workingCopyChanged();
  }

  #workingCopyChanged(): void {
    this.#removeAllMessages();
    this.dispatchEventToListeners(Events.WorkingCopyChanged, this);
    this.#project.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyChanged, {uiSourceCode: this});
  }

  removeWorkingCopyGetter(): void {
    if (!this.#workingCopyGetter) {
      return;
    }
    this.#workingCopy = this.#workingCopyGetter();
    this.#workingCopyGetter = null;
  }

  commitWorkingCopy(): void {
    if (this.isDirty()) {
      this.#commitContent(this.workingCopy());
    }
  }

  isDirty(): boolean {
    return this.#workingCopy !== null || this.#workingCopyGetter !== null;
  }

  isKnownThirdParty(): boolean {
    return this.#isKnownThirdParty;
  }

  markKnownThirdParty(): void {
    this.#isKnownThirdParty = true;
  }

  /**
   * {@link markAsUnconditionallyIgnoreListed}
   */
  isUnconditionallyIgnoreListed(): boolean {
    return this.#isUnconditionallyIgnoreListed;
  }

  isFetchXHR(): boolean {
    return [Common.ResourceType.resourceTypes.XHR, Common.ResourceType.resourceTypes.Fetch].includes(
        this.contentType());
  }

  /**
   * Unconditionally ignore list this UISourcecode, ignoring any user
   * setting. We use this to mark breakpoint/logpoint condition scripts for now.
   */
  markAsUnconditionallyIgnoreListed(): void {
    this.#isUnconditionallyIgnoreListed = true;
  }

  extension(): string {
    return Common.ParsedURL.ParsedURL.extractExtension(this.#name);
  }

  content(): string {
    if (!this.#content || 'error' in this.#content) {
      return '';
    }
    return this.#content.text;
  }

  loadError(): string|null {
    return (this.#content && 'error' in this.#content && this.#content.error) || null;
  }

  searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    if (!this.#content || 'error' in this.#content) {
      return this.#project.searchInFileContent(this, query, caseSensitive, isRegex);
    }
    return Promise.resolve(
        TextUtils.TextUtils.performSearchInContentData(this.#content, query, caseSensitive, isRegex));
  }

  contentLoaded(): boolean {
    return Boolean(this.#content);
  }

  uiLocation(lineNumber: number, columnNumber?: number): UILocation {
    return new UILocation(this, lineNumber, columnNumber);
  }

  messages(): Set<Message> {
    return this.#messages ? new Set(this.#messages) : new Set();
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
    if (!this.#messages) {
      this.#messages = new Set();
    }
    this.#messages.add(message);
    this.dispatchEventToListeners(Events.MessageAdded, message);
  }

  removeMessage(message: Message): void {
    if (this.#messages?.delete(message)) {
      this.dispatchEventToListeners(Events.MessageRemoved, message);
    }
  }

  #removeAllMessages(): void {
    if (!this.#messages) {
      return;
    }
    for (const message of this.#messages) {
      this.dispatchEventToListeners(Events.MessageRemoved, message);
    }
    this.#messages = null;
  }

  setDecorationData(type: string, data: any): void {
    if (data !== this.#decorations.get(type)) {
      this.#decorations.set(type, data);
      this.dispatchEventToListeners(Events.DecorationChanged, type);
    }
  }

  getDecorationData(type: string): any {
    return this.#decorations.get(type);
  }

  disableEdit(): void {
    this.#disableEdit = true;
  }

  editDisabled(): boolean {
    return this.#disableEdit;
  }

  isIgnoreListed(): boolean {
    return IgnoreListManager.instance().isUserOrSourceMapIgnoreListedUISourceCode(this);
  }
}

export enum Events {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  WorkingCopyChanged = 'WorkingCopyChanged',
  WorkingCopyCommitted = 'WorkingCopyCommitted',
  TitleChanged = 'TitleChanged',
  MessageAdded = 'MessageAdded',
  MessageRemoved = 'MessageRemoved',
  DecorationChanged = 'DecorationChanged',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export interface WorkingCopyCommittedEvent {
  uiSourceCode: UISourceCode;
  content: string;
  encoded: boolean|undefined;
}

export interface EventTypes {
  [Events.WorkingCopyChanged]: UISourceCode;
  [Events.WorkingCopyCommitted]: WorkingCopyCommittedEvent;
  [Events.TitleChanged]: UISourceCode;
  [Events.MessageAdded]: Message;
  [Events.MessageRemoved]: Message;
  [Events.DecorationChanged]: string;
}

export class UILocation {
  uiSourceCode: UISourceCode;
  lineNumber: number;
  columnNumber: number|undefined;
  constructor(uiSourceCode: UISourceCode, lineNumber: number, columnNumber?: number) {
    this.uiSourceCode = uiSourceCode;
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber;
  }

  linkText(skipTrim = false, showColumnNumber = false): string {
    const displayName = this.uiSourceCode.displayName(skipTrim);
    const lineAndColumnText = this.lineAndColumnText(showColumnNumber);
    let text = lineAndColumnText ? displayName + ':' + lineAndColumnText : displayName;
    if (this.uiSourceCode.isDirty()) {
      text = '*' + text;
    }
    return text;
  }

  lineAndColumnText(showColumnNumber = false): string|undefined {
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

  isIgnoreListed(): boolean {
    return this.uiSourceCode.isIgnoreListed();
  }
}

/**
 * A text range inside a specific {@link UISourceCode}.
 *
 * We use a class instead of an interface so we can implement a revealer for it.
 */
export class UILocationRange {
  readonly uiSourceCode: UISourceCode;
  readonly range: TextUtils.TextRange.TextRange;

  constructor(uiSourceCode: UISourceCode, range: TextUtils.TextRange.TextRange) {
    this.uiSourceCode = uiSourceCode;
    this.range = range;
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
  readonly #level: Message.Level;
  readonly #text: string;
  range: TextUtils.TextRange.TextRange;
  readonly #clickHandler?: (() => void);

  constructor(level: Message.Level, text: string, clickHandler?: (() => void), range?: TextUtils.TextRange.TextRange) {
    this.#level = level;
    this.#text = text;
    this.range = range ?? new TextUtils.TextRange.TextRange(0, 0, 0, 0);
    this.#clickHandler = clickHandler;
  }

  level(): Message.Level {
    return this.#level;
  }

  text(): string {
    return this.#text;
  }

  clickHandler(): (() => void)|undefined {
    return this.#clickHandler;
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
  export const enum Level {
    ERROR = 'Error',
    ISSUE = 'Issue',
    WARNING = 'Warning',
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
