// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Persistence from '../../models/persistence/persistence.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import sourcesViewStyles from './sourcesView.css.js';
import {
  type EditorSelectedEvent,
  type SourceLocation,
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
  isSearchReplaceable: boolean;
  searchTarget: UI.SearchableView.SearchTarget|null;
  scriptViewToolbarItems: LitTemplate;
  isNavigatorSidebarOpen: boolean;
  isDebuggerSidebarOpen: boolean;
  isDebuggerSidebarButtonEnabled: boolean;
  isVertical: boolean;
  isInWrapper: boolean;
  isTraceApp: boolean;
  onToggleNavigatorSidebar?: () => void;
  onToggleDebuggerSidebar?: () => void;
  breakpointsActive: boolean;
  uiSourceCodes: ReadonlySet<Workspace.UISourceCode.UISourceCode>;
  sourceLocation?: SourceLocation;
  onEditorSelected: (event: EditorSelectedEvent) => void;
  onEditorClosed: (uiSourceCode: Workspace.UISourceCode.UISourceCode) => void;
}

export interface ViewOutput {
  searchableView?: UI.SearchableView.SearchableView;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target): void => {
  const renderNavigatorToggleButton = (): LitTemplate => {
    const navHidden = !input.isNavigatorSidebarOpen;
    const title = navHidden ? i18nString(UIStrings.showNavigator) : i18nString(UIStrings.hideNavigator);
    // clang-format off
    return html`
      <devtools-button
        class="toolbar-button"
        title=${title}
        aria-label=${title}
        .iconName=${navHidden ? 'left-panel-open' : 'left-panel-close'}
        .variant=${Buttons.Button.Variant.TOOLBAR}
        jslog=${VisualLogging.toggleSubpane().track({click: true}).context('navigator')}
        @click=${() => input.onToggleNavigatorSidebar?.()}
      ></devtools-button>`;
    // clang-format on
  };

  const renderDebuggerToggleButton = (): LitTemplate => {
    const debuggerHidden = !input.isDebuggerSidebarOpen;
    const title = debuggerHidden ? i18nString(UIStrings.showDebugger) : i18nString(UIStrings.hideDebugger);
    const glyph = debuggerHidden ? (input.isVertical ? 'right-panel-open' : 'bottom-panel-open') :
                                   (input.isVertical ? 'right-panel-close' : 'bottom-panel-close');
    // clang-format off
    return html`
      <devtools-button
        class="toolbar-button"
        title=${title}
        aria-label=${title}
        .iconName=${glyph}
        .variant=${Buttons.Button.Variant.TOOLBAR}
        ?disabled=${!input.isDebuggerSidebarButtonEnabled}
        jslog=${VisualLogging.toggleSubpane().track({click: true}).context('debugger')}
        @click=${() => input.onToggleDebuggerSidebar?.()}
      ></devtools-button>`;
    // clang-format on
  };

  const leftToolbarItems: LitTemplate[] = !input.isInWrapper ? [renderNavigatorToggleButton()] : [];
  const rightToolbarItems: LitTemplate[] =
      (!input.isInWrapper && !input.isTraceApp && input.isVertical) ? [renderDebuggerToggleButton()] : [];
  const bottomToolbarContent: LitTemplate =
      (!input.isInWrapper && !input.isTraceApp && !input.isVertical) ? renderDebuggerToggleButton() : nothing;

  // clang-format off
  render(html`
    <style>${sourcesViewStyles}</style>
    <devtools-widget class="vbox flex-auto"
      ${widget(UI.SearchableView.SearchableView, {
        searchProvider: input.searchProvider,
        replaceProvider: input.replaceProvider,
        settingName: 'sources-view-search-config',
        minimalSearchQuerySize: 0,
        replaceable: input.isSearchReplaceable,
        searchTarget: input.searchTarget,
      })}
      ${widgetRef(UI.SearchableView.SearchableView, e => {
        output.searchableView = e;
      })}
    >
      <devtools-widget class="vbox flex-auto ${input.breakpointsActive ? '' : 'breakpoints-deactivated'}"
        ${widget(TabbedEditorContainer, {
          // Params are applied in order: set callbacks before `sourceLocation`
          // so the initial selection is reported.
          onEditorSelected: input.onEditorSelected,
          onEditorClosed: input.onEditorClosed,
          leftToolbarItems,
          rightToolbarItems,
          uiSourceCodes: input.uiSourceCodes,
          sourceLocation: input.sourceLocation,
        })}>
      </devtools-widget>
    </devtools-widget>
    <div class="sources-toolbar" jslog=${VisualLogging.toolbar('bottom')}>
      <devtools-toolbar class="script-view-toolbar">
        ${input.scriptViewToolbarItems}
      </devtools-toolbar>
      <devtools-toolbar class="bottom-toolbar">
        ${bottomToolbarContent}
      </devtools-toolbar>
    </div>`, target, {
    container: {
      attributes: {
        id: 'sources-panel-sources-view',
      },
    },
  });
  // clang-format on
};

const SourcesViewBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.VBox,
    );

export class SourcesView extends SourcesViewBase implements UI.SearchableView.Searchable,
                                                            UI.SearchableView.Replaceable {
  #uiSourceCodes = new Set<Workspace.UISourceCode.UISourceCode>();
  #sourceLocation?: SourceLocation;
  #visibleView: UI.Widget.Widget|null = null;
  #currentUISourceCode: Workspace.UISourceCode.UISourceCode|null = null;
  #scriptViewToolbarItems: LitTemplate = nothing;
  #isSearchReplaceable = false;
  #toolbarChangedListener: Common.EventTarget.EventDescriptor|null = null;
  #searchView?: UISourceCodeFrame;
  #searchConfig?: UI.SearchableView.SearchConfig;
  readonly #view: View;

  #onToggleNavigatorSidebar?: () => void;
  #onToggleDebuggerSidebar?: () => void;
  #isNavigatorSidebarOpen = false;
  #isDebuggerSidebarOpen = false;
  #isDebuggerSidebarButtonEnabled = true;
  #isVertical = false;
  #isInWrapper = true;
  #breakpointsActive = true;
  readonly #output: ViewOutput = {};

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {jslog: `${VisualLogging.pane('editor').track({keydown: 'Escape'})}`});
    this.#view = view;
    this.setMinimumAndPreferredSizes(88, 52, 150, 100);

    const workspace = Workspace.Workspace.WorkspaceImpl.instance();

    this.requestUpdate();

    workspace.uiSourceCodes().forEach(ui => this.addUISourceCode(ui));

    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeAdded, this.#uiSourceCodeAdded, this);
    workspace.addEventListener(Workspace.Workspace.Events.UISourceCodeRemoved, this.#uiSourceCodeRemoved, this);
    workspace.addEventListener(Workspace.Workspace.Events.ProjectRemoved, this.#projectRemoved.bind(this), this);
    SDK.TargetManager.TargetManager.instance().addScopeChangeListener(this.#onScopeChange.bind(this));
  }

  override performUpdate(): void {
    const input: ViewInput = {
      searchProvider: this,
      replaceProvider: this,
      isSearchReplaceable: this.#isSearchReplaceable,
      searchTarget: this.#visibleView instanceof UISourceCodeFrame ? this.#visibleView : null,
      scriptViewToolbarItems: this.#scriptViewToolbarItems,
      isNavigatorSidebarOpen: this.#isNavigatorSidebarOpen,
      isDebuggerSidebarOpen: this.#isDebuggerSidebarOpen,
      isDebuggerSidebarButtonEnabled: this.#isDebuggerSidebarButtonEnabled,
      isVertical: this.#isVertical,
      isInWrapper: this.#isInWrapper,
      isTraceApp: Root.Runtime.Runtime.isTraceApp(),
      onToggleNavigatorSidebar: this.#onToggleNavigatorSidebar,
      onToggleDebuggerSidebar: this.#onToggleDebuggerSidebar,
      breakpointsActive: this.#breakpointsActive,
      uiSourceCodes: new Set(this.#uiSourceCodes),
      sourceLocation: this.#sourceLocation,
      onEditorSelected: this.#editorSelected.bind(this),
      onEditorClosed: this.#editorClosed.bind(this),
    };

    this.#view(input, this.#output, this.contentElement);
  }

  set onToggleNavigatorSidebar(callback: () => void) {
    this.#onToggleNavigatorSidebar = callback;
    this.requestUpdate();
  }

  set onToggleDebuggerSidebar(callback: () => void) {
    this.#onToggleDebuggerSidebar = callback;
    this.requestUpdate();
  }

  set isNavigatorSidebarOpen(isOpen: boolean) {
    if (this.#isNavigatorSidebarOpen === isOpen) {
      return;
    }
    this.#isNavigatorSidebarOpen = isOpen;
    this.requestUpdate();
  }

  set isDebuggerSidebarOpen(isOpen: boolean) {
    if (this.#isDebuggerSidebarOpen === isOpen) {
      return;
    }
    this.#isDebuggerSidebarOpen = isOpen;
    this.requestUpdate();
  }

  toggleDebuggerSidebarButtonEnabled(enabled: boolean): void {
    this.#isDebuggerSidebarButtonEnabled = enabled;
    this.requestUpdate();
  }

  setLayoutMode(isVertical: boolean, isInWrapper: boolean): void {
    this.#isVertical = isVertical;
    this.#isInWrapper = isInWrapper;
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

  searchableView(): UI.SearchableView.SearchableView|null {
    return this.#output.searchableView ?? null;
  }

  visibleView(): UI.Widget.Widget|null {
    return this.#visibleView;
  }

  currentSourceFrame(): UISourceCodeFrame|null {
    const view = this.visibleView();
    if (!(view instanceof UISourceCodeFrame)) {
      return null;
    }
    return (view);
  }

  currentUISourceCode(): Workspace.UISourceCode.UISourceCode|null {
    return this.#currentUISourceCode;
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
        this.#removeUISourceCodes([uiSourceCode]);
      }
    }
  }

  #uiSourceCodeAdded(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.addUISourceCode(uiSourceCode);
  }

  // Used by Tests.js and DebuggerTestRunner.js
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
    this.requestUpdate();
  }

  #uiSourceCodeRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.UISourceCode.UISourceCode>): void {
    const uiSourceCode = event.data;
    this.#removeUISourceCodes([uiSourceCode]);
  }

  #removeUISourceCodes(uiSourceCodes: Workspace.UISourceCode.UISourceCode[]): void {
    uiSourceCodes.forEach(ui => this.#uiSourceCodes.delete(ui));
    // Don't keep a removed file alive through the last revealed location.
    if (this.#sourceLocation && uiSourceCodes.includes(this.#sourceLocation.uiSourceCode)) {
      this.#sourceLocation = undefined;
    }
    this.requestUpdate();
  }

  #projectRemoved(event: Common.EventTarget.EventTargetEvent<Workspace.Workspace.Project>): void {
    const project = event.data;
    const uiSourceCodes = project.uiSourceCodes();
    this.#removeUISourceCodes([...uiSourceCodes]);
  }

  #updateScriptViewToolbarItems(): void {
    const view = this.visibleView();
    if (view instanceof UI.View.SimpleView) {
      void view.toolbarItems().then(items => {
        this.#scriptViewToolbarItems = items;
        this.requestUpdate();
      });
    } else {
      this.#scriptViewToolbarItems = nothing;
      this.requestUpdate();
    }
  }

  async showSourceLocation(uiSourceCode: Workspace.UISourceCode.UISourceCode,
                           location?: SourceFrame.SourceFrame.RevealPosition, omitFocus?: boolean,
                           omitHighlight?: boolean): Promise<void> {
    this.#sourceLocation = {uiSourceCode, location, omitFocus, omitHighlight};
    // Render synchronously rather than on the next animation frame, so that the
    // editor is revealed and focused within the current task. Otherwise, input
    // that follows immediately (e.g. typing after committing a new snippet
    // name) goes to the previously focused element.
    this.performUpdate();
    await this.updateComplete;
  }

  #editorClosed(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const wasSelected = this.#currentUISourceCode?.canonicalScriptId() === uiSourceCode.canonicalScriptId();
    if (wasSelected) {
      this.#currentUISourceCode = null;
      this.#visibleView = null;
    }

    // SourcesNavigator does not need to update on EditorClosed.
    this.#removeToolbarChangedListener();
    this.#updateScriptViewToolbarItems();

    const data = {
      uiSourceCode,
      wasSelected,
    };
    this.dispatchEventToListeners(Events.EDITOR_CLOSED, data);
  }

  #editorSelected(event: EditorSelectedEvent): void {
    const currentSourceFrame = event.currentView instanceof UISourceCodeFrame ? event.currentView : null;
    this.#currentUISourceCode = event.currentFile;
    this.#visibleView = event.currentView;

    this.#isSearchReplaceable = Boolean(currentSourceFrame?.canEditSource());
    this.requestUpdate();
    this.#updateToolbarChangedListener();
    this.#updateScriptViewToolbarItems();

    if (this.#currentUISourceCode) {
      this.dispatchEventToListeners(Events.EDITOR_SELECTED, this.#currentUISourceCode);
    }
  }

  #removeToolbarChangedListener(): void {
    if (this.#toolbarChangedListener) {
      Common.EventTarget.removeEventListeners([this.#toolbarChangedListener]);
    }
    this.#toolbarChangedListener = null;
  }

  #updateToolbarChangedListener(): void {
    this.#removeToolbarChangedListener();
    const view = this.visibleView();
    if (view instanceof UISourceCodeFrame) {
      this.#toolbarChangedListener = view.addEventListener(UISourceCodeFrameEvents.TOOLBAR_ITEMS_CHANGED,
                                                           this.#updateScriptViewToolbarItems, this);
    } else if (view instanceof SourceFrame.ImageView.ImageView) {
      this.#toolbarChangedListener = view.addEventListener(SourceFrame.ImageView.Events.TOOLBAR_ITEMS_CHANGED,
                                                           this.#updateScriptViewToolbarItems, this);
    }
  }

  onSearchCanceled(): void {
    if (this.#searchView) {
      this.#searchView.onSearchCanceled();
    }

    this.#searchView = undefined;
    this.#searchConfig = undefined;
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    const sourceFrame = this.currentSourceFrame();
    if (!sourceFrame) {
      return;
    }

    this.#searchView = sourceFrame;
    this.#searchConfig = searchConfig;

    this.#searchView.performSearch(this.#searchConfig, shouldJump, jumpBackwards);
  }

  jumpToNextSearchResult(): void {
    if (!this.#searchView) {
      return;
    }

    if (this.#searchConfig && this.#searchView !== this.currentSourceFrame()) {
      this.performSearch(this.#searchConfig, true);
      return;
    }

    this.#searchView.jumpToNextSearchResult();
  }

  jumpToPreviousSearchResult(): void {
    if (!this.#searchView) {
      return;
    }

    if (this.#searchConfig && this.#searchView !== this.currentSourceFrame()) {
      this.performSearch(this.#searchConfig, true);
      if (this.#searchView) {
        this.#searchView.jumpToLastSearchResult();
      }
      return;
    }

    this.#searchView.jumpToPreviousSearchResult();
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
    if (this.#currentUISourceCode) {
      QuickOpen.QuickOpen.QuickOpenImpl.show(':');
    }
  }

  save(): void {
    this.#saveSourceFrame(this.currentSourceFrame());
  }

  saveAll(): void {
    const sourceFrames = UI.Context.Context.instance().flavor(TabbedEditorContainer)?.fileViews() ?? [];
    sourceFrames.forEach(this.#saveSourceFrame.bind(this));
  }

  #saveSourceFrame(sourceFrame: UI.Widget.Widget|null): void {
    if (!(sourceFrame instanceof UISourceCodeFrame)) {
      return;
    }
    const uiSourceCodeFrame = sourceFrame;
    uiSourceCodeFrame.commitEditing();
  }

  toggleBreakpointsActiveState(active: boolean): void {
    this.#breakpointsActive = active;
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
  // Public for http/tests/devtools/sources/debugger-ui/switch-file.js.
  static nextFile(currentUISourceCode: Workspace.UISourceCode.UISourceCode): Workspace.UISourceCode.UISourceCode|null {
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
    const editorContainer = context.flavor(TabbedEditorContainer);

    switch (actionId) {
      case 'sources.close-all':
        editorContainer?.closeAllFiles();
        return true;
      case 'sources.jump-to-previous-location':
        editorContainer?.rollback();
        return true;
      case 'sources.jump-to-next-location':
        editorContainer?.rollover();
        return true;
      case 'sources.next-editor-tab':
        editorContainer?.selectNextTab();
        return true;
      case 'sources.previous-editor-tab':
        editorContainer?.selectPrevTab();
        return true;
      case 'sources.close-editor-tab':
        return editorContainer?.closeActiveTab() ?? false;
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
