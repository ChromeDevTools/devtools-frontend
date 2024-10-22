// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as Components from './components/components.js';
import {EditingLocationHistoryManager} from './EditingLocationHistoryManager.js';
import sourcesViewStyles from './sourcesView.css.js';
import {
  type EditorSelectedEvent,
  Events as TabbedEditorContainerEvents,
  TabbedEditorContainer,
  type TabbedEditorContainerDelegate,
} from './TabbedEditorContainer.js';
import {Events as UISourceCodeFrameEvents, UISourceCodeFrame} from './UISourceCodeFrame.js';

const UIStrings = {
  /**
   *@description Text to open a file
   */
  openFile: 'Open file',
  /**
   *@description Text to run commands
   */
  runCommand: 'Run command',
  /**
   *@description Text in Sources View of the Sources panel. This sentence follows by a list of actions.
   */
  workspaceDropInAFolderToSyncSources: 'To sync edits to the workspace, drop a folder with your sources here or',
  /**
   *@description Text in Sources View of the Sources panel.
   */
  selectFolder: 'Select folder',
  /**
   *@description Accessible label for Sources placeholder view actions list
   */
  sourceViewActions: 'Source View Actions',

};
const str_ = i18n.i18n.registerUIStrings('panels/sources/SourcesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class SourcesView extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox)
    implements TabbedEditorContainerDelegate, UI.SearchableView.Searchable, UI.SearchableView.Replaceable {
  private selectedIndex: number;
  private readonly searchableViewInternal: UI.SearchableView.SearchableView;
  private readonly sourceViewByUISourceCode: Map<Workspace.UISourceCode.UISourceCode, UI.Widget.Widget>;
  editorContainer: TabbedEditorContainer;
  private readonly historyManager: EditingLocationHistoryManager;
  private readonly toolbarContainerElementInternal: HTMLElement;
  private readonly scriptViewToolbar: UI.Toolbar.Toolbar;
  private readonly bottomToolbarInternal: UI.Toolbar.Toolbar;
  private toolbarChangedListener: Common.EventTarget.EventDescriptor|null;
  private readonly focusedPlaceholderElement?: HTMLElement;
  private searchView?: UISourceCodeFrame;
  private searchConfig?: UI.SearchableView.SearchConfig;

  constructor() {
    super();

    this.element.id = 'sources-panel-sources-view';
    this.element.setAttribute('jslog', `${VisualLogging.pane('editor').track({keydown: 'Escape'})}`);
    this.setMinimumAndPreferredSizes(88, 52, 150, 100);

    this.selectedIndex = 0;

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();

    this.searchableViewInternal = new UI.SearchableView.SearchableView(this, this, 'sources-view-search-config');
    this.searchableViewInternal.setMinimalSearchQuerySize(0);
    this.searchableViewInternal.show(this.element);

    this.sourceViewByUISourceCode = new Map();

    this.editorContainer = new TabbedEditorContainer(
        this, Common.Settings.Settings.instance().createLocalSetting('previously-viewed-files', []),
        this.placeholderElement(), this.focusedPlaceholderElement);
    this.editorContainer.show(this.searchableViewInternal.element);
    this.editorContainer.addEventListener(TabbedEditorContainerEvents.EDITOR_SELECTED, this.editorSelected, this);
    this.editorContainer.addEventListener(TabbedEditorContainerEvents.EDITOR_CLOSED, this.editorClosed, this);

    this.historyManager = new EditingLocationHistoryManager(this);

    this.toolbarContainerElementInternal = this.element.createChild('div', 'sources-toolbar');
    this.toolbarContainerElementInternal.setAttribute('jslog', `${VisualLogging.toolbar('bottom')}`);
    this.scriptViewToolbar = new UI.Toolbar.Toolbar('', this.toolbarContainerElementInternal);
    this.scriptViewToolbar.element.style.flex = 'auto';
    this.bottomToolbarInternal = new UI.Toolbar.Toolbar('', this.toolbarContainerElementInternal);

    this.toolbarChangedListener = null;

    UI.UIUtils.startBatchUpdate();
    workspace.uiSourceCodes().forEach(this.addUISourceCode.bind(this));
    UI.UIUtils.endBatchUpdate();

    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemoved.bind(this), this);
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.#onScopeChange.bind(this));

    function handleBeforeUnload(event: Event): void {
      if (event.returnValue) {
        return;
      }

      const unsavedSourceCodes: Workspace.UISourceCode.UISourceCode[] = [];
      const projects =
          Workspace.Workspace.WorkspaceImpl.instance().projectsForType(Workspace.Workspace.projectTypes.FileSystem);
      for (const project of projects) {
        for (const uiSourceCode of project.uiSourceCodes()) {
          if (uiSourceCode.isDirty()) {
            unsavedSourceCodes.push(uiSourceCode);
          }
        }
      }

      if (!unsavedSourceCodes.length) {
        return;
      }

      event.returnValue = true;
      void UI.ViewManager.ViewManager.instance().showView('sources');
      for (const sourceCode of unsavedSourceCodes) {
        void Common.Revealer.reveal(sourceCode);
      }
    }

    if (!window.opener) {
      window.addEventListener('beforeunload', handleBeforeUnload, true);
    }
  }

  private placeholderElement(): Element {
    const shortcuts = [
      {actionId: 'quick-open.show', description: i18nString(UIStrings.openFile)},
      {actionId: 'quick-open.show-command-menu', description: i18nString(UIStrings.runCommand)},
      {
        actionId: 'sources.add-folder-to-workspace',
        description: i18nString(UIStrings.workspaceDropInAFolderToSyncSources),
        isWorkspace: true,
      },
    ];

    const list = document.createElement('div');
    UI.ARIAUtils.markAsList(list);
    UI.ARIAUtils.setLabel(list, i18nString(UIStrings.sourceViewActions));

    for (const shortcut of shortcuts) {
      const shortcutKeyText = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(shortcut.actionId);
      const listItemElement = list.createChild('div', 'tabbed-pane-placeholder-row');
      UI.ARIAUtils.markAsListitem(listItemElement);
      if (shortcutKeyText) {
        const title = listItemElement.createChild('span');
        title.textContent = shortcutKeyText;

        const button = listItemElement.createChild('button');
        button.textContent = shortcut.description;
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction(shortcut.actionId);
        button.addEventListener('click', () => action.execute());
      }

      if (shortcut.isWorkspace) {
        const workspace = listItemElement.createChild('span', 'workspace');
        workspace.textContent = shortcut.description;

        const browseButton = workspace.createChild('button');
        browseButton.textContent = i18nString(UIStrings.selectFolder);
        browseButton.addEventListener('click', this.addFileSystemClicked.bind(this));
      }
    }

    return list;
  }

  private async addFileSystemClicked(): Promise<void> {
    const result = await Persistence.IsolatedFileSystemManager.IsolatedFileSystemManager.instance().addFileSystem();
    if (!result) {
      return;
    }
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.WorkspaceSelectFolder);
    void UI.ViewManager.ViewManager.instance().showView('navigator-files');
  }

  static defaultUISourceCodeScores(): Map<Workspace.UISourceCode.UISourceCode, number> {
    const defaultScores = new Map<Workspace.UISourceCode.UISourceCode, number>();
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    if (sourcesView) {
      const uiSourceCodes = sourcesView.editorContainer.historyUISourceCodes();
      for (let i = 1; i < uiSourceCodes.length; ++i)  // Skip current element
      {
        defaultScores.set(uiSourceCodes[i], uiSourceCodes.length - i);
      }
    }
    return defaultScores;
  }

  leftToolbar(): UI.Toolbar.Toolbar {
    return this.editorContainer.leftToolbar();
  }

  rightToolbar(): UI.Toolbar.Toolbar {
    return this.editorContainer.rightToolbar();
  }

  bottomToolbar(): UI.Toolbar.Toolbar {
    return this.bottomToolbarInternal;
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([sourcesViewStyles]);
    UI.Context.Context.instance().setFlavor(SourcesView, this);
  }

  override willHide(): void {
    UI.Context.Context.instance().setFlavor(SourcesView, null);
    super.willHide();
  }

  toolbarContainerElement(): Element {
    return this.toolbarContainerElementInternal;
  }

  searchableView(): UI.SearchableView.SearchableView {
    return this.searchableViewInternal;
  }

  visibleView(): UI.Widget.Widget|null {
    return this.editorContainer.visibleView;
  }

  currentSourceFrame(): UISourceCodeFrame|null {
    const view = this.visibleView();
    if (!(view instanceof UISourceCodeFrame)) {
      return null;
    }
    return (view as UISourceCodeFrame);
  }

  currentUISourceCode(): Workspace.UISourceCode.UISourceCode|null {
    return this.editorContainer.currentFile();
  }

  onCloseEditorTab(): boolean {
    const uiSourceCode = this.editorContainer.currentFile();
    if (!uiSourceCode) {
      return false;
    }
    this.editorContainer.closeFile(uiSourceCode);
    return true;
  }

  onJumpToPreviousLocation(): void {
    this.historyManager.rollback();
  }

  onJumpToNextLocation(): void {
    this.historyManager.rollover();
  }

  #onScopeChange(): void {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    for (const uiSourceCode of workspace.uiSourceCodes()) {
      if (uiSourceCode.project().type() !== Workspace.Workspace.projectTypes.Network) {
        continue;
      }
      const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
      if (SDK.TargetManager.TargetManager.instance().isInScope(target)) {
        this.addUISourceCode(uiSourceCode);
      } else {
        this.removeUISourceCodes([uiSourceCode]);
      }
    }
  }

  private uiSourceCodeAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.addUISourceCode(uiSourceCode);
  }

  private addUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const project = uiSourceCode.project();
    if (project.isServiceProject()) {
      return;
    }
    switch (project.type()) {
      case Workspace.Workspace.projectTypes.FileSystem: {
        if (Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.fileSystemType(project) === 'overrides') {
          return;
        }
        break;
      }
      case Workspace.Workspace.projectTypes.Network: {
        const target = Bindings.NetworkProject.NetworkProject.targetForUISourceCode(uiSourceCode);
        if (!SDK.TargetManager.TargetManager.instance().isInScope(target)) {
          return;
        }
      }
    }
    this.editorContainer.addUISourceCode(uiSourceCode);
  }

  private uiSourceCodeRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.removeUISourceCodes([uiSourceCode]);
  }

  private removeUISourceCodes(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]): void {
    this.editorContainer.removeUISourceCodes(uiSourceCodes);
    for (let i = 0; i < uiSourceCodes.length; ++i) {
      this.removeSourceFrame(uiSourceCodes[i]);
      this.historyManager.removeHistoryForSourceCode(uiSourceCodes[i]);
    }
  }

  private projectRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.Workspace.Project>): void {
    const project = event.data;
    const uiSourceCodes = project.uiSourceCodes();
    this.removeUISourceCodes([...uiSourceCodes]);
  }

  private updateScriptViewToolbarItems(): void {
    const view = this.visibleView();
    if (view instanceof UI.View.SimpleView) {
      void view.toolbarItems().then(items => {
        this.scriptViewToolbar.removeToolbarItems();
        for (const action of getRegisteredEditorActions()) {
          this.scriptViewToolbar.appendToolbarItem(action.getOrCreateButton(this));
        }
        items.map(item => this.scriptViewToolbar.appendToolbarItem(item));
      });
    }
  }

  showSourceLocation(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, location?: SourceFrame.SourceFrame.RevealPosition,
      omitFocus?: boolean, omitHighlight?: boolean): void {
    const currentFrame = this.currentSourceFrame();
    if (currentFrame) {
      this.historyManager.updateCurrentState(
          currentFrame.uiSourceCode(), currentFrame.textEditor.state.selection.main.head);
    }
    this.editorContainer.showFile(uiSourceCode);
    const currentSourceFrame = this.currentSourceFrame();
    if (currentSourceFrame && location) {
      currentSourceFrame.revealPosition(location, !omitHighlight);
    }
    const visibleView = this.visibleView();
    if (!omitFocus && visibleView) {
      visibleView.focus();
    }
  }

  private createSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget {
    let sourceView;
    const contentType = uiSourceCode.contentType();

    if (contentType === Common.ResourceType.resourceTypes.Image || uiSourceCode.mimeType().startsWith('image/')) {
      sourceView = new SourceFrame.ImageView.ImageView(uiSourceCode.mimeType(), uiSourceCode);
    } else if (contentType === Common.ResourceType.resourceTypes.Font || uiSourceCode.mimeType().includes('font')) {
      sourceView = new SourceFrame.FontView.FontView(uiSourceCode.mimeType(), uiSourceCode);
    } else if (uiSourceCode.name() === HEADER_OVERRIDES_FILENAME) {
      sourceView = new Components.HeadersView.HeadersView(uiSourceCode);
    } else {
      sourceView = new UISourceCodeFrame(uiSourceCode);
      this.historyManager.trackSourceFrameCursorJumps(sourceView);
    }

    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);

    this.sourceViewByUISourceCode.set(uiSourceCode, sourceView);
    return sourceView;
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

  #uiSourceCodeTitleChanged(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    const widget = this.sourceViewByUISourceCode.get(uiSourceCode);
    if (widget) {
      if (this.#sourceViewTypeForWidget(widget) !== this.#sourceViewTypeForUISourceCode(uiSourceCode)) {
        // Remove the exisiting editor tab and create a new one of the correct type.
        this.removeUISourceCodes([uiSourceCode]);
        this.showSourceLocation(uiSourceCode);
      }
    }
  }

  getSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget|undefined {
    return this.sourceViewByUISourceCode.get(uiSourceCode);
  }

  private getOrCreateSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget {
    return this.sourceViewByUISourceCode.get(uiSourceCode) || this.createSourceView(uiSourceCode);
  }

  recycleUISourceCodeFrame(sourceFrame: UISourceCodeFrame, uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    sourceFrame.uiSourceCode().removeEventListener(
        Workspace.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
    this.sourceViewByUISourceCode.delete(sourceFrame.uiSourceCode());
    sourceFrame.setUISourceCode(uiSourceCode);
    this.sourceViewByUISourceCode.set(uiSourceCode, sourceFrame);
    uiSourceCode.addEventListener(Workspace.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
  }

  viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget {
    return this.getOrCreateSourceView(uiSourceCode);
  }

  private removeSourceFrame(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const sourceView = this.sourceViewByUISourceCode.get(uiSourceCode);
    this.sourceViewByUISourceCode.delete(uiSourceCode);
    if (sourceView && sourceView instanceof UISourceCodeFrame) {
      (sourceView as UISourceCodeFrame).dispose();
    }
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
  }

  private editorClosed(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.historyManager.removeHistoryForSourceCode(uiSourceCode);

    let wasSelected = false;
    if (!this.editorContainer.currentFile()) {
      wasSelected = true;
    }

    // SourcesNavigator does not need to update on EditorClosed.
    this.removeToolbarChangedListener();
    this.updateScriptViewToolbarItems();
    this.searchableViewInternal.resetSearch();

    const data = {
      uiSourceCode,
      wasSelected,
    };
    this.dispatchEventToListeners(Events.EDITOR_CLOSED, data);
  }

  private editorSelected(event: Common.EventTarget.EventTargetEvent<EditorSelectedEvent>): void {
    const previousSourceFrame = event.data.previousView instanceof UISourceCodeFrame ? event.data.previousView : null;
    if (previousSourceFrame) {
      previousSourceFrame.setSearchableView(null);
    }
    const currentSourceFrame = event.data.currentView instanceof UISourceCodeFrame ? event.data.currentView : null;
    if (currentSourceFrame) {
      currentSourceFrame.setSearchableView(this.searchableViewInternal);
    }

    this.searchableViewInternal.setReplaceable(Boolean(currentSourceFrame?.canEditSource()));
    this.searchableViewInternal.refreshSearch();
    this.updateToolbarChangedListener();
    this.updateScriptViewToolbarItems();

    const currentFile = this.editorContainer.currentFile();
    if (currentFile) {
      this.dispatchEventToListeners(Events.EDITOR_SELECTED, currentFile);
    }
  }

  private removeToolbarChangedListener(): void {
    if (this.toolbarChangedListener) {
      Common.EventTarget.removeEventListeners([this.toolbarChangedListener]);
    }
    this.toolbarChangedListener = null;
  }

  private updateToolbarChangedListener(): void {
    this.removeToolbarChangedListener();
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }
    this.toolbarChangedListener = sourceFrame.addEventListener(
        UISourceCodeFrameEvents.TOOLBAR_ITEMS_CHANGED, this.updateScriptViewToolbarItems, this);
  }

  onSearchCanceled(): void {
    if (this.searchView) {
      this.searchView.onSearchCanceled();
    }

    delete this.searchView;
    delete this.searchConfig;
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }

    this.searchView = sourceFrame;
    this.searchConfig = searchConfig;

    this.searchView.performSearch(this.searchConfig, shouldJump, jumpBackwards);
  }

  jumpToNextSearchResult(): void {
    if (!this.searchView) {
      return;
    }

    if (this.searchConfig && this.searchView !== this.currentSourceFrame()) {
      this.performSearch(this.searchConfig, true);
      return;
    }

    this.searchView.jumpToNextSearchResult();
  }

  jumpToPreviousSearchResult(): void {
    if (!this.searchView) {
      return;
    }

    if (this.searchConfig && this.searchView !== this.currentSourceFrame()) {
      this.performSearch(this.searchConfig, true);
      if (this.searchView) {
        this.searchView.jumpToLastSearchResult();
      }
      return;
    }

    this.searchView.jumpToPreviousSearchResult();
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return true;
  }

  replaceSelectionWith(searchConfig: UI.SearchableView.SearchConfig, replacement: string): void {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      console.assert(Boolean(sourceFrame));
      return;
    }
    sourceFrame.replaceSelectionWith(searchConfig, replacement);
  }

  replaceAllWith(searchConfig: UI.SearchableView.SearchConfig, replacement: string): void {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      console.assert(Boolean(sourceFrame));
      return;
    }
    sourceFrame.replaceAllWith(searchConfig, replacement);
  }

  showOutlineQuickOpen(): void {
    QuickOpen.QuickOpen.QuickOpenImpl.show('@');
  }

  showGoToLineQuickOpen(): void {
    if (this.editorContainer.currentFile()) {
      QuickOpen.QuickOpen.QuickOpenImpl.show(':');
    }
  }

  save(): void {
    this.saveSourceFrame(this.currentSourceFrame());
  }

  saveAll(): void {
    const sourceFrames = this.editorContainer.fileViews();
    sourceFrames.forEach(this.saveSourceFrame.bind(this));
  }

  private saveSourceFrame(sourceFrame: UI.Widget.Widget|null): void {
    if (!(sourceFrame instanceof UISourceCodeFrame)) {
      return;
    }
    const uiSourceCodeFrame = (sourceFrame as UISourceCodeFrame);
    uiSourceCodeFrame.commitEditing();
  }

  toggleBreakpointsActiveState(active: boolean): void {
    this.editorContainer.view.element.classList.toggle('breakpoints-deactivated', !active);
  }
}

export const enum Events {
  EDITOR_CLOSED = 'EditorClosed',
  EDITOR_SELECTED = 'EditorSelected',
}

export interface EditorClosedEvent {
  uiSourceCode: Workspace.UISourceCode.UISourceCode;
  wasSelected: boolean;
}

export type EventTypes = {
  [Events.EDITOR_CLOSED]: EditorClosedEvent,
  [Events.EDITOR_SELECTED]: Workspace.UISourceCode.UISourceCode,
};

export interface EditorAction {
  getOrCreateButton(sourcesView: SourcesView): UI.Toolbar.ToolbarButton;
}

const registeredEditorActions: (() => EditorAction)[] = [];

export function registerEditorAction(editorAction: () => EditorAction): void {
  registeredEditorActions.push(editorAction);
}

export function getRegisteredEditorActions(): EditorAction[] {
  return registeredEditorActions.map(editorAction => editorAction());
}

export class SwitchFileActionDelegate implements UI.ActionRegistration.ActionDelegate {
  private static nextFile(currentUISourceCode: Workspace.UISourceCode.UISourceCode): Workspace.UISourceCode.UISourceCode
      |null {
    function fileNamePrefix(name: string): string {
      const lastDotIndex = name.lastIndexOf('.');
      const namePrefix = name.substr(0, lastDotIndex !== -1 ? lastDotIndex : name.length);
      return namePrefix.toLowerCase();
    }

    const candidates = [];
    const url = currentUISourceCode.parentURL();
    const name = currentUISourceCode.name();
    const namePrefix = fileNamePrefix(name);
    for (const uiSourceCode of currentUISourceCode.project().uiSourceCodes()) {
      if (url !== uiSourceCode.parentURL()) {
        continue;
      }
      if (fileNamePrefix(uiSourceCode.name()) === namePrefix) {
        candidates.push(uiSourceCode.name());
      }
    }
    candidates.sort(Platform.StringUtilities.naturalOrderComparator);
    const index = Platform.NumberUtilities.mod(candidates.indexOf(name) + 1, candidates.length);
    const fullURL = Common.ParsedURL.ParsedURL.concatenate(
        (url ? Common.ParsedURL.ParsedURL.concatenate(url, '/') : '' as Platform.DevToolsPath.UrlString),
        candidates[index]);
    const nextUISourceCode = currentUISourceCode.project().uiSourceCodeForURL(fullURL);
    return nextUISourceCode !== currentUISourceCode ? nextUISourceCode : null;
  }

  handleAction(context: UI.Context.Context, _actionId: string): boolean {
    const sourcesView = context.flavor(SourcesView);
    if (!sourcesView) {
      return false;
    }
    const currentUISourceCode = sourcesView.currentUISourceCode();
    if (!currentUISourceCode) {
      return false;
    }
    const nextUISourceCode = SwitchFileActionDelegate.nextFile(currentUISourceCode);
    if (!nextUISourceCode) {
      return false;
    }
    sourcesView.showSourceLocation(nextUISourceCode);
    return true;
  }
}

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(context: UI.Context.Context, actionId: string): boolean {
    const sourcesView = context.flavor(SourcesView);
    if (!sourcesView) {
      return false;
    }

    switch (actionId) {
      case 'sources.close-all':
        sourcesView.editorContainer.closeAllFiles();
        return true;
      case 'sources.jump-to-previous-location':
        sourcesView.onJumpToPreviousLocation();
        return true;
      case 'sources.jump-to-next-location':
        sourcesView.onJumpToNextLocation();
        return true;
      case 'sources.next-editor-tab':
        sourcesView.editorContainer.selectNextTab();
        return true;
      case 'sources.previous-editor-tab':
        sourcesView.editorContainer.selectPrevTab();
        return true;
      case 'sources.close-editor-tab':
        return sourcesView.onCloseEditorTab();
      case 'sources.go-to-line':
        sourcesView.showGoToLineQuickOpen();
        return true;
      case 'sources.go-to-member':
        sourcesView.showOutlineQuickOpen();
        return true;
      case 'sources.save':
        sourcesView.save();
        return true;
      case 'sources.save-all':
        sourcesView.saveAll();
        return true;
    }

    return false;
  }
}

const HEADER_OVERRIDES_FILENAME = '.headers';

const enum SourceViewType {
  IMAGE_VIEW = 'ImageView',
  FONT_VIEW = 'FontView',
  HEADERS_VIEW = 'HeadersView',
  SOURCE_VIEW = 'SourceView',
}
