// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/tooltips/tooltips.js';
import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelCommon from '../common/common.js';
import * as Snippets from '../snippets/snippets.js';

import * as Components from './components/components.js';
import type {EditingLocationHistoryManager} from './EditingLocationHistoryManager.js';
import {SourcesView} from './SourcesView.js';
import {UISourceCodeFrame} from './UISourceCodeFrame.js';

const UIStrings = {
  /**
   * @description Text to open a file.
   */
  openFile: 'Open file',
  /**
   * @description Text to run commands.
   */
  runCommand: 'Run command',
  /**
   * @description Text in Sources view of the Sources panel.
   */
  workspaceDropInAFolderToSyncSources: 'To sync edits to the workspace, drop a folder with your sources here or',
  /**
   * @description Text in Sources view of the Sources panel.
   */
  selectFolder: 'Select folder',
  /**
   * @description Accessible label for Sources placeholder view actions list.
   */
  sourceViewActions: 'Source View Actions',
  /**
   * @description Text in Tabbed editor container of the Sources panel.
   * @example {file.js} PH1
   */
  areYouSureYouWantToCloseUnsaved: 'Are you sure you want to close unsaved file: {PH1}?',
  /**
   * @description Error message for tooltip showing that a file in the Sources panel could not be loaded.
   */
  unableToLoadThisContent: 'Unable to load this content',
  /**
   * @description Tooltip shown for the warning icon on an editor tab in the Sources panel
   *              when the developer saved changes via Ctrl+S/Cmd+S, while there was an
   *              automatic workspace detected, but not connected.
   * @example {FolderName} PH1
   */
  changesWereNotSavedToFileSystemToSaveAddFolderToWorkspace:
      'Changes weren’t saved to file system. To save, add {PH1} to your Workspace.',
  /**
   * @description Tooltip shown for the warning icon on an editor tab in the Sources panel
   *              when the developer saved changes via Ctrl+S/Cmd+S, but didn't have a Workspace
   *              set up, or the Workspace didn't have a match for this file, and therefore the
   *              changes couldn't be persisted.
   * @example {Workspace} PH1
   */
  changesWereNotSavedToFileSystemToSaveSetUpYourWorkspace:
      'Changes weren’t saved to file system. To save, set up your {PH1}.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/TabbedEditorContainer.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {ref, repeat} = Directives;
const {widget} = UI.Widget;

const enum SourceViewType {
  IMAGE_VIEW = 'ImageView',
  FONT_VIEW = 'FontView',
  HEADERS_VIEW = 'HeadersView',
  SOURCE_VIEW = 'SourceView',
}
const HEADER_OVERRIDES_FILENAME = '.headers';

interface TabInfo {
  tabId: string;
  title: string;
  tooltip: string;
  uiSourceCode: Workspace.UISourceCode.UISourceCode;
  isCloseable: boolean;
  widget?: UI.Widget.Widget;
  hasLoadError: boolean;
  hasUnsavedCommittedChanges: boolean;
  disconnectedAutomaticFileSystemRoot?: string;
  icon?: LitTemplate;
}

export interface TabbedEditorViewInput {
  openTabs: TabInfo[];
  activeTabId?: string;
  tabDelegate: UI.TabbedPane.TabbedPaneTabDelegate;
  shortcuts: Array<{
    description: Platform.UIString.LocalizedString,
    onClick: () => void,
    keys: string[],
  }>;
  onAddFileSystemClicked: () => void;
  onConnectAutomaticFileSystem: (e: Event) => void;
  onClose: (e: Event) => void;
  onTabOrderChanged: (e: Event) => void;
  onSelect: (e: Event) => void;
}

export interface TabbedEditorViewOutput {
  leftToolbar: UI.Toolbar.Toolbar;
  rightToolbar: UI.Toolbar.Toolbar;
}

export type View = (input: TabbedEditorViewInput, output: TabbedEditorViewOutput, target: HTMLElement) => void;

const UI_SOURCE_CODE_WIDGET_MAP = new WeakMap<Workspace.UISourceCode.UISourceCode, UI.Widget.Widget>();

function getOrCreateSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode,
                               onCreate: (view: UI.Widget.Widget) => void): UI.Widget.Widget {
  const existing = UI_SOURCE_CODE_WIDGET_MAP.get(uiSourceCode);
  if (existing) {
    return existing;
  }

  let sourceView: UI.Widget.Widget;
  const contentType = uiSourceCode.contentType();
  if (contentType === Common.ResourceType.resourceTypes.Image || uiSourceCode.mimeType().startsWith('image/')) {
    sourceView = new SourceFrame.ImageView.ImageView(uiSourceCode.mimeType(), uiSourceCode);
  } else if (contentType === Common.ResourceType.resourceTypes.Font || uiSourceCode.mimeType().includes('font')) {
    sourceView = new SourceFrame.FontView.FontView(uiSourceCode.mimeType(), uiSourceCode);
  } else if (uiSourceCode.name() === Persistence.NetworkPersistenceManager.HEADERS_FILENAME) {
    sourceView = new Components.HeadersView.HeadersView(uiSourceCode);
  } else {
    sourceView = new UISourceCodeFrame(uiSourceCode);
  }

  UI_SOURCE_CODE_WIDGET_MAP.set(uiSourceCode, sourceView);
  onCreate(sourceView);
  return sourceView;
}

function recycleUISourceCodeFrame(sourceFrame: UISourceCodeFrame,
                                  uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
  UI_SOURCE_CODE_WIDGET_MAP.delete(sourceFrame.uiSourceCode());
  sourceFrame.setUISourceCode(uiSourceCode);
  UI_SOURCE_CODE_WIDGET_MAP.set(uiSourceCode, sourceFrame);
}

function getViewByUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget|undefined {
  return UI_SOURCE_CODE_WIDGET_MAP.get(uiSourceCode);
}

function removeSourceViewCache(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget|undefined {
  const view = UI_SOURCE_CODE_WIDGET_MAP.get(uiSourceCode);
  if (view) {
    UI_SOURCE_CODE_WIDGET_MAP.delete(uiSourceCode);
  }
  return view;
}
function renderPlaceholder(input: TabbedEditorViewInput): LitTemplate {
  // clang-format off
  return html`
    <div class="sources-placeholder">
      <div class="tabbed-pane-placeholder-row workspace">
        <span class="icon-container">
          <devtools-icon name="sync" class="sync-icon"></devtools-icon>
        </span>
        <span>
          ${i18nString(UIStrings.workspaceDropInAFolderToSyncSources)}
          <button @click=${input.onAddFileSystemClicked}>${i18nString(UIStrings.selectFolder)}</button>
        </span>
      </div>
      <div class="shortcuts-list tabbed-pane-placeholder-row" role="list"
            aria-label=${i18nString(UIStrings.sourceViewActions)}>
        ${input.shortcuts.map(shortcut => !shortcut.keys.length
            ? html`<div class="shortcut-line" role="listitem"></div>`
            : html`<div class="shortcut-line" role="listitem">
              <button @click=${shortcut.onClick}>${shortcut.description}</button>
              <span class="shortcuts">
                ${shortcut.keys.map(key => html`
                  <span class="keybinds-key"><span>${key}</span></span>
                `)}
              </span>
            </div>`)}
      </div>
    </div>`;
  // clang-format on
}

function renderTabIcon(tab: TabInfo): LitTemplate {
  if (tab.hasLoadError) {
    // clang-format off
    return html`
      <span slot="icon">
        <devtools-icon class="small" name="cross-circle-filled"
                        title=${i18nString(UIStrings.unableToLoadThisContent)}>
        </devtools-icon>
      </span>`;
    // clang-format on
  }
  if (tab.icon) {
    return html`<span slot="icon">${tab.icon}</span>`;
  }
  return nothing;
}

function renderTabSuffix(tab: TabInfo, input: TabbedEditorViewInput): LitTemplate {
  if (!tab.hasUnsavedCommittedChanges) {
    return nothing;
  }
  const tooltipId = `tab-tooltip-${tab.tabId}`;
  // clang-format off
  return html`
    <span slot="suffix">
      <div>
        <devtools-icon name="warning-filled" class="small" aria-describedby=${tooltipId}></devtools-icon>
        <devtools-tooltip id=${tooltipId} variant="rich">
          ${tab.disconnectedAutomaticFileSystemRoot !== undefined
              ? uiI18n.getFormatLocalizedStringTemplate(
                    str_, UIStrings.changesWereNotSavedToFileSystemToSaveAddFolderToWorkspace, {
                      PH1: html`<devtools-link class="devtools-link" @click=${input.onConnectAutomaticFileSystem}>${
                          tab.disconnectedAutomaticFileSystemRoot}</devtools-link>`,
                    })
              : uiI18n.getFormatLocalizedStringTemplate(
                    str_, UIStrings.changesWereNotSavedToFileSystemToSaveSetUpYourWorkspace, {
                      PH1: html`<devtools-link href="https://developer.chrome.com/docs/devtools/workspaces/">Workspace</devtools-link>`,
                    })}
        </devtools-tooltip>
      </div>
    </span>`;
  // clang-format on
}

export const DEFAULT_VIEW: View = (input, output, target) => {
  // clang-format off
  render(html`
    <devtools-tabbed-pane
      class="flex-auto vbox"
      .closeableTabs=${true}
      .allowTabReorder=${true}
      .automaticReorder=${true}
      .tabDelegate=${input.tabDelegate}
      .headerJslog=${`${VisualLogging.toolbar('top').track({keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space'})}`}
      .placeholder=${renderPlaceholder(input)}
      @close=${input.onClose}
      @taborderchanged=${input.onTabOrderChanged}
      @select=${input.onSelect}
    >
      <devtools-toolbar class="tabbed-pane-left-toolbar" slot="left" ${ref(e => {
        if (e instanceof UI.Toolbar.Toolbar) {
          output.leftToolbar = e;
        }
      })}></devtools-toolbar>
      <devtools-toolbar class="tabbed-pane-right-toolbar" slot="right" ${ref(e => {
        if (e instanceof UI.Toolbar.Toolbar) {
          output.rightToolbar = e;
        }
      })}></devtools-toolbar>
      ${repeat(input.openTabs, tab => tab.tabId, tab => html`
        <div id=${tab.tabId}
             title=${tab.title}
             ?closeable=${tab.isCloseable}
             ?selected=${input.activeTabId === tab.tabId}
             style="display: flex; flex: auto;">
             ${renderTabIcon(tab)}
             ${renderTabSuffix(tab, input)}
             ${tab.widget ? html`${widget(UI.Widget.WrapperWidget, {widget: tab.widget})}` : nothing}
        </div>`)}
    </devtools-tabbed-pane>`, target);
  // clang-format on
};
let tabId = 0;

const TabbedEditorContainerBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.VBox,
    );

export class TabbedEditorContainer extends TabbedEditorContainerBase {
  override focus(): void {
    if (this.visibleView) {
      this.visibleView.focus();
    }
  }

  #scheduleUpdate(): void {
    this.performUpdate();
  }

  override performUpdate(): void {
    if (false) {
      return;
    }
    const shortcuts = [
      {actionId: 'quick-open.show', description: i18nString(UIStrings.openFile)},
      {actionId: 'quick-open.show-command-menu', description: i18nString(UIStrings.runCommand)},
    ];
    const separator = Host.Platform.isMac() ? '\u2004' : ' + ';
    const shortcutElements = shortcuts.map(shortcut => {
      const shortcutKeys = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction(shortcut.actionId);
      if (!shortcutKeys?.[0]) {
        return {
          description: shortcut.description,
          onClick: () => {},
          keys: [],
        };
      }
      const action = UI.ActionRegistry.ActionRegistry.instance().getAction(shortcut.actionId);
      const keys = shortcutKeys[0].descriptors.flatMap(descriptor => descriptor.name.split(separator));
      return {
        description: shortcut.description,
        onClick: () => {
          void action.execute();
        },
        keys,
      };
    });

    const input: TabbedEditorViewInput = {
      openTabs: [...this.files.entries()].map(([tabId, uiSourceCode]) => {
        const hasLoadError = Boolean(uiSourceCode.loadError()) || this.#loadErrorFiles.has(uiSourceCode);
        const hasUnsavedCommittedChanges = !hasLoadError &&
            Persistence.Persistence.PersistenceImpl.instance().hasUnsavedCommittedChanges(uiSourceCode);
        let disconnectedAutomaticFileSystemRoot: string|undefined;
        if (hasUnsavedCommittedChanges) {
          const {automaticFileSystem} = Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance();
          if (automaticFileSystem?.state === 'disconnected') {
            disconnectedAutomaticFileSystemRoot = Common.ParsedURL.ParsedURL.extractName(automaticFileSystem.root);
          }
        }
        const icon = !hasLoadError ?
            (PanelCommon.PersistenceUtils.PersistenceUtils.iconForUISourceCode(uiSourceCode) ?? undefined) :
            undefined;
        return {
          tabId,
          title: this.titleForFile(uiSourceCode),
          tooltip: this.tooltipForFile(uiSourceCode),
          uiSourceCode,
          isCloseable: true,
          hasLoadError,
          hasUnsavedCommittedChanges,
          disconnectedAutomaticFileSystemRoot,
          icon,
          widget: (this.#currentFile === uiSourceCode) ? this.getOrCreateSourceView(uiSourceCode) :
                                                         this.getCreatedSourceView(uiSourceCode),
        };
      }),
      activeTabId: this.#currentFile ? this.tabIds.get(this.#currentFile) : undefined,
      tabDelegate: this.#tabDelegate,
      shortcuts: shortcutElements,
      onAddFileSystemClicked: () => {
        void this.#addFileSystemClicked();
      },
      onConnectAutomaticFileSystem: async (event: Event) => {
        event.consume();
        await UI.ViewManager.ViewManager.instance().showView('navigator-files');
        await Persistence.AutomaticFileSystemManager.AutomaticFileSystemManager.instance().connectAutomaticFileSystem(
            /* addIfMissing= */ true);
      },
      onClose: (e: Event) => {
        this.tabClosed((e as CustomEvent<{tabId: string}>).detail.tabId,
                       (e as CustomEvent<{isUserGesture?: boolean}>).detail.isUserGesture);
        this.#scheduleUpdate();
      },
      onTabOrderChanged: (e: Event) => {
        const tabIds = (e as CustomEvent<{tabIds: string[]}>).detail.tabIds;
        const newFiles = new Map<string, Workspace.UISourceCode.UISourceCode>();
        for (const id of tabIds) {
          if (this.files.has(id)) {
            const file = this.files.get(id);
            if (file) {
              newFiles.set(id, file);
            }
          }
        }
        this.files = newFiles;
        this.#scheduleUpdate();
      },
      onSelect: (e: Event) => {
        this.tabSelected((e as CustomEvent<{tabId: string}>).detail.tabId,
                         (e as CustomEvent<{isUserGesture?: boolean}>).detail.isUserGesture);
        this.#scheduleUpdate();
      },
    };
    const that = this;
    const output = {
      set leftToolbar(toolbar: UI.Toolbar.Toolbar) {
        that.#leftToolbar = toolbar;
      },
      set rightToolbar(toolbar: UI.Toolbar.Toolbar) {
        that.#rightToolbar = toolbar;
      },
    };
    this.#view(input, output, this.contentElement);
  }
  #historyManager!: EditingLocationHistoryManager;
  set historyManager(historyManager: EditingLocationHistoryManager) {
    this.#historyManager = historyManager;
  }

  readonly #view: View;
  readonly #tabDelegate: EditorContainerTabDelegate;
  private tabIds: Map<Workspace.UISourceCode.UISourceCode, string>;
  private files: Map<string, Workspace.UISourceCode.UISourceCode>;
  readonly #loadErrorFiles = new Set<Workspace.UISourceCode.UISourceCode>();
  #previouslyViewedFilesSetting!: Common.Settings.Setting<SerializedHistoryItem[]>;
  history!: History;
  set previouslyViewedFilesSetting(setting: Common.Settings.Setting<SerializedHistoryItem[]>) {
    this.#previouslyViewedFilesSetting = setting;
    this.history = History.fromObject(this.#previouslyViewedFilesSetting.get());
  }
  get previouslyViewedFilesSetting(): Common.Settings.Setting<SerializedHistoryItem[]> {
    return this.#previouslyViewedFilesSetting;
  }
  private readonly uriToUISourceCode: Map<Platform.DevToolsPath.UrlString, Workspace.UISourceCode.UISourceCode>;
  private readonly idToUISourceCode: Map<string, Workspace.UISourceCode.UISourceCode>;
  #currentFile!: Workspace.UISourceCode.UISourceCode|null;
  private currentView!: UI.Widget.Widget|null;
  private scrollTimer?: number;
  private reentrantShow: boolean;
  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.#tabDelegate = new EditorContainerTabDelegate(this);

    this.tabIds = new Map();
    this.files = new Map();
    this.uriToUISourceCode = new Map();
    this.idToUISourceCode = new Map();
    this.reentrantShow = false;

    this.performUpdate();

    Persistence.Persistence.PersistenceImpl.instance().addEventListener(Persistence.Persistence.Events.BindingCreated,
                                                                        this.onBindingCreated, this);
    Persistence.Persistence.PersistenceImpl.instance().addEventListener(Persistence.Persistence.Events.BindingRemoved,
                                                                        this.onBindingRemoved, this);
    Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().addEventListener(
        Persistence.NetworkPersistenceManager.Events.REQUEST_FOR_HEADER_OVERRIDES_FILE_CHANGED,
        this.#onRequestsForHeaderOverridesFileChanged, this);
  }
  #tabsHistory: string[] = [];
  #appendHistory(tabId: string): void {
    this.#tabsHistory.unshift(tabId);
  }

  get #tabbedPane(): UI.TabbedPane.TabbedPaneElement|null {
    return this.contentElement.querySelector('devtools-tabbed-pane');
  }

  get tabbedPane(): UI.TabbedPane.TabbedPaneElement {
    return this.#tabbedPane as UI.TabbedPane.TabbedPaneElement;
  }

  get tabbedPaneForTesting(): UI.TabbedPane.TabbedPaneElement {
    return this.#tabbedPane as UI.TabbedPane.TabbedPaneElement;
  }

  private onBindingCreated(event: Common.EventTarget.EventTargetEvent<Persistence.Persistence.PersistenceBinding>):
      void {
    const binding = event.data;
    this.updateFileTitle(binding.fileSystem);

    const networkTabId = this.tabIds.get(binding.network);
    let fileSystemTabId = this.tabIds.get(binding.fileSystem);

    const wasSelectedInNetwork = this.#currentFile === binding.network;
    const networkKey = historyItemKey(binding.network);
    const currentSelectionRange = this.history.selectionRange(networkKey);
    const currentScrollLineNumber = this.history.scrollLineNumber(networkKey);
    this.history.remove(networkKey);

    if (!networkTabId) {
      return;
    }

    if (!fileSystemTabId) {
      const networkView: UI.Widget.Widget|null = this.viewForFile(binding.network);
      const tabIndex = Array.from(this.files.keys()).indexOf(networkTabId);
      if (networkView instanceof UISourceCodeFrame) {
        this.recycleUISourceCodeFrame(networkView, binding.fileSystem);
        fileSystemTabId = this.appendFileTab(binding.fileSystem, tabIndex, true);
      } else {
        fileSystemTabId = this.appendFileTab(binding.fileSystem, tabIndex);
        const fileSystemTabView = this.viewForFile(binding.fileSystem);
        if (fileSystemTabView) {
          this.restoreEditorProperties(fileSystemTabView, currentSelectionRange, currentScrollLineNumber);
        }
      }
    }

    this.closeTabs([networkTabId], true);
    if (wasSelectedInNetwork) {
      this.#currentFile = this.files.get(fileSystemTabId) || null;
      this.#scheduleUpdate();
    }

    this.updateHistory();
  }

  #onRequestsForHeaderOverridesFileChanged(
      event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    this.updateFileTitle(event.data);
  }

  private onBindingRemoved(event: Common.EventTarget.EventTargetEvent<Persistence.Persistence.PersistenceBinding>):
      void {
    const binding = event.data;
    this.updateFileTitle(binding.fileSystem);
  }

  get visibleView(): UI.Widget.Widget|null {
    return this.#currentFile ? getViewByUISourceCode(this.#currentFile) || null : null;
  }

  fileViews(): UI.Widget.Widget[] {
    return Array.from(this.files.values()).map(getViewByUISourceCode).filter(Boolean) as UI.Widget.Widget[];
  }

  #leftToolbar!: UI.Toolbar.Toolbar;
  leftToolbar(): UI.Toolbar.Toolbar {
    return this.#leftToolbar;
  }

  #rightToolbar!: UI.Toolbar.Toolbar;
  rightToolbar(): UI.Toolbar.Toolbar {
    return this.#rightToolbar;
  }

  showFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    uiSourceCode = binding ? binding.fileSystem : uiSourceCode;

    const frame = UI.Context.Context.instance().flavor(SourcesView);
    // If the content has already been set and the current frame is showing
    // the incoming uiSourceCode, then fire the event that the file has been loaded.
    // Otherwise, this event will fire as soon as the content has been set.
    if (frame?.currentSourceFrame()?.contentSet && this.#currentFile === uiSourceCode &&
        frame?.currentUISourceCode() === uiSourceCode) {
      window.dispatchEvent(new CustomEvent('source-file-loaded',
                                           {bubbles: true, cancelable: true, detail: uiSourceCode.displayName(true)}));
    } else {
      this.#showFile(uiSourceCode, true);
    }
  }

  closeFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const tabId = this.tabIds.get(uiSourceCode);
    if (!tabId) {
      return;
    }
    this.closeTabs([tabId]);
  }

  closeAllFiles(): void {
    this.closeTabs(Array.from(this.files.keys()));
  }

  detachEditors(): void {
    for (const view of this.fileViews()) {
      view.detach();
    }
  }

  historyUISourceCodes(): Workspace.UISourceCode.UISourceCode[] {
    const result = [];
    for (const {url, resourceType} of this.history.keys()) {
      const uiSourceCode = this.uriToUISourceCode.get(url);
      if (uiSourceCode !== undefined && uiSourceCode.contentType() === resourceType) {
        result.push(uiSourceCode);
      }
    }
    return result;
  }

  selectNextTab(): void {
    const tabIds = Array.from(this.files.keys());
    if (tabIds.length === 0 || !this.#currentFile) {
      return;
    }
    const currentTabId = this.tabIds.get(this.#currentFile);
    if (!currentTabId) {
      return;
    }
    const index = tabIds.indexOf(currentTabId);
    const nextIndex = (index + 1) % tabIds.length;
    const nextFile = this.files.get(tabIds[nextIndex]);
    if (nextFile) {
      this.#showFile(nextFile, false);
    }
  }

  selectPrevTab(): void {
    const tabIds = Array.from(this.files.keys());
    if (tabIds.length === 0 || !this.#currentFile) {
      return;
    }
    const currentTabId = this.tabIds.get(this.#currentFile);
    if (!currentTabId) {
      return;
    }
    const index = tabIds.indexOf(currentTabId);
    const prevIndex = (index - 1 + tabIds.length) % tabIds.length;
    const prevFile = this.files.get(tabIds[prevIndex]);
    if (prevFile) {
      this.#showFile(prevFile, false);
    }
  }

  private addViewListeners(): void {
    if (!this.currentView || !(this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl)) {
      return;
    }
    this.currentView.addEventListener(SourceFrame.SourceFrame.Events.EDITOR_UPDATE, this.onEditorUpdate, this);
    this.currentView.addEventListener(SourceFrame.SourceFrame.Events.EDITOR_SCROLL, this.onScrollChanged, this);
  }

  private removeViewListeners(): void {
    if (!this.currentView || !(this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl)) {
      return;
    }
    this.currentView.removeEventListener(SourceFrame.SourceFrame.Events.EDITOR_UPDATE, this.onEditorUpdate, this);
    this.currentView.removeEventListener(SourceFrame.SourceFrame.Events.EDITOR_SCROLL, this.onScrollChanged, this);
  }

  private onScrollChanged(): void {
    if (this.currentView instanceof SourceFrame.SourceFrame.SourceFrameImpl) {
      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }
      this.scrollTimer = window.setTimeout(() => this.previouslyViewedFilesSetting.set(this.history.toObject()), 100);
      if (this.#currentFile) {
        const {editor} = this.currentView.textEditor;
        const topBlock = editor.lineBlockAtHeight(editor.scrollDOM.getBoundingClientRect().top - editor.documentTop);
        const topLine = editor.state.doc.lineAt(topBlock.from).number - 1;
        this.history.updateScrollLineNumber(historyItemKey(this.#currentFile), topLine);
      }
    }
  }

  private onEditorUpdate({data: update}: Common.EventTarget.EventTargetEvent<CodeMirror.ViewUpdate>): void {
    if (update.docChanged || update.selectionSet) {
      const {main} = update.state.selection;
      const lineFrom = update.state.doc.lineAt(main.from), lineTo = update.state.doc.lineAt(main.to);
      const range = new TextUtils.TextRange.TextRange(lineFrom.number - 1, main.from - lineFrom.from, lineTo.number - 1,
                                                      main.to - lineTo.from);
      if (this.#currentFile) {
        this.history.updateSelectionRange(historyItemKey(this.#currentFile), range);
      }
      this.previouslyViewedFilesSetting.set(this.history.toObject());

      if (this.#currentFile) {
        PanelCommon.ExtensionServer.ExtensionServer.instance().sourceSelectionChanged(this.#currentFile.url(), range);
      }
    }
  }

  #showFile(uiSourceCode: Workspace.UISourceCode.UISourceCode, userGesture?: boolean): void {
    if (this.reentrantShow) {
      return;
    }
    const canonicalSourceCode = this.canonicalUISourceCode(uiSourceCode);
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    uiSourceCode = binding ? binding.fileSystem : uiSourceCode;
    if (this.#currentFile === uiSourceCode) {
      return;
    }

    this.removeViewListeners();
    this.#currentFile = uiSourceCode;

    try {
      // Selecting the tab may cause showFile to be called again, but with the canonical source code,
      // which is not what we want, so we prevent reentrant calls.
      this.reentrantShow = true;
      const tabId = this.tabIds.get(canonicalSourceCode) || this.appendFileTab(canonicalSourceCode);
      this.#appendHistory(tabId);

      this.#scheduleUpdate();
      // Force TabbedPaneElement to sync its tabs synchronously to avoid layout races in E2E tests.
      this.#tabbedPane?.tabs;
    } finally {
      this.reentrantShow = false;
    }

    if (userGesture) {
      this.editorSelectedByUserAction();
    }

    const previousView = this.currentView;
    if (uiSourceCode) {
      this.getOrCreateSourceView(uiSourceCode);
    }
    this.currentView = this.visibleView;
    this.addViewListeners();

    if (this.currentView instanceof UISourceCodeFrame && this.currentView.uiSourceCode() !== uiSourceCode) {
      // We are showing a different UISourceCode in the same tab (because it has the same URL). This
      // commonly happens when switching between workers or iframes containing the same code, and while the
      // contents are usually identical they may not be and it is important to show users when they aren't.
      this.recycleUISourceCodeFrame(this.currentView, uiSourceCode);
      if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem) {
        // Disable editing, because it may confuse users that only one of the copies of this code changes.
        uiSourceCode.disableEdit();
      }
    }

    const eventData = {
      currentFile: this.#currentFile,
      currentView: this.currentView,
      previousView,
      userGesture,
    };
    this.dispatchEventToListeners(Events.EDITOR_SELECTED, eventData);
  }

  private titleForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    const maxDisplayNameLength = 30;
    let title = Platform.StringUtilities.trimMiddle(uiSourceCode.displayName(true), maxDisplayNameLength);
    if (uiSourceCode.isDirty()) {
      title += '*';
    }
    return title;
  }

  private maybeCloseTab(id: string, nextTabId: string|null): boolean {
    const uiSourceCode = this.files.get(id);
    if (!uiSourceCode) {
      return false;
    }
    const shouldPrompt = uiSourceCode.isDirty() && uiSourceCode.project().canSetFileContent();
    // FIXME: this should be replaced with common Save/Discard/Cancel dialog.
    if (!shouldPrompt || confirm(i18nString(UIStrings.areYouSureYouWantToCloseUnsaved, {PH1: uiSourceCode.name()}))) {
      uiSourceCode.resetWorkingCopy();
      if (nextTabId) {
        const nextFile = this.files.get(nextTabId);
        if (nextFile) {
          this.#showFile(nextFile, false);
        }
      }
      this.tabClosed(id, true);
      this.#scheduleUpdate();
      return true;
    }
    return false;
  }

  closeTabs(ids: string[], forceCloseDirtyTabs?: boolean): void {
    const dirtyTabs = [];
    const cleanTabs = [];
    for (let i = 0; i < ids.length; ++i) {
      const id = ids[i];
      const uiSourceCode = this.files.get(id);
      if (uiSourceCode) {
        if (!forceCloseDirtyTabs && uiSourceCode.isDirty()) {
          dirtyTabs.push(id);
        } else {
          cleanTabs.push(id);
        }
      }
    }
    if (dirtyTabs.length) {
      const dirtyFile = this.files.get(dirtyTabs[0]);
      if (dirtyFile) {
        this.#showFile(dirtyFile, false);
      }
    }
    cleanTabs.forEach(id => this.tabClosed(id, true));
    this.#scheduleUpdate();
    for (let i = 0; i < dirtyTabs.length; ++i) {
      const nextTabId = i + 1 < dirtyTabs.length ? dirtyTabs[i + 1] : null;
      if (!this.maybeCloseTab(dirtyTabs[i], nextTabId)) {
        break;
      }
    }
  }

  onContextMenu(tabId: string, contextMenu: UI.ContextMenu.ContextMenu): void {
    const uiSourceCode = this.files.get(tabId);
    if (uiSourceCode) {
      contextMenu.appendApplicableItems(uiSourceCode);
    }
  }

  private canonicalUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Workspace.UISourceCode.UISourceCode {
    // Check if we have already a UISourceCode for this url
    const existingSourceCode = this.idToUISourceCode.get(uiSourceCode.canonicalScriptId());
    if (existingSourceCode) {
      // Ignore incoming uiSourceCode, we already have this file.
      return existingSourceCode;
    }
    this.idToUISourceCode.set(uiSourceCode.canonicalScriptId(), uiSourceCode);
    this.uriToUISourceCode.set(uiSourceCode.url(), uiSourceCode);
    return uiSourceCode;
  }

  addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const canonicalSourceCode = this.canonicalUISourceCode(uiSourceCode);
    const duplicated = canonicalSourceCode !== uiSourceCode;
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(canonicalSourceCode);
    uiSourceCode = binding ? binding.fileSystem : canonicalSourceCode;

    if (duplicated && uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.FileSystem) {
      uiSourceCode.disableEdit();
    }

    if (this.#currentFile?.canonicalScriptId() === uiSourceCode.canonicalScriptId()) {
      return;
    }

    const index = this.history.index(historyItemKey(uiSourceCode));
    if (index === -1) {
      return;
    }

    if (!this.tabIds.has(uiSourceCode)) {
      this.appendFileTab(uiSourceCode);
    }

    // Select tab if this file was the last to be shown.
    if (!index) {
      this.#showFile(uiSourceCode, false);
      return;
    }

    if (!this.#currentFile) {
      return;
    }

    const currentProjectIsSnippets = Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(this.#currentFile);
    const addedProjectIsSnippets = Snippets.ScriptSnippetFileSystem.isSnippetsUISourceCode(uiSourceCode);
    if (this.history.index(historyItemKey(this.#currentFile)) && currentProjectIsSnippets && !addedProjectIsSnippets) {
      this.#showFile(uiSourceCode, false);
    }
  }

  removeUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.removeUISourceCodes([uiSourceCode]);
  }

  removeUISourceCodes(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]): void {
    const tabIds = [];
    for (const uiSourceCode of uiSourceCodes) {
      const tabId = this.tabIds.get(uiSourceCode);
      if (tabId) {
        tabIds.push(tabId);
      } else {
        this.removeSourceFrame(uiSourceCode);
      }
      for (const [k, v] of this.uriToUISourceCode) {
        if (v === uiSourceCode) {
          this.uriToUISourceCode.delete(k);
        }
      }
      for (const [k, v] of this.idToUISourceCode) {
        if (v === uiSourceCode) {
          this.idToUISourceCode.delete(k);
        }
      }
    }
    tabIds.forEach(id => this.tabClosed(id, false));
    this.#scheduleUpdate();
  }

  private editorClosedByUserAction(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    this.history.remove(historyItemKey(uiSourceCode));
    this.updateHistory();
  }

  private editorSelectedByUserAction(): void {
    this.updateHistory();
  }

  private updateHistory(): void {
    const historyItemKeys = [];
    for (const tabId of this.#tabsHistory.slice(0, MAX_PREVIOUSLY_VIEWED_FILES_COUNT)) {
      const uiSourceCode = this.files.get(tabId);
      if (uiSourceCode !== undefined) {
        historyItemKeys.push(historyItemKey(uiSourceCode));
      }
    }
    this.history.update(historyItemKeys);
    this.previouslyViewedFilesSetting.set(this.history.toObject());
  }

  private tooltipForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): string {
    uiSourceCode = Persistence.Persistence.PersistenceImpl.instance().network(uiSourceCode) || uiSourceCode;
    return uiSourceCode.url();
  }

  private appendFileTab(uiSourceCode: Workspace.UISourceCode.UISourceCode, index?: number,
                        ignoreHistory?: boolean): string {
    const tabId = this.generateTabId();
    this.tabIds.set(uiSourceCode, tabId);

    if (index !== undefined) {
      const entries = Array.from(this.files.entries());
      entries.splice(index, 0, [tabId, uiSourceCode]);
      this.files = new Map(entries);
    } else {
      this.files.set(tabId, uiSourceCode);
    }

    const savedSelectionRange = this.history.selectionRange(historyItemKey(uiSourceCode));
    const savedScrollLineNumber = this.history.scrollLineNumber(historyItemKey(uiSourceCode));
    const view = this.viewForFile(uiSourceCode);
    if (view && !ignoreHistory) {
      this.restoreEditorProperties(view, savedSelectionRange, savedScrollLineNumber);
    }

    this.#scheduleUpdate();

    this.updateFileTitle(uiSourceCode);
    this.addUISourceCodeListeners(uiSourceCode);
    if (uiSourceCode.loadError()) {
      this.addLoadErrorIcon(tabId);
    } else if (!uiSourceCode.contentLoaded()) {
      void uiSourceCode.requestContentData().then(contentDataOrError => {
        if (TextUtils.ContentData.ContentData.isError(contentDataOrError)) {
          this.addLoadErrorIcon(tabId);
        }
      });
    }

    if (!this.#currentFile) {
      this.#showFile(uiSourceCode, false);
    }
    return tabId;
  }

  private addLoadErrorIcon(tabId: string): void {
    const uiSourceCode = this.files.get(tabId);
    if (uiSourceCode) {
      this.#loadErrorFiles.add(uiSourceCode);
      this.#scheduleUpdate();
    }
  }

  private restoreEditorProperties(editorView: UI.Widget.Widget, selection?: TextUtils.TextRange.TextRange,
                                  firstLineNumber?: number): void {
    const sourceFrame = editorView instanceof SourceFrame.SourceFrame.SourceFrameImpl ? editorView : null;
    if (!sourceFrame) {
      return;
    }
    if (selection) {
      sourceFrame.setSelection(selection);
    }
    if (typeof firstLineNumber === 'number') {
      sourceFrame.scrollToLine(firstLineNumber);
    }
  }

  private tabClosed(tabId: string, isUserGesture?: boolean): void {
    const uiSourceCode = this.files.get(tabId);
    if (this.#currentFile && this.#currentFile.canonicalScriptId() === uiSourceCode?.canonicalScriptId()) {
      this.removeViewListeners();
      this.currentView = null;
      this.#currentFile = null;
    }
    if (uiSourceCode) {
      this.tabIds.delete(uiSourceCode);
      this.#loadErrorFiles.delete(uiSourceCode);
    }
    this.files.delete(tabId);

    if (uiSourceCode) {
      this.removeUISourceCodeListeners(uiSourceCode);
      this.removeSourceFrame(uiSourceCode);

      this.dispatchEventToListeners(Events.EDITOR_CLOSED, uiSourceCode);

      if (isUserGesture) {
        this.editorClosedByUserAction(uiSourceCode);
      }
    }
  }

  private tabSelected(tabId: string, isUserGesture?: boolean): void {
    const uiSourceCode = this.files.get(tabId);
    if (uiSourceCode) {
      this.#showFile(uiSourceCode, isUserGesture);
    }
  }

  private addUISourceCodeListeners(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged, this.uiSourceCodeWorkingCopyChanged,
                                  this);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,
                                  this.uiSourceCodeWorkingCopyCommitted, this);
  }

  private removeUISourceCodeListeners(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyChanged,
                                     this.uiSourceCodeWorkingCopyChanged, this);
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,
                                     this.uiSourceCodeWorkingCopyCommitted, this);
  }

  private updateFileTitle(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (this.tabIds.has(uiSourceCode)) {
      if (!uiSourceCode.loadError()) {
        this.#loadErrorFiles.delete(uiSourceCode);
      }
      this.#scheduleUpdate();
    }
  }

  private uiSourceCodeTitleChanged(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>):
      void {
    const uiSourceCode = event.data;

    const widget = getViewByUISourceCode(uiSourceCode);
    if (widget) {
      if (this.#sourceViewTypeForWidget(widget) !== this.#sourceViewTypeForUISourceCode(uiSourceCode)) {
        // Remove the existing editor tab and create a new one of the correct type.
        this.removeUISourceCodes([uiSourceCode]);
        this.addUISourceCode(uiSourceCode);
        this.showFile(uiSourceCode);
        return;
      }
    }

    this.updateFileTitle(uiSourceCode);
    this.updateHistory();

    // Remove from map under old url if it has changed.
    for (const [k, v] of this.uriToUISourceCode) {
      if (v === uiSourceCode && k !== v.url()) {
        this.uriToUISourceCode.delete(k);
      }
    }
    // Remove from map under old id if it has changed.
    for (const [k, v] of this.idToUISourceCode) {
      if (v === uiSourceCode && k !== v.canonicalScriptId()) {
        this.idToUISourceCode.delete(k);
      }
    }
    // Ensure it is mapped under current url and id.
    this.canonicalUISourceCode(uiSourceCode);
  }

  private uiSourceCodeWorkingCopyChanged(
      event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.updateFileTitle(uiSourceCode);
  }

  private uiSourceCodeWorkingCopyCommitted(
      event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.WorkingCopyCommittedEvent>): void {
    const uiSourceCode = event.data.uiSourceCode;
    this.updateFileTitle(uiSourceCode);
  }

  private generateTabId(): Lowercase<string> {
    return 'tab-' + (tabId++) as Lowercase<string>;
  }

  async #addFileSystemClicked(): Promise<void> {
    const result = await Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem();
    if (!result) {
      return;
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.WorkspaceSelectFolder);
    void UI.ViewManager.ViewManager.instance().showView('navigator-files');
  }

  getCreatedSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget|undefined {
    return getViewByUISourceCode(uiSourceCode);
  }

  private getOrCreateSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget {
    const view = getViewByUISourceCode(uiSourceCode);
    if (view) {
      return view;
    }
    return getOrCreateSourceView(uiSourceCode, sourceView => {
      if (sourceView instanceof UISourceCodeFrame) {
        this.#historyManager.trackSourceFrameCursorJumps(sourceView);
      }
      uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
    });
  }

  viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget {
    return this.getOrCreateSourceView(uiSourceCode);
  }

  recycleUISourceCodeFrame(sourceFrame: UISourceCodeFrame, uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    sourceFrame.uiSourceCode().removeEventListener(Workspace.UISourceCode.Events.TitleChanged,
                                                   this.uiSourceCodeTitleChanged, this);
    recycleUISourceCodeFrame(sourceFrame, uiSourceCode);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
  }

  private removeSourceFrame(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const sourceView = removeSourceViewCache(uiSourceCode);
    if (sourceView) {
      uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this.uiSourceCodeTitleChanged, this);
    }
    if (sourceView && sourceView instanceof UISourceCodeFrame) {
      (sourceView).dispose();
    }
  }

  #sourceViewTypeForWidget(widget: UI.Widget.Widget): SourceViewType {
    if (widget instanceof SourceFrame.ImageView.ImageView) {
      return SourceViewType.IMAGE_VIEW;
    }
    if (widget instanceof SourceFrame.FontView.FontView) {
      return SourceViewType.FONT_VIEW;
    }
    if (widget instanceof Components.HeadersView.HeadersView) {
      return SourceViewType.HEADERS_VIEW;
    }
    return SourceViewType.SOURCE_VIEW;
  }

  #sourceViewTypeForUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): SourceViewType {
    if (uiSourceCode.name() === HEADER_OVERRIDES_FILENAME) {
      return SourceViewType.HEADERS_VIEW;
    }
    const contentType = uiSourceCode.contentType();
    switch (contentType) {
      case Common.ResourceType.resourceTypes.Image:
        return SourceViewType.IMAGE_VIEW;
      case Common.ResourceType.resourceTypes.Font:
        return SourceViewType.FONT_VIEW;
      default:
        return SourceViewType.SOURCE_VIEW;
    }
  }

  currentFile(): Workspace.UISourceCode.UISourceCode|null {
    return this.#currentFile || null;
  }
}

export const enum Events {
  EDITOR_SELECTED = 'EditorSelected',
  EDITOR_CLOSED = 'EditorClosed',
}

export interface EditorSelectedEvent {
  currentFile: Workspace.UISourceCode.UISourceCode;
  currentView: UI.Widget.Widget|null;
  previousView: UI.Widget.Widget|null;
  userGesture: boolean|undefined;
}

export interface EventTypes {
  [Events.EDITOR_SELECTED]: EditorSelectedEvent;
  [Events.EDITOR_CLOSED]: Workspace.UISourceCode.UISourceCode;
}

const MAX_PREVIOUSLY_VIEWED_FILES_COUNT = 30;
const MAX_SERIALIZABLE_URL_LENGTH = 4096;

export interface SerializedHistoryItem {
  url: string;
  resourceTypeName: string;
  selectionRange?: TextUtils.TextRange.SerializedTextRange;
  scrollLineNumber?: number;
}

interface HistoryItemKey {
  url: Platform.DevToolsPath.UrlString;
  resourceType: Common.ResourceType.ResourceType;
}

function historyItemKey(uiSourceCode: Workspace.UISourceCode.UISourceCode): HistoryItemKey {
  return {url: uiSourceCode.url(), resourceType: uiSourceCode.contentType()};
}

export class HistoryItem implements HistoryItemKey {
  url: Platform.DevToolsPath.UrlString;
  resourceType: Common.ResourceType.ResourceType;
  selectionRange: TextUtils.TextRange.TextRange|undefined;
  scrollLineNumber: number|undefined;

  constructor(url: Platform.DevToolsPath.UrlString, resourceType: Common.ResourceType.ResourceType,
              selectionRange?: TextUtils.TextRange.TextRange, scrollLineNumber?: number) {
    this.url = url;
    this.resourceType = resourceType;
    this.selectionRange = selectionRange;
    this.scrollLineNumber = scrollLineNumber;
  }

  static fromObject(serializedHistoryItem: SerializedHistoryItem): HistoryItem {
    const resourceType = Common.ResourceType.ResourceType.fromName(serializedHistoryItem.resourceTypeName);
    if (resourceType === null) {
      throw new TypeError(`Invalid resource type name "${serializedHistoryItem.resourceTypeName}"`);
    }
    const selectionRange = serializedHistoryItem.selectionRange ?
        TextUtils.TextRange.TextRange.fromObject(serializedHistoryItem.selectionRange) :
        undefined;
    return new HistoryItem(
        serializedHistoryItem.url as Platform.DevToolsPath.UrlString,
        resourceType,
        selectionRange,
        serializedHistoryItem.scrollLineNumber,
    );
  }

  toObject(): SerializedHistoryItem|null {
    if (this.url.length >= MAX_SERIALIZABLE_URL_LENGTH) {
      return null;
    }
    return {
      url: this.url,
      resourceTypeName: this.resourceType.name(),
      selectionRange: this.selectionRange,
      scrollLineNumber: this.scrollLineNumber,
    };
  }
}

export class History {
  private items: HistoryItem[];

  constructor(items: HistoryItem[]) {
    this.items = items;
  }

  static fromObject(serializedHistoryItems: SerializedHistoryItem[]): History {
    const items = [];
    for (const serializedHistoryItem of serializedHistoryItems) {
      try {
        items.push(HistoryItem.fromObject(serializedHistoryItem));
      } catch {
      }
    }
    return new History(items);
  }

  index({url, resourceType}: HistoryItemKey): number {
    return this.items.findIndex(item => item.url === url && item.resourceType === resourceType);
  }

  selectionRange(key: HistoryItemKey): TextUtils.TextRange.TextRange|undefined {
    const index = this.index(key);
    if (index === -1) {
      return undefined;
    }
    return this.items[index].selectionRange;
  }

  updateSelectionRange(key: HistoryItemKey, selectionRange?: TextUtils.TextRange.TextRange): void {
    if (!selectionRange) {
      return;
    }
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.items[index].selectionRange = selectionRange;
  }

  scrollLineNumber(key: HistoryItemKey): number|undefined {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    return this.items[index].scrollLineNumber;
  }

  updateScrollLineNumber(key: HistoryItemKey, scrollLineNumber: number): void {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.items[index].scrollLineNumber = scrollLineNumber;
  }

  update(keys: HistoryItemKey[]): void {
    for (let i = keys.length - 1; i >= 0; --i) {
      const index = this.index(keys[i]);
      let item;
      if (index !== -1) {
        item = this.items[index];
        this.items.splice(index, 1);
      } else {
        item = new HistoryItem(keys[i].url, keys[i].resourceType);
      }
      this.items.unshift(item);
    }
  }

  remove(key: HistoryItemKey): void {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.items.splice(index, 1);
  }

  toObject(): SerializedHistoryItem[] {
    const serializedHistoryItems = [];
    for (const item of this.items) {
      const serializedItem = item.toObject();
      if (serializedItem) {
        serializedHistoryItems.push(serializedItem);
      }
      if (serializedHistoryItems.length === MAX_PREVIOUSLY_VIEWED_FILES_COUNT) {
        break;
      }
    }
    return serializedHistoryItems;
  }

  keys(): HistoryItemKey[] {
    return this.items;
  }
}

export class EditorContainerTabDelegate implements UI.TabbedPane.TabbedPaneTabDelegate {
  private readonly editorContainer: TabbedEditorContainer;

  constructor(editorContainer: TabbedEditorContainer) {
    this.editorContainer = editorContainer;
  }

  closeTabs(_tabbedPane: UI.TabbedPane.TabbedPane, ids: string[]): void {
    this.editorContainer.closeTabs(ids);
  }

  onContextMenu(tabId: string, contextMenu: UI.ContextMenu.ContextMenu): void {
    this.editorContainer.onContextMenu(tabId, contextMenu);
  }
}
