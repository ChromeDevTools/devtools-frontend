// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
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
   * @description Tooltip for the navigator toggle in the Sources panel. Command to open or show the
   * sidebar containing the navigator tool.
   */
  showNavigator: 'Show navigator',
  /**
   * @description Tooltip for the navigator toggle in the Sources panel. Command to close or hide
   * the sidebar containing the navigator tool.
   */
  hideNavigator: 'Hide navigator',
  /**
   * @description Screen reader announcement when the navigator sidebar is shown in the Sources panel.
   */
  navigatorShown: 'Navigator sidebar shown',
  /**
   * @description Screen reader announcement when the navigator sidebar is hidden in the Sources panel.
   */
  navigatorHidden: 'Navigator sidebar hidden',
  /**
   * @description Screen reader announcement when the debugger sidebar is shown in the Sources panel.
   */
  debuggerShown: 'Debugger sidebar shown',
  /**
   * @description Screen reader announcement when the debugger sidebar is hidden in the Sources panel.
   */
  debuggerHidden: 'Debugger sidebar hidden',
  /**
   * @description Tooltip for the debugger toggle in the Sources panel. Command to open or show the
   * sidebar containing the debugger tool.
   */
  showDebugger: 'Show debugger',
  /**
   * @description Tooltip for the debugger toggle in the Sources panel. Command to close or hide the
   * sidebar containing the debugger tool.
   */
  hideDebugger: 'Hide debugger',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sources/SourcesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {widget} = UI.Widget;

export interface ViewInput {
  scriptViewToolbar: UI.Toolbar.Toolbar;
  bottomToolbar: UI.Toolbar.Toolbar;
  searchableView: UI.SearchableView.SearchableView;
  editorContainer: TabbedEditorContainer;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target): void => {
  // clang-format off
  render(html`
    <devtools-widget class="vbox flex-auto" ${widget(() => input.searchableView)}>
      <devtools-widget class="vbox flex-auto" ${widget(() => input.editorContainer.view)}>
      </devtools-widget>
    </devtools-widget>
    <div class="sources-toolbar" jslog=${VisualLogging.toolbar('bottom')}>
      ${input.scriptViewToolbar}
      ${input.bottomToolbar}
    </div>`, target);
  // clang-format on
};

export class SourcesView extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox)
    implements TabbedEditorContainerDelegate, UI.SearchableView.Searchable, UI.SearchableView.Replaceable {
  #searchableView!: UI.SearchableView.SearchableView;
  private readonly sourceViewByUISourceCode: Map<Workspace.UISourceCode.UISourceCode, UI.Widget.Widget>;
  editorContainer?: TabbedEditorContainer;
  #uiSourceCodes = new Set<Workspace.UISourceCode.UISourceCode>();
  private readonly historyManager: EditingLocationHistoryManager;
  readonly #scriptViewToolbar: UI.Toolbar.Toolbar;
  readonly #bottomToolbar: UI.Toolbar.Toolbar;
  private toolbarChangedListener: Common.EventTarget.EventDescriptor|null;
  private searchView?: UISourceCodeFrame;
  private searchConfig?: UI.SearchableView.SearchConfig;
  #view: View = DEFAULT_VIEW;

  #toggleNavigatorSidebarButton: UI.Toolbar.ToolbarButton;
  #toggleDebuggerSidebarButton: UI.Toolbar.ToolbarButton;
  #onToggleNavigatorSidebar?: () => void;
  #onToggleDebuggerSidebar?: () => void;
  #isNavigatorSidebarOpen = false;
  #isDebuggerSidebarOpen = false;
  #navigatorSidebarInitialized = false;
  #debuggerSidebarInitialized = false;
  #isVertical = false;

  constructor() {
    super({jslog: `${VisualLogging.pane('editor').track({keydown: 'Escape'})}`});
    this.registerRequiredCSS(sourcesViewStyles);

    this.element.id = 'sources-panel-sources-view';
    this.setMinimumAndPreferredSizes(88, 52, 150, 100);

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();

    this.sourceViewByUISourceCode = new Map();

    this.historyManager = new EditingLocationHistoryManager(this);

    this.#scriptViewToolbar = document.createElement('devtools-toolbar') as UI.Toolbar.Toolbar;
    this.#scriptViewToolbar.style.flex = 'auto';
    this.#bottomToolbar = document.createElement('devtools-toolbar') as UI.Toolbar.Toolbar;

    this.toolbarChangedListener = null;

    this.#searchableView = new UI.SearchableView.SearchableView(this, this, 'sources-view-search-config');
    this.#searchableView.setMinimalSearchQuerySize(0);

    this.#toggleNavigatorSidebarButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showNavigator), 'left-panel-open');
    this.#toggleNavigatorSidebarButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      this.#onToggleNavigatorSidebar?.();
    });
    this.#toggleNavigatorSidebarButton.element.setAttribute(
        'jslog', `${VisualLogging.toggleSubpane().track({click: true}).context('navigator')}`);

    this.#toggleDebuggerSidebarButton =
        new UI.Toolbar.ToolbarButton(i18nString(UIStrings.showDebugger), 'right-panel-open');
    this.#toggleDebuggerSidebarButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      this.#onToggleDebuggerSidebar?.();
    });
    this.#toggleDebuggerSidebarButton.element.setAttribute(
        'jslog', `${VisualLogging.toggleSubpane().track({click: true}).context('debugger')}`);

    const previouslyViewedFilesSetting =
        Common.Settings.Settings.instance().createLocalSetting('previously-viewed-files', []);
    this.editorContainer = new TabbedEditorContainer(this, previouslyViewedFilesSetting);
    this.editorContainer.addEventListener(TabbedEditorContainerEvents.EDITOR_SELECTED, this.editorSelected, this);
    this.editorContainer.addEventListener(TabbedEditorContainerEvents.EDITOR_CLOSED, this.editorClosed, this);

    UI.UIUtils.startBatchUpdate();
    workspace.uiSourceCodes().forEach(ui => this.addUISourceCode(ui));
    UI.UIUtils.endBatchUpdate();

    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.projectRemoved.bind(this), this);
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.#onScopeChange.bind(this));

    this.requestUpdate();

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

  override performUpdate(): void {
    const input: ViewInput = {
      scriptViewToolbar: this.#scriptViewToolbar,
      bottomToolbar: this.#bottomToolbar,
      searchableView: this.#searchableView,
      editorContainer: this.editorContainer as TabbedEditorContainer,
    };

    this.#view(input, undefined, this.element);
  }

  override onDetach(): void {
    super.onDetach();
    this.editorContainer?.view.detachChildWidgets();
  }

  static defaultUISourceCodeScores(): Map<Workspace.UISourceCode.UISourceCode, number> {
    const defaultScores = new Map<Workspace.UISourceCode.UISourceCode, number>();
    const sourcesView = UI.Context.Context.instance().flavor(SourcesView);
    if (sourcesView) {
      const uiSourceCodes = sourcesView.editorContainer?.historyUISourceCodes() ?? [];
      for (let i = 1; i < uiSourceCodes.length; ++i)  // Skip current element
      {
        defaultScores.set(uiSourceCodes[i], uiSourceCodes.length - i);
      }
    }
    return defaultScores;
  }

  set onToggleNavigatorSidebar(callback: () => void) {
    this.#onToggleNavigatorSidebar = callback;
  }

  set onToggleDebuggerSidebar(callback: () => void) {
    this.#onToggleDebuggerSidebar = callback;
  }

  set isNavigatorSidebarOpen(isOpen: boolean) {
    const isInitialized = this.#navigatorSidebarInitialized;
    this.#navigatorSidebarInitialized = true;
    if (this.#isNavigatorSidebarOpen === isOpen) {
      return;
    }
    this.#isNavigatorSidebarOpen = isOpen;
    this.#updateNavigatorSidebarButton();
    if (isInitialized) {
      UI.ARIAUtils.LiveAnnouncer.alert(isOpen ? i18nString(UIStrings.navigatorShown) :
                                                i18nString(UIStrings.navigatorHidden));
    }
  }

  set isDebuggerSidebarOpen(isOpen: boolean) {
    const isInitialized = this.#debuggerSidebarInitialized;
    this.#debuggerSidebarInitialized = true;
    if (this.#isDebuggerSidebarOpen === isOpen) {
      return;
    }
    this.#isDebuggerSidebarOpen = isOpen;
    this.#updateDebuggerSidebarButton();
    if (isInitialized) {
      UI.ARIAUtils.LiveAnnouncer.alert(isOpen ? i18nString(UIStrings.debuggerShown) :
                                                i18nString(UIStrings.debuggerHidden));
    }
  }

  #updateNavigatorSidebarButton(): void {
    const navHidden = !this.#isNavigatorSidebarOpen;
    this.#toggleNavigatorSidebarButton.setGlyph(navHidden ? 'left-panel-open' : 'left-panel-close');
    this.#toggleNavigatorSidebarButton.setTitle(navHidden ? i18nString(UIStrings.showNavigator) :
                                                            i18nString(UIStrings.hideNavigator));
  }

  #updateDebuggerSidebarButton(): void {
    const debuggerHidden = !this.#isDebuggerSidebarOpen;
    const debuggerGlyph = debuggerHidden ? (this.#isVertical ? 'right-panel-open' : 'bottom-panel-open') :
                                           (this.#isVertical ? 'right-panel-close' : 'bottom-panel-close');
    this.#toggleDebuggerSidebarButton.setGlyph(debuggerGlyph);
    this.#toggleDebuggerSidebarButton.setTitle(debuggerHidden ? i18nString(UIStrings.showDebugger) :
                                                                i18nString(UIStrings.hideDebugger));
  }

  toggleDebuggerSidebarButtonEnabled(enabled: boolean): void {
    this.#toggleDebuggerSidebarButton.setEnabled(enabled);
  }

  setLayoutMode(splitWidget: UI.SplitWidget.SplitWidget, isVertical: boolean, isInWrapper: boolean): void {
    this.#bottomToolbar.removeToolbarItems();

    if (isVertical || isInWrapper) {
      splitWidget.uninstallResizer(this.#scriptViewToolbar);
    } else {
      splitWidget.installResizer(this.#scriptViewToolbar);
    }

    this.#isVertical = isVertical;
    this.#updateNavigatorSidebarButton();
    this.#updateDebuggerSidebarButton();

    const leftItems: UI.Toolbar.ToolbarItem[] = [];
    const rightItems: UI.Toolbar.ToolbarItem[] = [];

    if (!isInWrapper) {
      leftItems.push(this.#toggleNavigatorSidebarButton);
      if (!Root.Runtime.Runtime.isTraceApp()) {
        if (isVertical) {
          rightItems.push(this.#toggleDebuggerSidebarButton);
        } else {
          this.#bottomToolbar.appendToolbarItem(this.#toggleDebuggerSidebarButton);
        }
      }
    }

    if (this.editorContainer) {
      const editorContainer = this.editorContainer;
      editorContainer.leftToolbar().removeToolbarItems();
      leftItems.forEach(item => editorContainer.leftToolbar().appendToolbarItem(item));

      editorContainer.rightToolbar().removeToolbarItems();
      rightItems.forEach(item => editorContainer.rightToolbar().appendToolbarItem(item));
    }
  }

  override wasShown(): void {
    super.wasShown();
    UI.Context.Context.instance().setFlavor(SourcesView, this);
  }

  override willHide(): void {
    UI.Context.Context.instance().setFlavor(SourcesView, null);
    super.willHide();
  }

  searchableView(): UI.SearchableView.SearchableView {
    return this.#searchableView;
  }

  visibleView(): UI.Widget.Widget|null {
    return (this.editorContainer?.visibleView ?? null) as UI.Widget.Widget | null;
  }

  currentSourceFrame(): UISourceCodeFrame|null {
    const view = this.visibleView();
    if (!(view instanceof UISourceCodeFrame)) {
      return null;
    }
    return (view);
  }

  currentUISourceCode(): Workspace.UISourceCode.UISourceCode|null {
    return this.editorContainer?.currentFile() ?? null;
  }

  onCloseEditorTab(): boolean {
    const uiSourceCode = this.editorContainer?.currentFile();
    if (!uiSourceCode) {
      return false;
    }
    this.editorContainer?.closeFile(uiSourceCode);
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
    this.#uiSourceCodes.add(uiSourceCode);
    this.editorContainer?.addUISourceCode(uiSourceCode);
  }

  private uiSourceCodeRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.removeUISourceCodes([uiSourceCode]);
  }

  private removeUISourceCodes(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]): void {
    uiSourceCodes.forEach(ui => this.#uiSourceCodes.delete(ui));
    this.editorContainer?.removeUISourceCodes(uiSourceCodes);
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
        this.#scriptViewToolbar.removeToolbarItems();
        if (Array.isArray(items)) {
          items.map(item => this.#scriptViewToolbar.appendToolbarItem(item));
        } else {
          const wrapper = document.createElement('div');
          wrapper.style.display = 'contents';
          // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
          render(items, wrapper);
          this.#scriptViewToolbar.appendToolbarItem(new UI.Toolbar.ToolbarItem(wrapper));
        }
      });
    }
  }

  async showSourceLocation(uiSourceCode: Workspace.UISourceCode.UISourceCode,
                           location?: SourceFrame.SourceFrame.RevealPosition, omitFocus?: boolean,
                           omitHighlight?: boolean): Promise<void> {
    const currentFrame = this.currentSourceFrame();
    if (currentFrame) {
      this.historyManager.updateCurrentState(currentFrame.uiSourceCode(),
                                             currentFrame.textEditor.state.selection.main.head);
    }
    this.editorContainer?.showFile(uiSourceCode);
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
        // Remove the existing editor tab and create a new one of the correct type.
        this.removeUISourceCodes([uiSourceCode]);
        this.#uiSourceCodes.add(uiSourceCode);
        void this.showSourceLocation(uiSourceCode);
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
    sourceFrame.uiSourceCode().removeEventListener(Workspace.UISourceCode.Events.TitleChanged,
                                                   this.#uiSourceCodeTitleChanged, this);
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
      (sourceView).dispose();
    }
    uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.TitleChanged, this.#uiSourceCodeTitleChanged, this);
  }

  private editorClosed(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.historyManager.removeHistoryForSourceCode(uiSourceCode);

    let wasSelected = false;
    if (!this.editorContainer?.currentFile()) {
      wasSelected = true;
    }

    // SourcesNavigator does not need to update on EditorClosed.
    this.removeToolbarChangedListener();
    this.updateScriptViewToolbarItems();
    this.#searchableView.resetSearch();

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
      currentSourceFrame.setSearchableView(this.#searchableView);
    }

    this.#searchableView.setReplaceable(Boolean(currentSourceFrame?.canEditSource()));
    this.#searchableView.refreshSearch();
    this.updateToolbarChangedListener();
    this.updateScriptViewToolbarItems();

    const currentFile = this.editorContainer?.currentFile();
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
    this.toolbarChangedListener = sourceFrame.addEventListener(UISourceCodeFrameEvents.TOOLBAR_ITEMS_CHANGED,
                                                               this.updateScriptViewToolbarItems, this);
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

  supportsWholeWordSearch(): boolean {
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
    if (this.editorContainer?.currentFile()) {
      QuickOpen.QuickOpen.QuickOpenImpl.show(':');
    }
  }

  save(): void {
    this.saveSourceFrame(this.currentSourceFrame());
  }

  saveAll(): void {
    const sourceFrames = this.editorContainer?.fileViews() ?? [];
    sourceFrames.forEach(this.saveSourceFrame.bind(this));
  }

  private saveSourceFrame(sourceFrame: UI.Widget.Widget|null): void {
    if (!(sourceFrame instanceof UISourceCodeFrame)) {
      return;
    }
    const uiSourceCodeFrame = sourceFrame;
    uiSourceCodeFrame.commitEditing();
  }

  toggleBreakpointsActiveState(active: boolean): void {
    this.editorContainer?.view.element.classList.toggle('breakpoints-deactivated', !active);
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

export interface EventTypes {
  [Events.EDITOR_CLOSED]: EditorClosedEvent;
  [Events.EDITOR_SELECTED]: Workspace.UISourceCode.UISourceCode;
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
    void sourcesView.showSourceLocation(nextUISourceCode);
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
        sourcesView.editorContainer?.closeAllFiles();
        return true;
      case 'sources.jump-to-previous-location':
        sourcesView.onJumpToPreviousLocation();
        return true;
      case 'sources.jump-to-next-location':
        sourcesView.onJumpToNextLocation();
        return true;
      case 'sources.next-editor-tab':
        sourcesView.editorContainer?.selectNextTab();
        return true;
      case 'sources.previous-editor-tab':
        sourcesView.editorContainer?.selectPrevTab();
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
