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
import * as Host from '../../core/host/host.js';
import * as Root from '../../core/root/root.js';
import * as FormatterActions from '../../entrypoints/formatter_worker/FormatterActions.js';  // eslint-disable-line rulesdir/es_modules_import
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import {CoveragePlugin} from './CoveragePlugin.js';
import {CSSPlugin} from './CSSPlugin.js';
import {DebuggerPlugin} from './DebuggerPlugin.js';
import {type Plugin} from './Plugin.js';
import {MemoryProfilePlugin, PerformanceProfilePlugin} from './ProfilePlugin.js';
import {ResourceOriginPlugin} from './ResourceOriginPlugin.js';
import {SnippetsPlugin} from './SnippetsPlugin.js';
import {SourcesPanel} from './SourcesPanel.js';

function sourceFramePlugins(): (typeof Plugin)[] {
  // The order of these plugins matters for toolbar items and editor
  // extension precedence
  return [
    CSSPlugin,
    DebuggerPlugin,
    SnippetsPlugin,
    ResourceOriginPlugin,
    CoveragePlugin,
    MemoryProfilePlugin,
    PerformanceProfilePlugin,
  ];
}

export class UISourceCodeFrame extends
    Common.ObjectWrapper.eventMixin<EventTypes, typeof SourceFrame.SourceFrame.SourceFrameImpl>(
        SourceFrame.SourceFrame.SourceFrameImpl) {
  private uiSourceCodeInternal: Workspace.UISourceCode.UISourceCode;
  private muteSourceCodeEvents: boolean;
  private persistenceBinding: Persistence.Persistence.PersistenceBinding|null;
  private uiSourceCodeEventListeners: Common.EventTarget.EventDescriptor[];
  private messageAndDecorationListeners: Common.EventTarget.EventDescriptor[];
  private readonly boundOnBindingChanged: () => void;
  // The active plugins. These are created in setContent, and
  // recreated when the binding changes
  private plugins: Plugin[] = [];
  private readonly errorPopoverHelper: UI.PopoverHelper.PopoverHelper;
  #sourcesPanelOpenedMetricsRecorded = false;

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super(() => this.workingCopy());
    this.uiSourceCodeInternal = uiSourceCode;

    this.muteSourceCodeEvents = false;

    this.persistenceBinding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);

    this.uiSourceCodeEventListeners = [];
    this.messageAndDecorationListeners = [];

    this.boundOnBindingChanged = this.onBindingChanged.bind(this);

    Common.Settings.Settings.instance()
        .moduleSetting('persistenceNetworkOverridesEnabled')
        .addChangeListener(this.onNetworkPersistenceChanged, this);

    this.errorPopoverHelper =
        new UI.PopoverHelper.PopoverHelper(this.textEditor.editor.contentDOM, this.getErrorPopoverContent.bind(this));
    this.errorPopoverHelper.setHasPadding(true);

    this.errorPopoverHelper.setTimeout(100, 100);

    this.initializeUISourceCode();
  }

  private async workingCopy(): Promise<TextUtils.ContentProvider.DeferredContent> {
    if (this.uiSourceCodeInternal.isDirty()) {
      return {content: this.uiSourceCodeInternal.workingCopy(), isEncoded: false};
    }
    return this.uiSourceCodeInternal.requestContent();
  }

  protected override editorConfiguration(doc: string): CodeMirror.Extension {
    return [
      super.editorConfiguration(doc),
      rowMessages(this.allMessages()),
      // Inject editor extensions from plugins
      pluginCompartment.of(this.plugins.map(plugin => plugin.editorExtension())),
    ];
  }

  protected override onFocus(): void {
    super.onFocus();
    UI.Context.Context.instance().setFlavor(UISourceCodeFrame, this);
  }

  protected override onBlur(): void {
    super.onBlur();
    UI.Context.Context.instance().setFlavor(UISourceCodeFrame, null);
  }

  private installMessageAndDecorationListeners(): void {
    if (this.persistenceBinding) {
      const networkSourceCode = this.persistenceBinding.network;
      const fileSystemSourceCode = this.persistenceBinding.fileSystem;
      this.messageAndDecorationListeners = [
        networkSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded, this.onMessageAdded, this),
        networkSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageRemoved, this.onMessageRemoved, this),
        networkSourceCode.addEventListener(
            Workspace.UISourceCode.Events.DecorationChanged, this.onDecorationChanged, this),

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
            Workspace.UISourceCode.Events.DecorationChanged, this.onDecorationChanged, this),
      ];
    }
  }

  uiSourceCode(): Workspace.UISourceCode.UISourceCode {
    return this.uiSourceCodeInternal;
  }

  setUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const loaded = uiSourceCode.contentLoaded() ? Promise.resolve() : uiSourceCode.requestContent();
    const startUISourceCode = this.uiSourceCodeInternal;
    loaded.then(async () => {
      if (this.uiSourceCodeInternal !== startUISourceCode) {
        return;
      }
      this.unloadUISourceCode();
      this.uiSourceCodeInternal = uiSourceCode;
      if (uiSourceCode.workingCopy() !== this.textEditor.state.doc.toString()) {
        await this.setDeferredContent(Promise.resolve(uiSourceCode.workingCopyContent()));
      } else {
        this.reloadPlugins();
      }
      this.initializeUISourceCode();
    }, console.error);
  }

  private unloadUISourceCode(): void {
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
      this.uiSourceCodeInternal.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.onTitleChanged, this),
    ];

    Persistence.Persistence.PersistenceImpl.instance().subscribeForBindingEvent(
        this.uiSourceCodeInternal, this.boundOnBindingChanged);
    this.installMessageAndDecorationListeners();
    this.updateStyle();
    const canPrettyPrint = FormatterActions.FORMATTABLE_MEDIA_TYPES.includes(this.contentType) &&
        !this.uiSourceCodeInternal.project().canSetFileContent() &&
        Persistence.Persistence.PersistenceImpl.instance().binding(this.uiSourceCodeInternal) === null;
    const autoPrettyPrint = Root.Runtime.experiments.isEnabled('sourcesPrettyPrint') &&
        !this.uiSourceCodeInternal.contentType().isFromSourceMap();
    this.setCanPrettyPrint(canPrettyPrint, autoPrettyPrint);
  }

  override wasShown(): void {
    super.wasShown();
    this.setEditable(this.canEditSourceInternal());
  }

  override willHide(): void {
    for (const plugin of this.plugins) {
      plugin.willHide();
    }
    super.willHide();
    UI.Context.Context.instance().setFlavor(UISourceCodeFrame, null);
    this.uiSourceCodeInternal.removeWorkingCopyGetter();
  }

  protected override getContentType(): string {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(this.uiSourceCodeInternal);
    const mimeType = binding ? binding.network.mimeType() : this.uiSourceCodeInternal.mimeType();
    return Common.ResourceType.ResourceType.simplifyContentType(mimeType);
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

  override async setContent(content: string): Promise<void> {
    this.disposePlugins();
    this.loadPlugins();
    await super.setContent(content);
    for (const plugin of this.plugins) {
      plugin.editorInitialized(this.textEditor);
    }
    this.#recordSourcesPanelOpenedMetrics();
    Common.EventTarget.fireEvent('source-file-loaded', this.uiSourceCodeInternal.displayName(true));
  }

  private createMessage(origin: Workspace.UISourceCode.Message): RowMessage {
    const {lineNumber, columnNumber} = this.uiLocationToEditorLocation(origin.lineNumber(), origin.columnNumber());
    return new RowMessage(origin, lineNumber, columnNumber);
  }

  private allMessages(): RowMessage[] {
    const origins = this.persistenceBinding !== null ?
        [...this.persistenceBinding.network.messages(), ...this.persistenceBinding.fileSystem.messages()] :
        [...this.uiSourceCodeInternal.messages()];
    return origins.map(origin => this.createMessage(origin));
  }

  override onTextChanged(): void {
    const wasPretty = this.pretty;
    super.onTextChanged();
    this.errorPopoverHelper.hidePopover();
    SourcesPanel.instance().updateLastModificationTime();
    this.muteSourceCodeEvents = true;
    if (this.isClean()) {
      this.uiSourceCodeInternal.resetWorkingCopy();
    } else {
      this.uiSourceCodeInternal.setWorkingCopyGetter(() => this.textEditor.state.sliceDoc());
    }
    this.muteSourceCodeEvents = false;
    if (wasPretty !== this.pretty) {
      this.updateStyle();
      this.reloadPlugins();
    }
  }

  onWorkingCopyChanged(): void {
    if (this.muteSourceCodeEvents) {
      return;
    }
    this.maybeSetContent(this.uiSourceCodeInternal.workingCopyContent());
  }

  private onWorkingCopyCommitted(): void {
    if (!this.muteSourceCodeEvents) {
      this.maybeSetContent(this.uiSourceCode().workingCopyContent());
    }
    this.contentCommitted();
    this.updateStyle();
  }

  private reloadPlugins(): void {
    this.disposePlugins();
    this.loadPlugins();
    const editor = this.textEditor;
    editor.dispatch({effects: pluginCompartment.reconfigure(this.plugins.map(plugin => plugin.editorExtension()))});
    for (const plugin of this.plugins) {
      plugin.editorInitialized(editor);
    }
  }

  private onTitleChanged(): void {
    this.updateLanguageMode('').then(() => this.reloadPlugins(), console.error);
  }

  private loadPlugins(): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(this.uiSourceCodeInternal);
    const pluginUISourceCode = binding ? binding.network : this.uiSourceCodeInternal;

    for (const pluginType of sourceFramePlugins()) {
      if (pluginType.accepts(pluginUISourceCode)) {
        this.plugins.push(new pluginType(pluginUISourceCode, this));
      }
    }

    this.dispatchEventToListeners(Events.ToolbarItemsChanged);
  }

  private disposePlugins(): void {
    for (const plugin of this.plugins) {
      plugin.dispose();
    }
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
    this.reloadMessages();
    this.reloadPlugins();
  }

  private reloadMessages(): void {
    const messages = this.allMessages();
    const {editor} = this.textEditor;
    editor.dispatch({effects: setRowMessages.of(RowMessages.create(messages))});
  }

  private updateStyle(): void {
    this.setEditable(this.canEditSourceInternal());
  }

  private maybeSetContent(content: TextUtils.ContentProvider.DeferredContent): void {
    if (this.textEditor.state.doc.toString() !== content.content) {
      void this.setDeferredContent(Promise.resolve(content));
    }
  }

  protected override populateTextAreaContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu, lineNumber: number, columnNumber: number): void {
    super.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber);
    contextMenu.appendApplicableItems(this.uiSourceCodeInternal);
    const location = this.editorLocationToUILocation(lineNumber, columnNumber);
    contextMenu.appendApplicableItems(
        new Workspace.UISourceCode.UILocation(this.uiSourceCodeInternal, location.lineNumber, location.columnNumber));
    for (const plugin of this.plugins) {
      plugin.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber);
    }
  }

  protected override populateLineGutterContextMenu(contextMenu: UI.ContextMenu.ContextMenu, lineNumber: number): void {
    super.populateLineGutterContextMenu(contextMenu, lineNumber);
    for (const plugin of this.plugins) {
      plugin.populateLineGutterContextMenu(contextMenu, lineNumber);
    }
  }

  dispose(): void {
    this.errorPopoverHelper.dispose();
    this.disposePlugins();
    this.unloadUISourceCode();
    this.textEditor.editor.destroy();
    this.detach();
    Common.Settings.Settings.instance()
        .moduleSetting('persistenceNetworkOverridesEnabled')
        .removeChangeListener(this.onNetworkPersistenceChanged, this);
  }

  private onMessageAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.Message>): void {
    const {editor} = this.textEditor, shownMessages = editor.state.field(showRowMessages, false);
    if (shownMessages) {
      const message = this.createMessage(event.data);
      editor.dispatch({effects: setRowMessages.of(shownMessages.messages.add(message))});
    }
  }

  private onMessageRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.Message>): void {
    const {editor} = this.textEditor, shownMessages = editor.state.field(showRowMessages, false);
    if (shownMessages) {
      const message = this.createMessage(event.data);
      editor.dispatch({effects: setRowMessages.of(shownMessages.messages.remove(message))});
    }
  }

  private onDecorationChanged(event: Common.EventTarget.EventTargetEvent<string>): void {
    for (const plugin of this.plugins) {
      plugin.decorationChanged(event.data as SourceFrame.SourceFrame.DecoratorType, this.textEditor);
    }
  }

  override async toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
    const leftToolbarItems = await super.toolbarItems();
    const rightToolbarItems = [];
    for (const plugin of this.plugins) {
      leftToolbarItems.push(...plugin.leftToolbarItems());
      rightToolbarItems.push(...plugin.rightToolbarItems());
    }

    if (!rightToolbarItems.length) {
      return leftToolbarItems;
    }

    return [...leftToolbarItems, new UI.Toolbar.ToolbarSeparator(true), ...rightToolbarItems];
  }

  private getErrorPopoverContent(event: Event): UI.PopoverHelper.PopoverRequest|null {
    const mouseEvent = event as MouseEvent;
    const eventTarget = event.target as HTMLElement;
    const anchorElement = eventTarget.enclosingNodeOrSelfWithClass('cm-messageIcon-error') ||
        eventTarget.enclosingNodeOrSelfWithClass('cm-messageIcon-issue');
    if (!anchorElement) {
      return null;
    }

    const messageField = this.textEditor.state.field(showRowMessages, false);
    if (!messageField || messageField.messages.rows.length === 0) {
      return null;
    }
    const {editor} = this.textEditor;
    const position = editor.posAtCoords(mouseEvent);
    if (position === null) {
      return null;
    }
    const line = editor.state.doc.lineAt(position);
    if (position !== line.to) {
      return null;
    }
    const row = messageField.messages.rows.find(row => row[0].lineNumber() === line.number - 1);
    if (!row) {
      return null;
    }
    const issues = anchorElement.classList.contains('cm-messageIcon-issue');
    const messages = row.filter(msg => (msg.level() === Workspace.UISourceCode.Message.Level.Issue) === issues);
    if (!messages.length) {
      return null;
    }
    const anchor =
        anchorElement ? anchorElement.boxInWindow() : new AnchorBox(mouseEvent.clientX, mouseEvent.clientY, 1, 1);

    const counts = countDuplicates(messages);
    const element = document.createElement('div');
    element.classList.add('text-editor-messages-description-container');
    for (let i = 0; i < messages.length; i++) {
      if (counts[i]) {
        element.appendChild(renderMessage(messages[i], counts[i]));
      }
    }
    return {
      box: anchor,
      hide(): void{},
      show: async(popover: UI.GlassPane.GlassPane): Promise<true> => {
        popover.contentElement.append(element);
        return true;
      },
    };
  }

  /**
   * Only records metrics once per UISourceCodeFrame instance and must only be
   * called once the content of the UISourceCode is available.
   */
  #recordSourcesPanelOpenedMetrics(): void {
    if (this.#sourcesPanelOpenedMetricsRecorded) {
      return;
    }
    this.#sourcesPanelOpenedMetricsRecorded = true;

    const mimeType = Common.ResourceType.ResourceType.mimeFromURL(this.uiSourceCodeInternal.url());
    const mediaType = Common.ResourceType.ResourceType.mediaTypeForMetrics(
        mimeType ?? '', this.uiSourceCodeInternal.contentType().isFromSourceMap(),
        TextUtils.TextUtils.isMinified(this.uiSourceCodeInternal.content()));
    Host.userMetrics.sourcesPanelFileOpened(mediaType);
  }
}

function getIconDataForLevel(level: Workspace.UISourceCode.Message.Level): IconButton.Icon.IconData {
  if (level === Workspace.UISourceCode.Message.Level.Error) {
    return {color: 'var(--icon-error)', width: '16px', height: '14px', iconName: 'cross-circle-filled'};
  }
  if (level === Workspace.UISourceCode.Message.Level.Warning) {
    return {color: 'var(--icon-warning)', width: '18px', height: '14px', iconName: 'warning-filled'};
  }
  if (level === Workspace.UISourceCode.Message.Level.Issue) {
    return {color: 'var(--icon-warning)', width: '17px', height: '14px', iconName: 'issue-exclamation-filled'};
  }
  return {color: 'var(--icon-error)', width: '16px', height: '14px', iconName: 'cross-circle-filled'};
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

function messageLevelComparator(a: RowMessage, b: RowMessage): number {
  const messageLevelPriority = {
    [Workspace.UISourceCode.Message.Level.Issue]: 2,
    [Workspace.UISourceCode.Message.Level.Warning]: 3,
    [Workspace.UISourceCode.Message.Level.Error]: 4,
  };
  return messageLevelPriority[a.level()] - messageLevelPriority[b.level()];
}

function getIconDataForMessage(message: RowMessage): IconButton.Icon.IconData {
  if (message.origin instanceof IssuesManager.SourceFrameIssuesManager.IssueMessage) {
    return {
      ...IssueCounter.IssueCounter.getIssueKindIconData(message.origin.getIssueKind()),
      width: '12px',
      height: '12px',
    };
  }
  return getIconDataForLevel(message.level());
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ToolbarItemsChanged = 'ToolbarItemsChanged',
}

export type EventTypes = {
  [Events.ToolbarItemsChanged]: void,
};

const pluginCompartment = new CodeMirror.Compartment();

// Row message management and display logic. The frame manages a
// collection of messages, organized by line (row), as a wavy
// underline starting at the start of the first message, up to the end
// of the line, with icons indicating the message severity and content
// at the end of the line.

class RowMessage {
  readonly origin: Workspace.UISourceCode.Message;
  readonly #lineNumber: number;
  readonly #columnNumber: number;

  constructor(origin: Workspace.UISourceCode.Message, lineNumber: number, columnNumber: number) {
    this.origin = origin;
    this.#lineNumber = lineNumber;
    this.#columnNumber = columnNumber;
  }

  level(): Workspace.UISourceCode.Message.Level {
    return this.origin.level();
  }

  text(): string {
    return this.origin.text();
  }

  clickHandler(): (() => void)|undefined {
    return this.origin.clickHandler();
  }

  lineNumber(): number {
    return this.#lineNumber;
  }

  columnNumber(): number {
    return this.#columnNumber;
  }

  isEqual(that: RowMessage): boolean {
    return this.origin.isEqual(that.origin);
  }
}

function addMessage(rows: RowMessage[][], message: RowMessage): RowMessage[][] {
  const lineNumber = message.lineNumber();
  let i = 0;
  for (; i < rows.length; i++) {
    const diff = rows[i][0].lineNumber() - lineNumber;
    if (diff === 0) {
      rows[i] = rows[i].concat(message);
      return rows;
    }
    if (diff > 0) {
      break;
    }
  }
  rows.splice(i, 0, [message]);
  return rows;
}

function removeMessage(rows: RowMessage[][], message: RowMessage): void {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0].lineNumber() === message.lineNumber()) {
      const remaining = rows[i].filter(m => !m.isEqual(message));
      if (remaining.length) {
        rows[i] = remaining;
      } else {
        rows.splice(i, 1);
      }
      break;
    }
  }
}

class RowMessages {
  constructor(readonly rows: RowMessage[][]) {
  }

  static create(messages: RowMessage[]): RowMessages {
    const rows: RowMessage[][] = [];
    for (const message of messages) {
      addMessage(rows, message);
    }
    return new RowMessages(rows);
  }

  remove(message: RowMessage): RowMessages {
    const rows = this.rows.slice();
    removeMessage(rows, message);
    return new RowMessages(rows);
  }

  add(message: RowMessage): RowMessages {
    return new RowMessages(addMessage(this.rows.slice(), message));
  }
}

const setRowMessages = CodeMirror.StateEffect.define<RowMessages>();

const underlineMark = CodeMirror.Decoration.mark({class: 'cm-waveUnderline'});

// The widget shown at the end of a message annotation.
class MessageWidget extends CodeMirror.WidgetType {
  constructor(readonly messages: RowMessage[]) {
    super();
  }

  override eq(other: MessageWidget): boolean {
    return other.messages === this.messages;
  }

  toDOM(): HTMLElement {
    const wrap = document.createElement('span');
    wrap.classList.add('cm-messageIcon');
    const nonIssues = this.messages.filter(msg => msg.level() !== Workspace.UISourceCode.Message.Level.Issue);
    if (nonIssues.length) {
      const maxIssue = nonIssues.sort(messageLevelComparator)[nonIssues.length - 1];
      const errorIcon = wrap.appendChild(new IconButton.Icon.Icon());
      errorIcon.data = getIconDataForLevel(maxIssue.level());
      errorIcon.classList.add('cm-messageIcon-error');
    }
    const issue = this.messages.find(m => m.level() === Workspace.UISourceCode.Message.Level.Issue);
    if (issue) {
      const issueIcon = wrap.appendChild(new IconButton.Icon.Icon());
      issueIcon.data = getIconDataForLevel(Workspace.UISourceCode.Message.Level.Issue);
      issueIcon.classList.add('cm-messageIcon-issue');
      issueIcon.addEventListener('click', () => (issue.clickHandler() || Math.min)());
    }
    return wrap;
  }

  ignoreEvents(): boolean {
    return true;
  }
}

class RowMessageDecorations {
  constructor(readonly messages: RowMessages, readonly decorations: CodeMirror.DecorationSet) {
  }

  static create(messages: RowMessages, doc: CodeMirror.Text): RowMessageDecorations {
    const builder = new CodeMirror.RangeSetBuilder<CodeMirror.Decoration>();
    for (const row of messages.rows) {
      const line = doc.line(row[0].lineNumber() + 1);
      const minCol = row.reduce((col, msg) => Math.min(col, msg.columnNumber() || 0), line.length);
      if (minCol < line.length) {
        builder.add(line.from + minCol, line.to, underlineMark);
      }
      builder.add(line.to, line.to, CodeMirror.Decoration.widget({side: 1, widget: new MessageWidget(row)}));
    }
    return new RowMessageDecorations(messages, builder.finish());
  }

  apply(tr: CodeMirror.Transaction): RowMessageDecorations {
    let result: RowMessageDecorations = this;
    if (tr.docChanged) {
      result = new RowMessageDecorations(this.messages, this.decorations.map(tr.changes));
    }
    for (const effect of tr.effects) {
      if (effect.is(setRowMessages)) {
        result = RowMessageDecorations.create(effect.value, tr.state.doc);
      }
    }
    return result;
  }
}

const showRowMessages = CodeMirror.StateField.define<RowMessageDecorations>({
  create(state): RowMessageDecorations {
    return RowMessageDecorations.create(new RowMessages([]), state.doc);
  },
  update(value, tr): RowMessageDecorations {
    return value.apply(tr);
  },
  provide: field => CodeMirror.Prec.lowest(CodeMirror.EditorView.decorations.from(field, value => value.decorations)),
});

function countDuplicates(messages: RowMessage[]): number[] {
  const counts = [];
  for (let i = 0; i < messages.length; i++) {
    counts[i] = 0;
    for (let j = 0; j <= i; j++) {
      if (messages[j].isEqual(messages[i])) {
        counts[j]++;
        break;
      }
    }
  }
  return counts;
}

function renderMessage(message: RowMessage, count: number): HTMLElement {
  const element = document.createElement('div');
  element.classList.add('text-editor-row-message');
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.gap = '4px';

  if (count === 1) {
    const icon = element.appendChild(new IconButton.Icon.Icon());
    icon.data = getIconDataForMessage(message);
    icon.classList.add('text-editor-row-message-icon');
    icon.addEventListener('click', () => (message.clickHandler() || Math.min)());
  } else {
    const repeatCountElement =
        document.createElement('span', {is: 'dt-small-bubble'}) as UI.UIUtils.DevToolsSmallBubble;
    repeatCountElement.textContent = String(count);
    repeatCountElement.classList.add('text-editor-row-message-repeat-count');
    repeatCountElement.style.flexShrink = '0';
    element.appendChild(repeatCountElement);
    repeatCountElement.type = getBubbleTypePerLevel(message.level());
  }
  const linesContainer = element.createChild('div');
  for (const line of message.text().split('\n')) {
    linesContainer.createChild('div').textContent = line;
  }

  return element;
}

const rowMessageTheme = CodeMirror.EditorView.baseTheme({
  '.cm-tooltip-message': {
    padding: '4px',
  },

  '.cm-waveUnderline': {
    backgroundImage: 'var(--image-file-errorWave)',
    backgroundRepeat: 'repeat-x',
    backgroundPosition: 'bottom',
    paddingBottom: '1px',
  },

  '.cm-messageIcon': {
    cursor: 'pointer',
    '& > *': {
      verticalAlign: 'text-bottom',
      marginLeft: '2px',
    },
  },

  '.cm-messageIcon-issue, .cm-messageIcon-error': {
    marginTop: '-1px',
    marginBottom: '-1px',
  },
});

function rowMessages(initialMessages: RowMessage[]): CodeMirror.Extension {
  return [
    showRowMessages.init(
        (state): RowMessageDecorations => RowMessageDecorations.create(RowMessages.create(initialMessages), state.doc)),
    rowMessageTheme,
  ];
}
