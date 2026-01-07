// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as FormatterActions from '../../entrypoints/formatter_worker/FormatterActions.js';  // eslint-disable-line @devtools/es-modules-import
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import {Icon, type IconWithName} from '../../ui/kit/kit.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import {AiCodeCompletionPlugin} from './AiCodeCompletionPlugin.js';
import {AiWarningInfobarPlugin} from './AiWarningInfobarPlugin.js';
import {CoveragePlugin} from './CoveragePlugin.js';
import {CSSPlugin} from './CSSPlugin.js';
import {DebuggerPlugin} from './DebuggerPlugin.js';
import type {Plugin} from './Plugin.js';
import {MemoryProfilePlugin, PerformanceProfilePlugin} from './ProfilePlugin.js';
import {ResourceOriginPlugin} from './ResourceOriginPlugin.js';
import {SnippetsPlugin} from './SnippetsPlugin.js';
import {SourcesPanel} from './SourcesPanel.js';

export class UISourceCodeFrame extends Common.ObjectWrapper
                                           .eventMixin<EventTypes, typeof SourceFrame.SourceFrame.SourceFrameImpl>(
                                               SourceFrame.SourceFrame.SourceFrameImpl) {
  #uiSourceCode: Workspace.UISourceCode.UISourceCode;
  #muteSourceCodeEvents = false;
  #persistenceBinding: Persistence.Persistence.PersistenceBinding|null;
  #uiSourceCodeEventListeners: Common.EventTarget.EventDescriptor[] = [];
  #messageAndDecorationListeners: Common.EventTarget.EventDescriptor[] = [];
  readonly #boundOnBindingChanged: () => void;
  // The active plugins. These are created in setContent, and
  // recreated when the binding changes
  // Used in web tests
  private plugins: Plugin[] = [];
  readonly #errorPopoverHelper: UI.PopoverHelper.PopoverHelper;
  #sourcesPanelOpenedMetricsRecorded = false;

  constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super(() => this.workingCopy());

    this.#uiSourceCode = uiSourceCode;

    this.#persistenceBinding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);

    this.#boundOnBindingChanged = this.onBindingChanged.bind(this);

    Common.Settings.Settings.instance()
        .moduleSetting('persistence-network-overrides-enabled')
        .addChangeListener(this.onNetworkPersistenceChanged, this);

    this.#errorPopoverHelper = new UI.PopoverHelper.PopoverHelper(
        this.textEditor.editor.contentDOM, this.getErrorPopoverContent.bind(this), 'sources.error');

    this.#errorPopoverHelper.setTimeout(100, 100);
    this.initializeUISourceCode();
  }

  private async workingCopy(): Promise<TextUtils.ContentData.ContentDataOrError> {
    if (this.#uiSourceCode.isDirty()) {
      return this.#uiSourceCode.workingCopyContentData();
    }
    return await this.#uiSourceCode.requestContentData();
  }

  protected override editorConfiguration(doc: string): CodeMirror.Extension {
    return [
      super.editorConfiguration(doc),
      rowMessages(this.allMessages()),
      TextEditor.Config.sourcesWordWrap.instance(),
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
    if (this.#persistenceBinding) {
      const networkSourceCode = this.#persistenceBinding.network;
      const fileSystemSourceCode = this.#persistenceBinding.fileSystem;
      this.#messageAndDecorationListeners = [
        networkSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded, this.onMessageAdded, this),
        networkSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageRemoved, this.onMessageRemoved, this),
        networkSourceCode.addEventListener(
            Workspace.UISourceCode.Events.DecorationChanged, this.onDecorationChanged, this),

        fileSystemSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded, this.onMessageAdded, this),
        fileSystemSourceCode.addEventListener(
            Workspace.UISourceCode.Events.MessageRemoved, this.onMessageRemoved, this),
      ];
    } else {
      this.#messageAndDecorationListeners = [
        this.#uiSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageAdded, this.onMessageAdded, this),
        this.#uiSourceCode.addEventListener(Workspace.UISourceCode.Events.MessageRemoved, this.onMessageRemoved, this),
        this.#uiSourceCode.addEventListener(
            Workspace.UISourceCode.Events.DecorationChanged, this.onDecorationChanged, this),
      ];
    }
  }

  uiSourceCode(): Workspace.UISourceCode.UISourceCode {
    return this.#uiSourceCode;
  }

  setUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const loaded = uiSourceCode.contentLoaded() ? Promise.resolve() : uiSourceCode.requestContentData();
    const startUISourceCode = this.#uiSourceCode;
    loaded.then(async () => {
      if (this.#uiSourceCode !== startUISourceCode) {
        return;
      }
      this.unloadUISourceCode();
      this.#uiSourceCode = uiSourceCode;
      if (uiSourceCode.workingCopy() !== this.textEditor.state.doc.toString()) {
        await this.setContentDataOrError(Promise.resolve(uiSourceCode.workingCopyContentData()));
      } else {
        this.reloadPlugins();
      }
      this.initializeUISourceCode();
    }, console.error);
  }

  private unloadUISourceCode(): void {
    Common.EventTarget.removeEventListeners(this.#messageAndDecorationListeners);
    Common.EventTarget.removeEventListeners(this.#uiSourceCodeEventListeners);
    this.#uiSourceCode.removeWorkingCopyGetter();
    Persistence.Persistence.PersistenceImpl.instance().unsubscribeFromBindingEvent(
        this.#uiSourceCode, this.#boundOnBindingChanged);
  }

  private initializeUISourceCode(): void {
    this.#uiSourceCodeEventListeners = [
      this.#uiSourceCode.addEventListener(
          Workspace.UISourceCode.Events.WorkingCopyChanged, this.onWorkingCopyChanged, this),
      this.#uiSourceCode.addEventListener(
          Workspace.UISourceCode.Events.WorkingCopyCommitted, this.onWorkingCopyCommitted, this),
      this.#uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.onTitleChanged, this),
    ];

    Persistence.Persistence.PersistenceImpl.instance().subscribeForBindingEvent(
        this.#uiSourceCode, this.#boundOnBindingChanged);
    this.installMessageAndDecorationListeners();
    this.updateStyle();
    // Show pretty-print toggle if file type is formattable.
    // For editable JavaScript files, the toggle is hidden because live edit fails on
    // large whitespace changes. For non-JS files (JSON, CSS), the toggle can be shown
    // because they don't have this issue (fixes issue 378870233).
    const isFormattable = FormatterActions.FORMATTABLE_MEDIA_TYPES.includes(this.contentType);
    const isEditable = Persistence.Persistence.PersistenceImpl.instance().hasEditableContent(this.#uiSourceCode);
    // Check if the MIME type is JavaScript (not the resource type, which can be wrong for file system files)
    const isJavaScript = Common.ResourceType.ResourceType.isJavaScriptMimeType(this.contentType);
    const canPrettyPrint = isFormattable && (!isEditable || !isJavaScript);
    const autoPrettyPrint = !this.#uiSourceCode.contentType().isFromSourceMap();
    this.setCanPrettyPrint(canPrettyPrint, autoPrettyPrint);
  }

  override wasShown(): void {
    super.wasShown();
    this.setEditable(this.#canEditSource());
  }

  override willHide(): void {
    for (const plugin of this.plugins) {
      plugin.willHide();
    }
    super.willHide();
    UI.Context.Context.instance().setFlavor(UISourceCodeFrame, null);
    this.#uiSourceCode.removeWorkingCopyGetter();
  }

  protected override getContentType(): string {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(this.#uiSourceCode);
    const mimeType = binding ? binding.network.mimeType() : this.#uiSourceCode.mimeType();
    return Common.ResourceType.ResourceType.simplifyContentType(mimeType);
  }

  #canEditSource(): boolean {
    if (this.hasLoadError()) {
      return false;
    }
    if (this.#uiSourceCode.editDisabled()) {
      return false;
    }
    if (this.#uiSourceCode.mimeType() === 'application/wasm') {
      return false;
    }
    if (Persistence.Persistence.PersistenceImpl.instance().binding(this.#uiSourceCode)) {
      return true;
    }
    if (this.#uiSourceCode.project().canSetFileContent()) {
      return true;
    }
    if (this.#uiSourceCode.project().isServiceProject()) {
      return false;
    }
    if (this.#uiSourceCode.contentType().isFromSourceMap()) {
      // Original Scripts/StyleSheets from source maps can only be edited when mapped via workspace.
      // That case is handled above by the `binding` check on `PersistenceImpl`.
      return false;
    }
    if (this.#uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network &&
        Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().active()) {
      return true;
    }
    // Because live edit fails on large whitespace changes, pretty printed scripts are not editable.
    if (this.pretty && this.#uiSourceCode.contentType().hasScripts()) {
      return false;
    }
    return this.#uiSourceCode.contentType() !== Common.ResourceType.resourceTypes.Document;
  }

  private onNetworkPersistenceChanged(): void {
    this.setEditable(this.#canEditSource());
  }

  commitEditing(): void {
    if (!this.#uiSourceCode.isDirty()) {
      return;
    }

    this.#muteSourceCodeEvents = true;
    this.#uiSourceCode.commitWorkingCopy();
    this.#muteSourceCodeEvents = false;
  }

  override async setContent(content: string): Promise<void> {
    this.disposePlugins();
    this.loadPlugins();
    await super.setContent(content);
    for (const plugin of this.plugins) {
      plugin.editorInitialized(this.textEditor);
    }
    this.#recordSourcesPanelOpenedMetrics();
    Common.EventTarget.fireEvent('source-file-loaded', this.#uiSourceCode.displayName(true));
  }

  private createMessage(origin: Workspace.UISourceCode.Message): RowMessage {
    const {lineNumber, columnNumber} = this.uiLocationToEditorLocation(origin.lineNumber(), origin.columnNumber());
    return new RowMessage(origin, lineNumber, columnNumber);
  }

  private allMessages(): RowMessage[] {
    const origins = this.#persistenceBinding !== null ?
        [...this.#persistenceBinding.network.messages(), ...this.#persistenceBinding.fileSystem.messages()] :
        [...this.#uiSourceCode.messages()];
    return origins.map(origin => this.createMessage(origin));
  }

  override onTextChanged(): void {
    const wasPretty = this.pretty;
    super.onTextChanged();
    this.#errorPopoverHelper.hidePopover();
    SourcesPanel.instance().updateLastModificationTime();
    this.#muteSourceCodeEvents = true;
    // TODO: Bring back `isClean()` check and
    // resetting working copy after making sure that
    // `isClean()` correctly reports true only when
    // the original code and the working copy is the same.
    this.#uiSourceCode.setWorkingCopyGetter(() => this.textEditor.state.sliceDoc());
    this.#muteSourceCodeEvents = false;
    if (wasPretty !== this.pretty) {
      this.updateStyle();
      this.reloadPlugins();
    }
  }

  onWorkingCopyChanged(): void {
    if (this.#muteSourceCodeEvents) {
      return;
    }
    this.maybeSetContent(this.#uiSourceCode.workingCopyContentData());
  }

  private onWorkingCopyCommitted(): void {
    if (!this.#muteSourceCodeEvents) {
      this.maybeSetContent(this.uiSourceCode().workingCopyContentData());
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

  static sourceFramePlugins(): Array<typeof Plugin> {
    // The order of these plugins matters for toolbar items and editor
    // extension precedence
    const sourceFramePluginsList = [
      CSSPlugin,
      DebuggerPlugin,
      SnippetsPlugin,
      ResourceOriginPlugin,
      CoveragePlugin,
      MemoryProfilePlugin,
      PerformanceProfilePlugin,
      AiWarningInfobarPlugin,
    ];

    const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
    if (AiCodeCompletion.AiCodeCompletion.AiCodeCompletion.isAiCodeCompletionEnabled(devtoolsLocale.locale)) {
      sourceFramePluginsList.push(AiCodeCompletionPlugin);
    }
    return sourceFramePluginsList;
  }

  private loadPlugins(): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(this.#uiSourceCode);
    const pluginUISourceCode = binding ? binding.network : this.#uiSourceCode;

    for (const pluginType of UISourceCodeFrame.sourceFramePlugins()) {
      if (pluginType.accepts(pluginUISourceCode)) {
        this.plugins.push(new pluginType(pluginUISourceCode, this));
      }
    }

    this.dispatchEventToListeners(Events.TOOLBAR_ITEMS_CHANGED);
  }

  private disposePlugins(): void {
    for (const plugin of this.plugins) {
      plugin.dispose();
    }
    this.plugins = [];
  }

  private onBindingChanged(): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(this.#uiSourceCode);
    if (binding === this.#persistenceBinding) {
      return;
    }
    this.unloadUISourceCode();
    this.#persistenceBinding = binding;
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
    this.setEditable(this.#canEditSource());
  }

  private maybeSetContent(content: TextUtils.ContentData.ContentData): void {
    if (this.textEditor.state.doc.toString() !== content.text) {
      void this.setContentDataOrError(Promise.resolve(content));
    }
  }

  protected override populateTextAreaContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu, lineNumber: number, columnNumber: number): void {
    super.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber);
    contextMenu.appendApplicableItems(this.#uiSourceCode);
    const location = this.editorLocationToUILocation(lineNumber, columnNumber);
    contextMenu.appendApplicableItems(
        new Workspace.UISourceCode.UILocation(this.#uiSourceCode, location.lineNumber, location.columnNumber));
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
    this.#errorPopoverHelper.dispose();
    this.disposePlugins();
    this.unloadUISourceCode();
    this.textEditor.editor.destroy();
    this.detach();
    Common.Settings.Settings.instance()
        .moduleSetting('persistence-network-overrides-enabled')
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
      plugin.decorationChanged(event.data as Workspace.UISourceCode.DecoratorType, this.textEditor);
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
    const messages = row.filter(msg => (msg.level() === Workspace.UISourceCode.Message.Level.ISSUE) === issues);
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
      show: async (popover: UI.GlassPane.GlassPane) => {
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

    const mimeType = Common.ResourceType.ResourceType.mimeFromURL(this.#uiSourceCode.url());
    const mediaType = Common.ResourceType.ResourceType.mediaTypeForMetrics(
        mimeType ?? '', this.#uiSourceCode.contentType().isFromSourceMap(),
        TextUtils.TextUtils.isMinified(this.#uiSourceCode.content()), this.#uiSourceCode.url().startsWith('snippet://'),
        this.#uiSourceCode.url().startsWith('debugger://'));
    Host.userMetrics.sourcesPanelFileOpened(mediaType);
  }
}

function getIconDataForLevel(level: Workspace.UISourceCode.Message.Level): IconWithName {
  if (level === Workspace.UISourceCode.Message.Level.ERROR) {
    return {color: 'var(--icon-error)', width: '16px', height: '14px', iconName: 'cross-circle-filled'};
  }
  if (level === Workspace.UISourceCode.Message.Level.WARNING) {
    return {color: 'var(--icon-warning)', width: '18px', height: '14px', iconName: 'warning-filled'};
  }
  if (level === Workspace.UISourceCode.Message.Level.ISSUE) {
    return {color: 'var(--icon-warning)', width: '17px', height: '14px', iconName: 'issue-exclamation-filled'};
  }
  return {color: 'var(--icon-error)', width: '16px', height: '14px', iconName: 'cross-circle-filled'};
}

function getBubbleTypePerLevel(level: Workspace.UISourceCode.Message.Level): string {
  switch (level) {
    case Workspace.UISourceCode.Message.Level.ERROR:
      return 'error';
    case Workspace.UISourceCode.Message.Level.WARNING:
      return 'warning';
    case Workspace.UISourceCode.Message.Level.ISSUE:
      return 'warning';
  }
}

function messageLevelComparator(a: RowMessage, b: RowMessage): number {
  const messageLevelPriority = {
    [Workspace.UISourceCode.Message.Level.ISSUE]: 2,
    [Workspace.UISourceCode.Message.Level.WARNING]: 3,
    [Workspace.UISourceCode.Message.Level.ERROR]: 4,
  };
  return messageLevelPriority[a.level()] - messageLevelPriority[b.level()];
}

function getIconDataForMessage(message: RowMessage): IconWithName {
  if (message.origin instanceof IssuesManager.SourceFrameIssuesManager.IssueMessage) {
    return {iconName: IssueCounter.IssueCounter.getIssueKindIconName(message.origin.getIssueKind())};
  }
  return getIconDataForLevel(message.level());
}

export const enum Events {
  TOOLBAR_ITEMS_CHANGED = 'ToolbarItemsChanged',
}

export interface EventTypes {
  [Events.TOOLBAR_ITEMS_CHANGED]: void;
}

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

/** The widget shown at the end of a message annotation. **/
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
    const nonIssues = this.messages.filter(msg => msg.level() !== Workspace.UISourceCode.Message.Level.ISSUE);
    if (nonIssues.length) {
      const maxIssue = nonIssues.sort(messageLevelComparator)[nonIssues.length - 1];
      const iconData = getIconDataForLevel(maxIssue.level());
      const errorIcon = createIconFromIconData(iconData);
      wrap.appendChild(errorIcon);
      errorIcon.classList.add('cm-messageIcon-error');
    }
    const issue = this.messages.find(m => m.level() === Workspace.UISourceCode.Message.Level.ISSUE);
    if (issue) {
      const iconData = getIconDataForMessage(issue);
      const issueIcon = createIconFromIconData(iconData);
      wrap.appendChild(issueIcon);
      issueIcon.classList.add('cm-messageIcon-issue', 'extra-small');
      issueIcon.addEventListener('click', () => (issue.clickHandler() || Math.min)());
    }
    return wrap;
  }
}

class RowMessageDecorations {
  constructor(readonly messages: RowMessages, readonly decorations: CodeMirror.DecorationSet) {
  }

  static create(messages: RowMessages, doc: CodeMirror.Text): RowMessageDecorations {
    const builder = new CodeMirror.RangeSetBuilder<CodeMirror.Decoration>();
    for (const row of messages.rows) {
      const line = doc.line(Math.min(doc.lines, row[0].lineNumber() + 1));
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

function createIconFromIconData(data: IconWithName): Icon {
  const icon = new Icon();
  icon.name = data.iconName;
  if (data.width) {
    icon.style.width = data.width;
  }
  if (data.height) {
    icon.style.height = data.height;
  }
  return icon;
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
    const data = getIconDataForMessage(message);
    const icon = createIconFromIconData(data);
    element.appendChild(icon);
    icon.classList.add('text-editor-row-message-icon', 'extra-small');
    icon.addEventListener('click', () => (message.clickHandler() || Math.min)());
  } else {
    const repeatCountElement = element.createChild('dt-small-bubble', 'text-editor-row-message-repeat-count');
    repeatCountElement.textContent = String(count);
    repeatCountElement.style.flexShrink = '0';
    repeatCountElement.type = getBubbleTypePerLevel(message.level());
  }
  const linesContainer = element.createChild('div');
  for (const line of message.text().split('\n')) {
    linesContainer.createChild('div').textContent = line;
  }

  return element;
}

const rowMessageTheme = CodeMirror.EditorView.baseTheme({
  '.cm-line::selection': {
    backgroundColor: 'transparent',
    color: 'currentColor',
  },
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
    showRowMessages.init(state => RowMessageDecorations.create(RowMessages.create(initialMessages), state.doc)),
    rowMessageTheme,
  ];
}
