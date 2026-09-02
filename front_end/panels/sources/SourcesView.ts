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
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {EditingLocationHistoryManager} from './EditingLocationHistoryManager.js';
import sourcesViewStyles from './sourcesView.css.js';
import {
  type EditorSelectedEvent,
  Events as TabbedEditorContainerEvents,
  type SerializedHistoryItem,
  TabbedEditorContainer,
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

const {widget, widgetRef} = UI.Widget;

export interface ViewInput {
  searchProvider: UI.SearchableView.Searchable;
  replaceProvider: UI.SearchableView.Replaceable;
  searchableViewId: string;
  scriptViewToolbarItems: UI.Toolbar.ToolbarItem[];
  bottomToolbarItems: UI.Toolbar.ToolbarItem[];
  historyManager: EditingLocationHistoryManager;
  previouslyViewedFilesSetting: Common.Settings.Setting<SerializedHistoryItem[]>;
}

export interface ViewOutput {
  scriptViewToolbar?: UI.Toolbar.Toolbar;
  editorContainer?: TabbedEditorContainer;
  searchableView?: UI.SearchableView.SearchableView;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target): void => {
  // clang-format off
  render(html`
    <devtools-widget class="vbox flex-auto"
      ${widget(element => {
        const searchableView = new UI.SearchableView.SearchableView(input.searchProvider, input.replaceProvider, input.searchableViewId, element);
        searchableView.setMinimalSearchQuerySize(0);
        return searchableView;
      })}
      ${widgetRef(UI.SearchableView.SearchableView, e => { output.searchableView = e; })}
    >
      <devtools-widget class="vbox flex-auto"
        ${widget(TabbedEditorContainer, {historyManager: input.historyManager, previouslyViewedFilesSetting: input.previouslyViewedFilesSetting})}
        ${widgetRef(TabbedEditorContainer, e => { output.editorContainer = e; })}>
      </devtools-widget>
    </devtools-widget>
    <div class="sources-toolbar" jslog=${VisualLogging.toolbar('bottom')}>
      <devtools-toolbar class="script-view-toolbar" style="flex: auto;" ${Directives.ref(el => { output.scriptViewToolbar = el as UI.Toolbar.Toolbar; })}>
        ${input.scriptViewToolbarItems.map(item => item.element)}
      </devtools-toolbar>
      <devtools-toolbar class="bottom-toolbar">
        ${input.bottomToolbarItems.map(item => item.element)}
      </devtools-toolbar>
    </div>`, target);
  // clang-format on
};

const SourcesViewBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.VBox,
    );

export class SourcesView extends SourcesViewBase implements UI.SearchableView.Searchable,
                                                            UI.SearchableView.Replaceable {
  #searchableView!: UI.SearchableView.SearchableView;
  editorContainer?: TabbedEditorContainer;
  #uiSourceCodes = new Set<Workspace.UISourceCode.UISourceCode>();
  private readonly historyManager: EditingLocationHistoryManager;
  #scriptViewToolbar?: UI.Toolbar.Toolbar;
  #scriptViewToolbarItems: UI.Toolbar.ToolbarItem[] = [];
  #bottomToolbarItems: UI.Toolbar.ToolbarItem[] = [];
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
  #leftToolbarItems?: UI.Toolbar.ToolbarItem[];
  #rightToolbarItems?: UI.Toolbar.ToolbarItem[];
  #breakpointsActive?: boolean;
  #editorContainerPromise: Promise<TabbedEditorContainer>;
  #editorContainerResolve!: (container: TabbedEditorContainer) => void;
  readonly previouslyViewedFilesSetting: Common.Settings.Setting<SerializedHistoryItem[]>;

  constructor() {
    super({jslog: `${VisualLogging.pane('editor').track({keydown: 'Escape'})}`});
    this.#editorContainerPromise = new Promise(resolve => {
      this.#editorContainerResolve = resolve;
    });
    this.registerRequiredCSS(sourcesViewStyles);

    this.element.id = 'sources-panel-sources-view';
    this.setMinimumAndPreferredSizes(88, 52, 150, 100);

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();

    this.historyManager = new EditingLocationHistoryManager(this);

    this.toolbarChangedListener = null;

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

    this.previouslyViewedFilesSetting =
        Common.Settings.Settings.instance().createLocalSetting('previously-viewed-files', []);
    this.requestUpdate();

    UI.UIUtils.startBatchUpdate();
    workspace.uiSourceCodes().forEach(ui => this.addUISourceCode(ui));
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

  override performUpdate(): void {
    const input: ViewInput = {
      searchProvider: this,
      replaceProvider: this,
      searchableViewId: 'sources-view-search-config',
      scriptViewToolbarItems: this.#scriptViewToolbarItems,
      bottomToolbarItems: this.#bottomToolbarItems,
      historyManager: this.historyManager,
      previouslyViewedFilesSetting: this.previouslyViewedFilesSetting,
    };

    const that = this;
    const output: ViewOutput = {
      set scriptViewToolbar(value: UI.Toolbar.Toolbar) {
        that.#scriptViewToolbar = value;
      },
      set editorContainer(value: TabbedEditorContainer) {
        that.setEditorContainer(value);
      },
      set searchableView(value: UI.SearchableView.SearchableView) {
        that.#searchableView = value;
      },
    };

    this.#view(input, output, this.element);
  }

  override onDetach(): void {
    super.onDetach();
    this.editorContainer?.detachEditors();
  }

  setEditorContainer(editorContainer: TabbedEditorContainer): void {
    if (this.editorContainer === editorContainer) {
      return;
    }
    if (this.editorContainer) {
      this.editorContainer.removeEventListener(TabbedEditorContainerEvents.EDITOR_SELECTED, this.editorSelected, this);
      this.editorContainer.removeEventListener(TabbedEditorContainerEvents.EDITOR_CLOSED, this.editorClosed, this);
    }
    this.editorContainer = editorContainer;
    if (this.editorContainer) {
      if (this.#leftToolbarItems) {
        this.editorContainer.leftToolbar().removeToolbarItems();
        for (const item of this.#leftToolbarItems) {
          this.editorContainer.leftToolbar().appendToolbarItem(item);
        }
      }
      if (this.#rightToolbarItems) {
        this.editorContainer.rightToolbar().removeToolbarItems();
        for (const item of this.#rightToolbarItems) {
          this.editorContainer.rightToolbar().appendToolbarItem(item);
        }
      }
      if (this.#breakpointsActive !== undefined) {
        this.editorContainer.element.classList.toggle('breakpoints-deactivated', !this.#breakpointsActive);
      }

      this.#editorContainerResolve(editorContainer);
      this.editorContainer.addEventListener(TabbedEditorContainerEvents.EDITOR_SELECTED, this.editorSelected, this);
      this.editorContainer.addEventListener(TabbedEditorContainerEvents.EDITOR_CLOSED, this.editorClosed, this);
      UI.UIUtils.startBatchUpdate();
      for (const uiSourceCode of this.#uiSourceCodes) {
        this.editorContainer.addUISourceCode(uiSourceCode);
      }
      UI.UIUtils.endBatchUpdate();
    }
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
    this.#bottomToolbarItems = [];

    if (isVertical || isInWrapper) {
      if (this.#scriptViewToolbar) {
        splitWidget.uninstallResizer(this.#scriptViewToolbar);
      }
    } else if (this.#scriptViewToolbar) {
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
          this.#bottomToolbarItems.push(this.#toggleDebuggerSidebarButton);
        }
      }
    }

    this.#leftToolbarItems = leftItems;
    this.#rightToolbarItems = rightItems;

    if (this.editorContainer) {
      const editorContainer = this.editorContainer;
      editorContainer.leftToolbar().removeToolbarItems();
      leftItems.forEach(item => editorContainer.leftToolbar().appendToolbarItem(item));

      editorContainer.rightToolbar().removeToolbarItems();
      rightItems.forEach(item => editorContainer.rightToolbar().appendToolbarItem(item));
    }
    this.requestUpdate();
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
    if (!this.#searchableView) {
      this.performUpdate();
    }
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
        if (Array.isArray(items)) {
          this.#scriptViewToolbarItems = items;
        } else {
          const wrapper = document.createElement('div');
          wrapper.style.display = 'contents';
          // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
          render(items, wrapper);
          this.#scriptViewToolbarItems = [new UI.Toolbar.ToolbarItem(wrapper)];
        }
        this.requestUpdate();
      });
    }
  }

  async showSourceLocation(uiSourceCode: Workspace.UISourceCode.UISourceCode,
                           location?: SourceFrame.SourceFrame.RevealPosition, omitFocus?: boolean,
                           omitHighlight?: boolean): Promise<void> {
    if (!this.editorContainer) {
      await this.#editorContainerPromise;
    }
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

  viewForFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget|undefined {
    return this.editorContainer?.viewForFile(uiSourceCode);
  }

  getSourceView(uiSourceCode: Workspace.UISourceCode.UISourceCode): UI.Widget.Widget|undefined {
    return this.editorContainer?.getCreatedSourceView(uiSourceCode);
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
    this.searchableView().resetSearch();

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
      currentSourceFrame.setSearchableView(this.searchableView());
    }

    this.searchableView().setReplaceable(Boolean(currentSourceFrame?.canEditSource()));
    this.searchableView().refreshSearch();
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
    this.#breakpointsActive = active;
    this.editorContainer?.element.classList.toggle('breakpoints-deactivated', !active);
    this.requestUpdate();
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
