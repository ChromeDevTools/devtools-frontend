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

/* eslint-disable rulesdir/no_underscored_properties */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as TextUtils from '../text_utils/text_utils.js';

import {Events as WorkspaceImplEvents, Project, projectTypes} from './WorkspaceImpl.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Text for the index of something
  */
  index: '(index)',
  /**
  *@description Text in UISource Code of the DevTools local workspace
  */
  thisFileWasChangedExternally: 'This file was changed externally. Would you like to reload it?',
};
const str_ = i18n.i18n.registerUIStrings('workspace/UISourceCode.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class UISourceCode extends Common.ObjectWrapper.ObjectWrapper implements
    TextUtils.ContentProvider.ContentProvider {
  _project: Project;
  _url: string;
  _origin: string;
  _parentURL: string;
  _name: string;
  _contentType: Common.ResourceType.ResourceType;
  _requestContentPromise: Promise<TextUtils.ContentProvider.DeferredContent>|null;
  _decorations: Platform.MapUtilities.Multimap<string, LineMarker>|null;
  _hasCommits: boolean;
  _messages: Set<Message>|null;
  _contentLoaded: boolean;
  _content: TextUtils.ContentProvider.DeferredContent|null;
  _forceLoadOnCheckContent: boolean;
  _checkingContent: boolean;
  _lastAcceptedContent: string|null;
  _workingCopy: string|null;
  _workingCopyGetter: (() => string)|null;
  _disableEdit: boolean;
  _contentEncoded?: boolean;

  constructor(project: Project, url: string, contentType: Common.ResourceType.ResourceType) {
    super();
    this._project = project;
    this._url = url;

    const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
    if (parsedURL) {
      this._origin = parsedURL.securityOrigin();
      this._parentURL = this._origin + parsedURL.folderPathComponents;
      this._name = parsedURL.lastPathComponent;
      if (parsedURL.queryParams) {
        this._name += '?' + parsedURL.queryParams;
      }
    } else {
      this._origin = '';
      this._parentURL = '';
      this._name = url;
    }

    this._contentType = contentType;
    this._requestContentPromise = null;
    this._decorations = null;
    this._hasCommits = false;
    this._messages = null;
    this._contentLoaded = false;
    this._content = null;
    this._forceLoadOnCheckContent = false;
    this._checkingContent = false;
    this._lastAcceptedContent = null;
    this._workingCopy = null;
    this._workingCopyGetter = null;
    this._disableEdit = false;
  }

  requestMetadata(): Promise<UISourceCodeMetadata|null> {
    return this._project.requestMetadata(this);
  }

  name(): string {
    return this._name;
  }

  mimeType(): string {
    return this._project.mimeType(this);
  }

  url(): string {
    return this._url;
  }

  parentURL(): string {
    return this._parentURL;
  }

  origin(): string {
    return this._origin;
  }

  fullDisplayName(): string {
    return this._project.fullDisplayName(this);
  }

  displayName(skipTrim?: boolean): string {
    if (!this._name) {
      return i18nString(UIStrings.index);
    }
    let name: string = this._name;
    try {
      if (this.project().type() === projectTypes.FileSystem) {
        name = unescape(name);
      } else {
        name = decodeURI(name);
      }
    } catch (error) {
    }
    return skipTrim ? name : Platform.StringUtilities.trimEndWithMaxLength(name, 100);
  }

  canRename(): boolean {
    return this._project.canRename();
  }

  rename(newName: string): Promise<boolean> {
    let fulfill: (arg0: boolean) => void;
    const promise = new Promise<boolean>(x => {
      fulfill = x;
    });
    this._project.rename(this, newName, innerCallback.bind(this));
    return promise;

    function innerCallback(
        this: UISourceCode, success: boolean, newName?: string, newURL?: string,
        newContentType?: Common.ResourceType.ResourceType): void {
      if (success) {
        this._updateName(newName as string, newURL as string, newContentType as Common.ResourceType.ResourceType);
      }
      fulfill(success);
    }
  }

  remove(): void {
    this._project.deleteFile(this);
  }

  _updateName(name: string, url: string, contentType?: Common.ResourceType.ResourceType): void {
    const oldURL = this._url;
    this._url = this._url.substring(0, this._url.length - this._name.length) + name;
    this._name = name;
    if (url) {
      this._url = url;
    }
    if (contentType) {
      this._contentType = contentType;
    }
    this.dispatchEventToListeners(Events.TitleChanged, this);
    this.project().workspace().dispatchEventToListeners(
        WorkspaceImplEvents.UISourceCodeRenamed, {oldURL: oldURL, uiSourceCode: this});
  }

  contentURL(): string {
    return this.url();
  }

  contentType(): Common.ResourceType.ResourceType {
    return this._contentType;
  }

  async contentEncoded(): Promise<boolean> {
    await this.requestContent();
    return this._contentEncoded || false;
  }

  project(): Project {
    return this._project;
  }

  requestContent(): Promise<TextUtils.ContentProvider.DeferredContent> {
    if (this._requestContentPromise) {
      return this._requestContentPromise;
    }

    if (this._contentLoaded) {
      return Promise.resolve(this._content as TextUtils.ContentProvider.DeferredContent);
    }

    this._requestContentPromise = this._requestContentImpl();
    return this._requestContentPromise;
  }

  async _requestContentImpl(): Promise<TextUtils.ContentProvider.DeferredContent> {
    try {
      const content = await this._project.requestFileContent(this);
      if (!this._contentLoaded) {
        this._contentLoaded = true;
        this._content = content;
        this._contentEncoded = content.isEncoded;
      }
    } catch (err) {
      this._contentLoaded = true;
      this._content = {content: null, error: err ? String(err) : '', isEncoded: false};
    }

    return this._content as TextUtils.ContentProvider.DeferredContent;
  }

  async checkContentUpdated(): Promise<void> {
    if (!this._contentLoaded && !this._forceLoadOnCheckContent) {
      return;
    }

    if (!this._project.canSetFileContent() || this._checkingContent) {
      return;
    }

    this._checkingContent = true;
    const updatedContent = await this._project.requestFileContent(this);
    if ('error' in updatedContent) {
      return;
    }
    this._checkingContent = false;
    if (updatedContent.content === null) {
      const workingCopy = this.workingCopy();
      this._contentCommitted('', false);
      this.setWorkingCopy(workingCopy);
      return;
    }
    if (this._lastAcceptedContent === updatedContent.content) {
      return;
    }

    if (this._content && 'content' in this._content && this._content.content === updatedContent.content) {
      this._lastAcceptedContent = null;
      return;
    }

    if (!this.isDirty() || this._workingCopy === updatedContent.content) {
      this._contentCommitted(updatedContent.content as string, false);
      return;
    }

    await Common.Revealer.reveal(this);

    // Make sure we are in the next frame before stopping the world with confirm
    await new Promise(resolve => setTimeout(resolve, 0));

    const shouldUpdate = window.confirm(i18nString(UIStrings.thisFileWasChangedExternally));
    if (shouldUpdate) {
      this._contentCommitted(updatedContent.content as string, false);
    } else {
      this._lastAcceptedContent = updatedContent.content;
    }
  }

  forceLoadOnCheckContent(): void {
    this._forceLoadOnCheckContent = true;
  }

  _commitContent(content: string): void {
    if (this._project.canSetFileContent()) {
      this._project.setFileContent(this, content, false);
    }
    this._contentCommitted(content, true);
  }

  _contentCommitted(content: string, committedByUser: boolean): void {
    this._lastAcceptedContent = null;
    this._content = {content, isEncoded: false};
    this._contentLoaded = true;
    this._requestContentPromise = null;

    this._hasCommits = true;

    this._innerResetWorkingCopy();
    const data = {uiSourceCode: this, content, encoded: this._contentEncoded};
    this.dispatchEventToListeners(Events.WorkingCopyCommitted, data);
    this._project.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyCommitted, data);
    if (committedByUser) {
      this._project.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyCommittedByUser, data);
    }
  }

  addRevision(content: string): void {
    this._commitContent(content);
  }

  hasCommits(): boolean {
    return this._hasCommits;
  }

  workingCopy(): string {
    if (this._workingCopyGetter) {
      this._workingCopy = this._workingCopyGetter();
      this._workingCopyGetter = null;
    }
    if (this.isDirty()) {
      return this._workingCopy as string;
    }
    return (this._content && 'content' in this._content && this._content.content) || '';
  }

  resetWorkingCopy(): void {
    this._innerResetWorkingCopy();
    this._workingCopyChanged();
  }

  _innerResetWorkingCopy(): void {
    this._workingCopy = null;
    this._workingCopyGetter = null;
  }

  setWorkingCopy(newWorkingCopy: string): void {
    this._workingCopy = newWorkingCopy;
    this._workingCopyGetter = null;
    this._workingCopyChanged();
  }

  setContent(content: string, isBase64: boolean): void {
    this._contentEncoded = isBase64;
    if (this._project.canSetFileContent()) {
      this._project.setFileContent(this, content, isBase64);
    }
    this._contentCommitted(content, true);
  }

  setWorkingCopyGetter(workingCopyGetter: () => string): void {
    this._workingCopyGetter = workingCopyGetter;
    this._workingCopyChanged();
  }

  _workingCopyChanged(): void {
    this._removeAllMessages();
    this.dispatchEventToListeners(Events.WorkingCopyChanged, this);
    this._project.workspace().dispatchEventToListeners(WorkspaceImplEvents.WorkingCopyChanged, {uiSourceCode: this});
  }

  removeWorkingCopyGetter(): void {
    if (!this._workingCopyGetter) {
      return;
    }
    this._workingCopy = this._workingCopyGetter();
    this._workingCopyGetter = null;
  }

  commitWorkingCopy(): void {
    if (this.isDirty()) {
      this._commitContent(this.workingCopy());
    }
  }

  isDirty(): boolean {
    return this._workingCopy !== null || this._workingCopyGetter !== null;
  }

  extension(): string {
    return Common.ParsedURL.ParsedURL.extractExtension(this._name);
  }

  content(): string {
    return (this._content && 'content' in this._content && this._content.content) || '';
  }

  loadError(): string|null {
    return (this._content && 'error' in this._content && this._content.error) || null;
  }

  searchInContent(query: string, caseSensitive: boolean, isRegex: boolean):
      Promise<TextUtils.ContentProvider.SearchMatch[]> {
    const content = this.content();
    if (!content) {
      return this._project.searchInFileContent(this, query, caseSensitive, isRegex);
    }
    return Promise.resolve(TextUtils.TextUtils.performSearchInContent(content, query, caseSensitive, isRegex));
  }

  contentLoaded(): boolean {
    return this._contentLoaded;
  }

  uiLocation(lineNumber: number, columnNumber?: number): UILocation {
    return new UILocation(this, lineNumber, columnNumber);
  }

  messages(): Set<Message> {
    return this._messages ? new Set(this._messages) : new Set();
  }

  addLineMessage(
      level: Message.Level, text: string, lineNumber: number, columnNumber?: number,
      clickHandler?: (() => void)): Message {
    return this.addMessage(
        level, text, new TextUtils.TextRange.TextRange(lineNumber, columnNumber || 0, lineNumber, columnNumber || 0),
        clickHandler);
  }

  addMessage(level: Message.Level, text: string, range: TextUtils.TextRange.TextRange, clickHandler?: (() => void)):
      Message {
    const message = new Message(this, level, text, range, clickHandler);
    if (!this._messages) {
      this._messages = new Set();
    }
    this._messages.add(message);
    this.dispatchEventToListeners(Events.MessageAdded, message);
    return message;
  }

  removeMessage(message: Message): void {
    if (this._messages && this._messages.delete(message)) {
      this.dispatchEventToListeners(Events.MessageRemoved, message);
    }
  }

  _removeAllMessages(): void {
    if (!this._messages) {
      return;
    }
    for (const message of this._messages) {
      this.dispatchEventToListeners(Events.MessageRemoved, message);
    }
    this._messages = null;
  }

  addLineDecoration(lineNumber: number, type: string, data: any): void {
    this.addDecoration(TextUtils.TextRange.TextRange.createFromLocation(lineNumber, 0), type, data);
  }

  addDecoration(range: TextUtils.TextRange.TextRange, type: string, data: any): void {
    const marker = new LineMarker(range, type, data);
    if (!this._decorations) {
      this._decorations = new Platform.MapUtilities.Multimap();
    }
    this._decorations.set(type, marker);
    this.dispatchEventToListeners(Events.LineDecorationAdded, marker);
  }

  removeDecorationsForType(type: string): void {
    if (!this._decorations) {
      return;
    }
    const markers = this._decorations.get(type);
    this._decorations.deleteAll(type);
    markers.forEach(marker => {
      this.dispatchEventToListeners(Events.LineDecorationRemoved, marker);
    });
  }

  allDecorations(): LineMarker[] {
    return this._decorations ? this._decorations.valuesArray() : [];
  }

  removeAllDecorations(): void {
    if (!this._decorations) {
      return;
    }
    const decorationList = this._decorations.valuesArray();
    this._decorations.clear();
    decorationList.forEach(marker => this.dispatchEventToListeners(Events.LineDecorationRemoved, marker));
  }

  decorationsForType(type: string): Set<LineMarker>|null {
    return this._decorations ? this._decorations.get(type) : null;
  }

  disableEdit(): void {
    this._disableEdit = true;
  }

  editDisabled(): boolean {
    return this._disableEdit;
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
  LineDecorationAdded = 'LineDecorationAdded',
  LineDecorationRemoved = 'LineDecorationRemoved',
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

  linkText(skipTrim?: boolean): string {
    let linkText = this.uiSourceCode.displayName(skipTrim);
    if (this.uiSourceCode.mimeType() === 'application/wasm') {
      // For WebAssembly locations, we follow the conventions described in
      // github.com/WebAssembly/design/blob/master/Web.md#developer-facing-display-conventions
      if (typeof this.columnNumber === 'number') {
        linkText += `:0x${this.columnNumber.toString(16)}`;
      }
    } else if (typeof this.lineNumber === 'number') {
      linkText += ':' + (this.lineNumber + 1);
    }
    return linkText;
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

export class Message {
  _uiSourceCode: UISourceCode;
  _level: Message.Level;
  _text: string;
  _range: TextUtils.TextRange.TextRange;
  _clickHandler?: (() => void);

  constructor(
      uiSourceCode: UISourceCode, level: Message.Level, text: string, range: TextUtils.TextRange.TextRange,
      clickHandler?: (() => void)) {
    this._uiSourceCode = uiSourceCode;
    this._level = level;
    this._text = text;
    this._range = range;
    this._clickHandler = clickHandler;
  }

  uiSourceCode(): UISourceCode {
    return this._uiSourceCode;
  }

  level(): Message.Level {
    return this._level;
  }

  text(): string {
    return this._text;
  }

  range(): TextUtils.TextRange.TextRange {
    return this._range;
  }

  clickHandler(): (() => void)|undefined {
    return this._clickHandler;
  }

  lineNumber(): number {
    return this._range.startLine;
  }

  columnNumber(): number|undefined {
    return this._range.startColumn;
  }

  isEqual(another: Message): boolean {
    return this._uiSourceCode === another._uiSourceCode && this.text() === another.text() &&
        this.level() === another.level() && this.range().equal(another.range());
  }

  remove(): void {
    this._uiSourceCode.removeMessage(this);
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
  _range: TextUtils.TextRange.TextRange;
  _type: string;
  _data: any;

  constructor(range: TextUtils.TextRange.TextRange, type: string, data: any) {
    this._range = range;
    this._type = type;
    this._data = data;
  }

  range(): TextUtils.TextRange.TextRange {
    return this._range;
  }

  type(): string {
    return this._type;
  }

  data(): any {
    return this._data;
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
