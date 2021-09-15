/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import type * as TextEditor from '../../ui/legacy/components/text_editor/text_editor.js';
import * as UI from '../../ui/legacy/legacy.js';

import {CoveragePlugin} from './CoveragePlugin.js';
import {CSSPlugin} from './CSSPlugin.js';
import {DebuggerPlugin} from './DebuggerPlugin.js';
import {GutterDiffPlugin} from './GutterDiffPlugin.js';
import {JavaScriptCompilerPlugin} from './JavaScriptCompilerPlugin.js';
import type {Plugin} from './Plugin.js';
import {ScriptOriginPlugin} from './ScriptOriginPlugin.js';
import {SnippetsPlugin} from './SnippetsPlugin.js';
import {SourcesPanel} from './SourcesPanel.js';

export class UISourceCodeFrame extends
    Common.ObjectWrapper.eventMixin<EventTypes, typeof SourceFrame.SourceFrame.SourceFrameImpl>(
        SourceFrame.SourceFrame.SourceFrameImpl) {
  private uiSourceCodeInternal: Workspace.UISourceCode.UISourceCode;
  private readonly diff: SourceFrame.SourceCodeDiff.SourceCodeDiff|undefined;
  private muteSourceCodeEvents: boolean;
  private isSettingContent: boolean;
  private persistenceBinding: Persistence.Persistence.PersistenceBinding|null;
  private readonly rowMessageBuckets: Map<number, RowMessageBucket>;
  private readonly typeDecorationsPending: Set<string>;
  private uiSourceCodeEventListeners: Common.EventTarget.EventDescriptor[];
  private messageAndDecorationListeners: Common.EventTarget.EventDescriptor[];
  private readonly boundOnBindingChanged: () => void;
  private readonly errorPopoverHelper: UI.PopoverHelper.PopoverHelper;
  private plugins: Plugin[];

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super(workingCopy);
    this.uiSourceCodeInternal = uiSourceCode;

    if (Root.Runtime.experiments.isEnabled('sourceDiff')) {
      this.diff = new SourceFrame.SourceCodeDiff.SourceCodeDiff(this.textEditor);
    }

    this.muteSourceCodeEvents = false;
    this.isSettingContent = false;

    this.persistenceBinding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);

    this.rowMessageBuckets = new Map();
    this.typeDecorationsPending = new Set();

    this.uiSourceCodeEventListeners = [];
    this.messageAndDecorationListeners = [];

    this.boundOnBindingChanged = this.onBindingChanged.bind(this);

    this.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.EditorBlurred,
        () => UI.Context.Context.instance().setFlavor(UISourceCodeFrame, null));
    this.textEditor.addEventListener(
        SourceFrame.SourcesTextEditor.Events.EditorFocused,
        () => UI.Context.Context.instance().setFlavor(UISourceCodeFrame, this));
    Common.Settings.Settings.instance()
        .moduleSetting('persistenceNetworkOverridesEnabled')
        .addChangeListener(this.onNetworkPersistenceChanged, this);

    this.errorPopoverHelper = new UI.PopoverHelper.PopoverHelper(this.element, this.getErrorPopoverContent.bind(this));
    this.errorPopoverHelper.setHasPadding(true);

    this.errorPopoverHelper.setTimeout(100, 100);

    this.plugins = [];

    this.initializeUISourceCode();

    function workingCopy(): Promise<TextUtils.ContentProvider.DeferredContent> {
      if (uiSourceCode.isDirty()) {
        return Promise.resolve({content: uiSourceCode.workingCopy(), isEncoded: false});
      }
      return uiSourceCode.requestContent();
    }
  }

  private installMessageAndDecorationListeners(): void {
    if (this.persistenceBinding) {
      const networkSourceCode = this.persistenceBinding.network;
      const fileSystemSourceCode = this.persistenceBinding.fileSystem;
      this.messageAndDecorationListeners = [
        networkSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded, this.onMessageAdded, this),
        networkSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageRemoved, this.onMessageRemoved, this),
        networkSourceCode.addEventListener(
            Workspace.UISourceCode.Events.LineDecorationAdded, this.onLineDecorationAdded, this),
        networkSourceCode.addEventListener(
            Workspace.UISourceCode.Events.LineDecorationRemoved, this.onLineDecorationRemoved, this),

        fileSystemSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded, this.onMessageAdded, this),
        fileSystemSourceCode.addEventListener(
            Workspace.UISourceCode.Events.MessageRemoved, this.onMessageRemoved, this),
      ];
    } else {
      this.messageAndDecorationListeners = [
        this.uiSourceCodeInternal.addEventListener(
            Workspace.UISourceCode.Events.MessageAdded, this.onMessageAdded, this),
        this.uiSourceCodeInternal.addEventListener(
            Workspace.UISourceCode.Events.MessageRemoved, this.onMessageRemoved, this),
        this.uiSourceCodeInternal.addEventListener(
            Workspace.UISourceCode.Events.LineDecorationAdded, this.onLineDecorationAdded, this),
        this.uiSourceCodeInternal.addEventListener(
            Workspace.UISourceCode.Events.LineDecorationRemoved, this.onLineDecorationRemoved, this),
      ];
    }
  }

  uiSourceCode(): Workspace.UISourceCode.UISourceCode {
    return this.uiSourceCodeInternal;
  }

  setUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.unloadUISourceCode();
    this.uiSourceCodeInternal = uiSourceCode;
    if (uiSourceCode.contentLoaded()) {
      if (uiSourceCode.workingCopy() !== this.textEditor.text()) {
        this.innerSetContent(uiSourceCode.workingCopy());
      }
    } else {
      uiSourceCode.requestContent().then(() => {
        if (this.uiSourceCodeInternal !== uiSourceCode) {
          return;
        }
        if (uiSourceCode.workingCopy() !== this.textEditor.text()) {
          this.innerSetContent(uiSourceCode.workingCopy());
        }
      });
    }
    this.initializeUISourceCode();
  }

  private unloadUISourceCode(): void {
    this.disposePlugins();
    for (const message of this.allMessages()) {
      this.removeMessageFromSource(message);
    }
    Common.EventTarget.removeEventListeners(this.messageAndDecorationListeners);
    Common.EventTarget.removeEventListeners(this.uiSourceCodeEventListeners);
    this.uiSourceCodeInternal.removeWorkingCopyGetter();
    Persistence.Persistence.PersistenceImpl.instance().unsubscribeFromBindingEvent(
        this.uiSourceCodeInternal, this.boundOnBindingChanged);
  }

  private initializeUISourceCode(): void {
    this.uiSourceCodeEventListeners = [
      this.uiSourceCodeInternal.addEventListener(
          Workspace.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this),
      this.uiSourceCodeInternal.addEventListener(
          Workspace.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this),
      this.uiSourceCodeInternal.addEventListener(
          Workspace.UISourceCode.Events.TitleChanged, this.refreshHighlighterType, this),
    ];

    Persistence.Persistence.PersistenceImpl.instance().subscribeForBindingEvent(
        this.uiSourceCodeInternal, this.boundOnBindingChanged);
    for (const message of this.allMessages()) {
      this.addMessageToSource(message);
    }
    this.installMessageAndDecorationListeners();
    this.updateStyle();
    this.decorateAllTypes();
    this.refreshHighlighterType();
    if (Root.Runtime.experiments.isEnabled('sourcesPrettyPrint')) {
      const supportedPrettyTypes = new Set<string>(['text/html', 'text/css', 'text/javascript']);
      this.setCanPrettyPrint(supportedPrettyTypes.has(this.highlighterType()), true);
    }
    this.ensurePluginsLoaded();
  }

  wasShown(): void {
    super.wasShown();
    // We need CodeMirrorTextEditor to be initialized prior to this call as it calls |cursorPositionToCoordinates| internally. @see crbug.com/506566
    window.setTimeout(() => this.updateBucketDecorations(), 0);
    this.setEditable(this.canEditSourceInternal());
    for (const plugin of this.plugins) {
      plugin.wasShown();
    }
  }

  willHide(): void {
    for (const plugin of this.plugins) {
      plugin.willHide();
    }
    super.willHide();
    UI.Context.Context.instance().setFlavor(UISourceCodeFrame, null);
    this.uiSourceCodeInternal.removeWorkingCopyGetter();
  }

  private refreshHighlighterType(): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(this.uiSourceCodeInternal);
    const highlighterType = binding ? binding.network.mimeType() : this.uiSourceCodeInternal.mimeType();
    if (this.highlighterType() === highlighterType) {
      return;
    }
    this.disposePlugins();
    this.setHighlighterType(highlighterType);
    this.ensurePluginsLoaded();
  }

  canEditSourceInternal(): boolean {
    if (this.hasLoadError()) {
      return false;
    }
    if (this.uiSourceCodeInternal.editDisabled()) {
      return false;
    }
    if (this.uiSourceCodeInternal.mimeType() === 'application/wasm') {
      return false;
    }
    if (Persistence.Persistence.PersistenceImpl.instance().binding(this.uiSourceCodeInternal)) {
      return true;
    }
    if (this.uiSourceCodeInternal.project().canSetFileContent()) {
      return true;
    }
    if (this.uiSourceCodeInternal.project().isServiceProject()) {
      return false;
    }
    if (this.uiSourceCodeInternal.project().type() === Workspace.Workspace.projectTypes.Network &&
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().active()) {
      return true;
    }
    // Because live edit fails on large whitespace changes, pretty printed scripts are not editable.
    if (this.pretty && this.uiSourceCodeInternal.contentType().hasScripts()) {
      return false;
    }
    return this.uiSourceCodeInternal.contentType() !== Common.ResourceType.resourceTypes.Document;
  }

  private onNetworkPersistenceChanged(): void {
    this.setEditable(this.canEditSourceInternal());
  }

  commitEditing(): void {
    if (!this.uiSourceCodeInternal.isDirty()) {
      return;
    }

    this.muteSourceCodeEvents = true;
    this.uiSourceCodeInternal.commitWorkingCopy();
    this.muteSourceCodeEvents = false;
  }

  setContent(content: string|null, loadError: string|null): void {
    this.disposePlugins();
    this.rowMessageBuckets.clear();
    super.setContent(content, loadError);
    for (const message of this.allMessages()) {
      this.addMessageToSource(message);
    }
    this.decorateAllTypes();
    this.ensurePluginsLoaded();
    Common.EventTarget.fireEvent('source-file-loaded', this.uiSourceCodeInternal.displayName(true));
  }

  private allMessages(): Set<Workspace.UISourceCode.Message> {
    if (this.persistenceBinding) {
      const combinedSet = this.persistenceBinding.network.messages();
      Platform.SetUtilities.addAll(combinedSet, this.persistenceBinding.fileSystem.messages());
      return combinedSet;
    }
    return this.uiSourceCodeInternal.messages();
  }

  onTextChanged(oldRange: TextUtils.TextRange.TextRange, newRange: TextUtils.TextRange.TextRange): void {
    const wasPretty = this.pretty;
    super.onTextChanged(oldRange, newRange);
    this.errorPopoverHelper.hidePopover();
    if (this.isSettingContent) {
      return;
    }
    SourcesPanel.instance().updateLastModificationTime();
    this.muteSourceCodeEvents = true;
    if (this.isClean()) {
      this.uiSourceCodeInternal.resetWorkingCopy();
    } else {
      this.uiSourceCodeInternal.setWorkingCopyGetter(this.textEditor.text.bind(this.textEditor));
    }
    this.muteSourceCodeEvents = false;
    if (wasPretty !== this.pretty) {
      this.updateStyle();
      this.disposePlugins();
      this.ensurePluginsLoaded();
    }
  }

  onWorkingCopyChanged(): void {
    if (this.muteSourceCodeEvents) {
      return;
    }
    this.innerSetContent(this.uiSourceCodeInternal.workingCopy());
  }

  private onWorkingCopyCommitted(): void {
    if (!this.muteSourceCodeEvents) {
      this.innerSetContent(this.uiSourceCode().workingCopy());
    }
    this.contentCommitted();
    this.updateStyle();
  }

  private ensurePluginsLoaded(): void {
    if (!this.loaded || this.plugins.length) {
      return;
    }

    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(this.uiSourceCodeInternal);
    const pluginUISourceCode = binding ? binding.network : this.uiSourceCodeInternal;

    // The order of these plugins matters for toolbar items
    if (DebuggerPlugin.accepts(pluginUISourceCode)) {
      this.plugins.push(new DebuggerPlugin(this.textEditor, pluginUISourceCode, this));
    }
    if (CSSPlugin.accepts(pluginUISourceCode)) {
      this.plugins.push(new CSSPlugin(this.textEditor));
    }
    if (!this.pretty && JavaScriptCompilerPlugin.accepts(pluginUISourceCode)) {
      this.plugins.push(new JavaScriptCompilerPlugin(this.textEditor, pluginUISourceCode));
    }
    if (SnippetsPlugin.accepts(pluginUISourceCode)) {
      this.plugins.push(new SnippetsPlugin(this.textEditor, pluginUISourceCode));
    }
    if (ScriptOriginPlugin.accepts(pluginUISourceCode)) {
      this.plugins.push(new ScriptOriginPlugin(this.textEditor, pluginUISourceCode));
    }
    if (!this.pretty && Root.Runtime.experiments.isEnabled('sourceDiff') &&
        GutterDiffPlugin.accepts(pluginUISourceCode)) {
      this.plugins.push(new GutterDiffPlugin(this.textEditor, pluginUISourceCode));
    }
    if (CoveragePlugin.accepts(pluginUISourceCode)) {
      this.plugins.push(new CoveragePlugin(this.textEditor, pluginUISourceCode));
    }

    this.dispatchEventToListeners(Events.ToolbarItemsChanged);
    for (const plugin of this.plugins) {
      plugin.wasShown();
    }
  }

  private disposePlugins(): void {
    this.textEditor.operation(() => {
      for (const plugin of this.plugins) {
        plugin.dispose();
      }
    });
    this.plugins = [];
  }

  private onBindingChanged(): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(this.uiSourceCodeInternal);
    if (binding === this.persistenceBinding) {
      return;
    }
    this.unloadUISourceCode();
    this.persistenceBinding = binding;
    this.initializeUISourceCode();
  }

  private updateStyle(): void {
    this.setEditable(this.canEditSourceInternal());
  }

  private innerSetContent(content: string): void {
    this.isSettingContent = true;
    const oldContent = this.textEditor.text();
    if (this.diff) {
      this.diff.highlightModifiedLines(oldContent, content);
    }
    if (oldContent !== content) {
      this.setContent(content, null);
    }
    this.isSettingContent = false;
  }

  async populateTextAreaContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu, editorLineNumber: number, editorColumnNumber: number): Promise<void> {
    await super.populateTextAreaContextMenu(contextMenu, editorLineNumber, editorColumnNumber);
    contextMenu.appendApplicableItems(this.uiSourceCodeInternal);
    const location = this.editorLocationToUILocation(editorLineNumber, editorColumnNumber);
    contextMenu.appendApplicableItems(
        new Workspace.UISourceCode.UILocation(this.uiSourceCodeInternal, location.lineNumber, location.columnNumber));
    contextMenu.appendApplicableItems(this);
    for (const plugin of this.plugins) {
      await plugin.populateTextAreaContextMenu(contextMenu, editorLineNumber, editorColumnNumber);
    }
  }

  dispose(): void {
    this.errorPopoverHelper.dispose();
    this.unloadUISourceCode();
    this.textEditor.dispose();
    this.detach();
    Common.Settings.Settings.instance()
        .moduleSetting('persistenceNetworkOverridesEnabled')
        .removeChangeListener(this.onNetworkPersistenceChanged, this);
  }

  private onMessageAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.Message>): void {
    const message = event.data;
    this.addMessageToSource(message);
  }

  private getClampedEditorLineNumberForMessage(message: Workspace.UISourceCode.Message): number {
    let {lineNumber} = this.uiLocationToEditorLocation(message.lineNumber(), message.columnNumber());
    if (lineNumber >= this.textEditor.linesCount) {
      lineNumber = this.textEditor.linesCount - 1;
    }
    if (lineNumber < 0) {
      lineNumber = 0;
    }
    return lineNumber;
  }

  private addMessageToSource(message: Workspace.UISourceCode.Message): void {
    if (!this.loaded) {
      return;
    }

    const editorLineNumber = this.getClampedEditorLineNumberForMessage(message);
    let messageBucket = this.rowMessageBuckets.get(editorLineNumber);
    if (!messageBucket) {
      messageBucket = new RowMessageBucket(this, this.textEditor, editorLineNumber);
      this.rowMessageBuckets.set(editorLineNumber, messageBucket);
    }
    messageBucket.addMessage(message);
  }

  private onMessageRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.Message>): void {
    const message = event.data;
    this.removeMessageFromSource(message);
  }

  private removeMessageFromSource(message: Workspace.UISourceCode.Message): void {
    if (!this.loaded) {
      return;
    }

    const editorLineNumber = this.getClampedEditorLineNumberForMessage(message);
    const messageBucket = this.rowMessageBuckets.get(editorLineNumber);
    if (!messageBucket) {
      return;
    }
    messageBucket.removeMessage(message);
    if (!messageBucket.uniqueMessagesCount()) {
      messageBucket.detachFromEditor();
      this.rowMessageBuckets.delete(editorLineNumber);
    }
  }

  private getErrorPopoverContent(event: Event): UI.PopoverHelper.PopoverRequest|null {
    const mouseEvent = (event as MouseEvent);
    const eventTarget = (mouseEvent.target as HTMLElement);
    return RowMessageBucket.getPopover(eventTarget, mouseEvent);
  }

  private updateBucketDecorations(): void {
    for (const bucket of this.rowMessageBuckets.values()) {
      bucket.updateDecoration();
    }
  }

  private onLineDecorationAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.LineMarker>): void {
    const marker = event.data;
    this.decorateTypeThrottled(marker.type());
  }

  private onLineDecorationRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.LineMarker>): void {
    const marker = event.data;
    this.decorateTypeThrottled(marker.type());
  }

  private decorateTypeThrottled(type: string): void {
    if (this.typeDecorationsPending.has(type)) {
      return;
    }
    this.typeDecorationsPending.add(type);
    const extension =
        SourceFrame.SourceFrame.getRegisteredLineDecorators().find(extension => extension.decoratorType === type);
    const decorator = extension && extension.lineDecorator();
    if (!decorator) {
      return;
    }
    this.typeDecorationsPending.delete(type);
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.textEditor.codeMirror() as any).operation(() => {
      decorator.decorate(
          this.persistenceBinding ? this.persistenceBinding.network : this.uiSourceCode(), this.textEditor, type);
    });
  }

  private decorateAllTypes(): void {
    if (!this.loaded) {
      return;
    }
    for (const extension of SourceFrame.SourceFrame.getRegisteredLineDecorators()) {
      const type = extension.decoratorType;
      if (type !== null && this.uiSourceCodeInternal.decorationsForType(type)) {
        this.decorateTypeThrottled(type);
      }
    }
  }

  async toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
    const leftToolbarItems = await super.toolbarItems();
    const rightToolbarItems = [];
    for (const plugin of this.plugins) {
      leftToolbarItems.push(...plugin.leftToolbarItems());
      rightToolbarItems.push(...await plugin.rightToolbarItems());
    }

    if (!rightToolbarItems.length) {
      return leftToolbarItems;
    }

    return [...leftToolbarItems, new UI.Toolbar.ToolbarSeparator(true), ...rightToolbarItems];
  }

  async populateLineGutterContextMenu(contextMenu: UI.ContextMenu.ContextMenu, lineNumber: number): Promise<void> {
    await super.populateLineGutterContextMenu(contextMenu, lineNumber);
    for (const plugin of this.plugins) {
      await plugin.populateLineGutterContextMenu(contextMenu, lineNumber);
    }
  }
}

function getIconDataForLevel(level: Workspace.UISourceCode.Message.Level): IconButton.Icon.IconData {
  if (level === Workspace.UISourceCode.Message.Level.Error) {
    return {color: '', width: '12px', height: '12px', iconName: 'error_icon'};
  }
  if (level === Workspace.UISourceCode.Message.Level.Warning) {
    return {color: '', width: '12px', height: '12px', iconName: 'warning_icon'};
  }
  if (level === Workspace.UISourceCode.Message.Level.Issue) {
    return {color: 'var(--issue-color-yellow)', width: '12px', height: '12px', iconName: 'issue-exclamation-icon'};
  }
  return {color: '', width: '12px', height: '12px', iconName: 'error_icon'};
}

function getBubbleTypePerLevel(level: Workspace.UISourceCode.Message.Level): string {
  switch (level) {
    case Workspace.UISourceCode.Message.Level.Error:
      return 'error';
    case Workspace.UISourceCode.Message.Level.Warning:
      return 'warning';
    case Workspace.UISourceCode.Message.Level.Issue:
      return 'warning';
  }
}

function getLineClassPerLevel(level: Workspace.UISourceCode.Message.Level): string {
  switch (level) {
    case Workspace.UISourceCode.Message.Level.Error:
      return 'text-editor-line-with-error';
    case Workspace.UISourceCode.Message.Level.Warning:
      return 'text-editor-line-with-warning';
    case Workspace.UISourceCode.Message.Level.Issue:
      return 'text-editor-line-with-warning';
  }
}

function getIconDataForMessage(message: Workspace.UISourceCode.Message): IconButton.Icon.IconData {
  if (message instanceof IssuesManager.SourceFrameIssuesManager.IssueMessage) {
    return {
      ...IssueCounter.IssueCounter.getIssueKindIconData(message.getIssueKind()),
      width: '12px',
      height: '12px',
    };
  }
  return getIconDataForLevel(message.level());
}

export class RowMessage {
  private message: Workspace.UISourceCode.Message;
  private repeatCount: number;
  element: HTMLDivElement;
  private icon: IconButton.Icon.Icon;
  private repeatCountElement: UI.UIUtils.DevToolsSmallBubble;

  constructor(message: Workspace.UISourceCode.Message) {
    this.message = message;
    this.repeatCount = 1;
    this.element = document.createElement('div');
    this.element.classList.add('text-editor-row-message');
    this.icon = new IconButton.Icon.Icon();
    this.icon.data = getIconDataForMessage(message);
    this.icon.classList.add('text-editor-row-message-icon');
    this.icon.addEventListener('click', () => this.callClickHandler());

    this.element.append(this.icon);
    this.repeatCountElement = document.createElement('span', {is: 'dt-small-bubble'}) as UI.UIUtils.DevToolsSmallBubble;
    this.repeatCountElement.classList.add('text-editor-row-message-repeat-count', 'hidden');
    this.element.appendChild(this.repeatCountElement);
    this.repeatCountElement.type = getBubbleTypePerLevel(message.level());
    const linesContainer = this.element.createChild('div');
    const lines = this.message.text().split('\n');
    for (let i = 0; i < lines.length; ++i) {
      const messageLine = linesContainer.createChild('div');
      messageLine.textContent = lines[i];
    }
  }

  getMessage(): Workspace.UISourceCode.Message {
    return this.message;
  }

  callClickHandler(): void {
    const handler = this.message.clickHandler();
    if (handler) {
      handler();
    }
  }

  getRepeatCount(): number {
    return this.repeatCount;
  }

  setRepeatCount(repeatCount: number): void {
    if (this.repeatCount === repeatCount) {
      return;
    }
    this.repeatCount = repeatCount;
    this.updateMessageRepeatCount();
  }

  private updateMessageRepeatCount(): void {
    this.repeatCountElement.textContent = String(this.repeatCount);
    const showRepeatCount = this.repeatCount > 1;
    this.repeatCountElement.classList.toggle('hidden', !showRepeatCount);
    this.icon.classList.toggle('hidden', showRepeatCount);
  }
}

const elementToMessageBucket = new WeakMap<Element, RowMessageBucket>();
const bookmarkTypeRowBucket = Symbol('bookmarkTypeRowBucket');

export class RowMessageBucket {
  private sourceFrame: UISourceCodeFrame;
  private textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor;
  private readonly lineHandle: TextEditor.CodeMirrorTextEditor.TextEditorPositionHandle;
  private readonly decoration: HTMLDivElement;
  private readonly wave: HTMLElement;
  private errorIcon: IconButton.Icon.Icon;
  private issueIcon: IconButton.Icon.Icon;
  private decorationStartColumn: number|null;
  private readonly messagesDescriptionElement: HTMLDivElement;
  private messages: RowMessage[];
  private level: Workspace.UISourceCode.Message.Level|null;
  private bookmark?: TextEditor.CodeMirrorTextEditor.TextEditorBookMark;
  private iconsElement: HTMLSpanElement;

  constructor(
      sourceFrame: UISourceCodeFrame, textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor,
      editorLineNumber: number) {
    this.sourceFrame = sourceFrame;
    this.textEditor = textEditor;
    this.lineHandle = textEditor.textEditorPositionHandle(editorLineNumber, 0);
    this.decoration = document.createElement('div');
    this.decoration.classList.add('text-editor-line-decoration');
    elementToMessageBucket.set(this.decoration, this);
    this.wave = this.decoration.createChild('div', 'text-editor-line-decoration-wave');

    this.errorIcon = new IconButton.Icon.Icon();
    this.errorIcon.data = getIconDataForLevel(Workspace.UISourceCode.Message.Level.Warning);
    this.errorIcon.classList.add('text-editor-line-decoration-icon-error');
    this.issueIcon = new IconButton.Icon.Icon();
    this.issueIcon.data = getIconDataForLevel(Workspace.UISourceCode.Message.Level.Issue);
    this.issueIcon.classList.add('text-editor-line-decoration-icon-issue');
    this.issueIcon.addEventListener('click', () => this.issueClickHandler());

    this.iconsElement = document.createElement('span');
    this.iconsElement.append(this.errorIcon);
    this.iconsElement.append(this.issueIcon);
    this.iconsElement.classList.add('text-editor-line-decoration-icon');
    elementToMessageBucket.set(this.iconsElement, this);

    this.decorationStartColumn = null;

    this.messagesDescriptionElement = document.createElement('div');
    this.messagesDescriptionElement.classList.add('text-editor-messages-description-container');
    this.messages = [];

    this.level = null;
  }

  private updateWavePosition(editorLineNumber: number, columnNumber: number): void {
    editorLineNumber = Math.min(editorLineNumber, this.textEditor.linesCount - 1);
    const lineText = this.textEditor.line(editorLineNumber);
    columnNumber = Math.min(columnNumber, lineText.length);
    const lineIndent = TextUtils.TextUtils.Utils.lineIndent(lineText).length;
    const startColumn = Math.max(columnNumber, lineIndent);
    if (this.decorationStartColumn === startColumn) {
      return;
    }
    if (this.decorationStartColumn !== null) {
      this.textEditor.removeDecoration(this.decoration, editorLineNumber);
    }
    this.textEditor.addDecoration(this.decoration, editorLineNumber, startColumn);
    this.decorationStartColumn = startColumn;
  }

  private messageDescription(levels: Set<Workspace.UISourceCode.Message.Level>): Element {
    this.messagesDescriptionElement.removeChildren();
    UI.Utils.appendStyle(this.messagesDescriptionElement, 'ui/legacy/components/source_frame/messagesPopover.css');
    for (const message of this.messages.filter(m => levels.has(m.getMessage().level()))) {
      this.messagesDescriptionElement.append(message.element);
    }
    return this.messagesDescriptionElement;
  }

  detachFromEditor(): void {
    const position = this.lineHandle.resolve();
    if (!position) {
      return;
    }
    const editorLineNumber = position.lineNumber;
    if (this.level) {
      this.textEditor.toggleLineClass(editorLineNumber, getLineClassPerLevel(this.level), false);
    }
    if (this.decorationStartColumn !== null) {
      this.textEditor.removeDecoration(this.decoration, editorLineNumber);
      this.decorationStartColumn = null;
    }
    if (this.bookmark) {
      this.bookmark.clear();
    }
  }

  uniqueMessagesCount(): number {
    return this.messages.length;
  }

  private issueClickHandler(): void {
    const firstIssue = this.messages.find(m => m.getMessage().level() === Workspace.UISourceCode.Message.Level.Issue);
    if (firstIssue) {
      firstIssue.callClickHandler();
    }
  }

  addMessage(message: Workspace.UISourceCode.Message): void {
    for (let i = 0; i < this.messages.length; ++i) {
      const rowMessage = this.messages[i];
      if (rowMessage.getMessage().isEqual(message)) {
        rowMessage.setRepeatCount(rowMessage.getRepeatCount() + 1);
        return;
      }
    }

    const rowMessage = new RowMessage(message);
    this.messages.push(rowMessage);
    this.updateDecoration();
  }

  removeMessage(message: Workspace.UISourceCode.Message): void {
    for (let i = 0; i < this.messages.length; ++i) {
      const rowMessage = this.messages[i];
      if (!rowMessage.getMessage().isEqual(message)) {
        continue;
      }
      rowMessage.setRepeatCount(rowMessage.getRepeatCount() - 1);
      if (!rowMessage.getRepeatCount()) {
        this.messages.splice(i, 1);
      }
      this.updateDecoration();
      return;
    }
  }

  updateDecoration(): void {
    if (!this.sourceFrame.isShowing()) {
      return;
    }
    if (this.bookmark) {
      this.bookmark.clear();
    }
    if (!this.messages.length) {
      return;
    }
    const position = this.lineHandle.resolve();
    if (!position) {
      return;
    }

    const editorLineNumber = position.lineNumber;
    let columnNumber: number = Number.MAX_VALUE;
    let maxMessage: Workspace.UISourceCode.Message|null = null;
    let maxIssueKind = IssuesManager.Issue.IssueKind.Improvement;
    let showIssues = false;
    let showErrors = false;
    for (let i = 0; i < this.messages.length; ++i) {
      const message = this.messages[i].getMessage();
      const {columnNumber: editorColumnNumber} =
          this.sourceFrame.uiLocationToEditorLocation(editorLineNumber, message.columnNumber());
      columnNumber = Math.min(columnNumber, editorColumnNumber);
      if (!maxMessage || messageLevelComparator(maxMessage, message) < 0) {
        maxMessage = message;
      }
      if (message instanceof IssuesManager.SourceFrameIssuesManager.IssueMessage) {
        maxIssueKind = IssuesManager.Issue.unionIssueKind(maxIssueKind, message.getIssueKind());
      }
      showIssues = showIssues || message.level() === Workspace.UISourceCode.Message.Level.Issue;
      showErrors = showErrors || message.level() !== Workspace.UISourceCode.Message.Level.Issue;
    }
    this.updateWavePosition(editorLineNumber, columnNumber);

    if (!maxMessage) {
      return;
    }
    if (this.level) {
      this.textEditor.toggleLineClass(editorLineNumber, getLineClassPerLevel(this.level), false);
    }
    this.level = maxMessage.level();
    if (!this.level) {
      return;
    }
    this.textEditor.toggleLineClass(editorLineNumber, getLineClassPerLevel(this.level), true);
    this.errorIcon.data = getIconDataForLevel(this.level);
    this.issueIcon
        .data = {...IssueCounter.IssueCounter.getIssueKindIconData(maxIssueKind), width: '12px', height: '12px'};
    this.issueIcon.classList.toggle('hidden', !showIssues);
    this.errorIcon.classList.toggle('hidden', !showErrors);
    if (showIssues || showErrors) {
      this.bookmark = this.textEditor.addBookmark(
          editorLineNumber, Number.MAX_SAFE_INTEGER, this.iconsElement, bookmarkTypeRowBucket);
    }
  }

  private getPopoverMessages(eventTarget: HTMLElement): Element|null {
    let messagesOutline: Element|null = null;
    if (eventTarget.classList.contains('text-editor-line-decoration-icon-error')) {
      messagesOutline = this.messageDescription(
          new Set([Workspace.UISourceCode.Message.Level.Error, Workspace.UISourceCode.Message.Level.Warning]));
    } else if (eventTarget.classList.contains('text-editor-line-decoration-icon-issue')) {
      messagesOutline = this.messageDescription(new Set([Workspace.UISourceCode.Message.Level.Issue]));
    } else if (
        eventTarget.classList.contains('text-editor-line-decoration-wave') &&
        !eventTarget.classList.contains('text-editor-line-decoration-icon')) {
      messagesOutline = this.messageDescription(
          new Set([Workspace.UISourceCode.Message.Level.Error, Workspace.UISourceCode.Message.Level.Warning]));
    }
    return messagesOutline;
  }

  static getPopover(eventTarget: HTMLElement, mouseEvent: MouseEvent): UI.PopoverHelper.PopoverRequest|null {
    const enclosingNode = eventTarget.enclosingNodeOrSelfWithClass('text-editor-line-decoration') ||
        eventTarget.enclosingNodeOrSelfWithClass('text-editor-line-decoration-icon');
    const messageBucket = elementToMessageBucket.get(enclosingNode);
    if (!messageBucket) {
      return null;
    }
    const anchorElement = eventTarget.enclosingNodeOrSelfWithClass('text-editor-line-decoration-icon-error') ||
        eventTarget.enclosingNodeOrSelfWithClass('text-editor-line-decoration-icon-issue');
    const anchor =
        anchorElement ? anchorElement.boxInWindow() : new AnchorBox(mouseEvent.clientX, mouseEvent.clientY, 1, 1);
    const messagesOutline = messageBucket.getPopoverMessages(eventTarget);
    if (!messagesOutline) {
      return null;
    }
    return {
      box: anchor,
      hide(): void{},
      show: (popover: UI.GlassPane.GlassPane): Promise<true> => {
        popover.contentElement.append(messagesOutline);
        return Promise.resolve(true);
      },
    };
  }
}

function messageLevelComparator(a: Workspace.UISourceCode.Message, b: Workspace.UISourceCode.Message): number {
  const messageLevelPriority = {
    [Workspace.UISourceCode.Message.Level.Issue]: 2,
    [Workspace.UISourceCode.Message.Level.Warning]: 3,
    [Workspace.UISourceCode.Message.Level.Error]: 4,
  };
  return messageLevelPriority[a.level()] - messageLevelPriority[b.level()];
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ToolbarItemsChanged = 'ToolbarItemsChanged',
}

export type EventTypes = {
  [Events.ToolbarItemsChanged]: void,
};
